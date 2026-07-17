'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Attraction, Category, DayNote } from '@/lib/types';
import { geocodeAddress, searchLocations as searchLocationsGeo, GeocodeSuggestion } from '@/lib/geocode';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getAttractions(): Promise<Attraction[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from('attractions')
    .select('*')
    .order('start_time', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Attraction[];
}

export async function createAttraction(formData: FormData): Promise<void> {
  const location = (formData.get('location') as string) || null;
  const geo = location ? await geocodeAddress(location) : null;
  const supabase = getSupabase();

  const { data: row, error } = await supabase
    .from('attractions')
    .insert({
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      category: (formData.get('category') as Category) || 'other',
      notes: (formData.get('notes') as string) || null,
      start_time: (formData.get('start_time') as string) || null,
      end_time: (formData.get('end_time') as string) || null,
      scheduled_date: (formData.get('scheduled_date') as string) || null,
      location,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  const tickets = formData.getAll('tickets').filter((f): f is File => f instanceof File && f.size > 0);
  if (tickets.length > 0) {
    const ticketUrls = await Promise.all(
      tickets.map(async (file) => {
        const path = `${row.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('tickets').upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        return supabase.storage.from('tickets').getPublicUrl(path).data.publicUrl;
      })
    );
    const { error: ticketsError } = await supabase
      .from('attractions')
      .update({ ticket_urls: ticketUrls })
      .eq('id', row.id);
    if (ticketsError) throw new Error(ticketsError.message);
  }

  revalidatePath('/');
}

export async function createAttractionObject(data: {
  name: string;
  description: string | null;
  category: Category;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  location: string | null;
}): Promise<Attraction> {
  const geo = data.location ? await geocodeAddress(data.location) : null;

  const { data: row, error } = await getSupabase()
    .from('attractions')
    .insert({ ...data, lat: geo?.lat ?? null, lng: geo?.lng ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/');
  return row as Attraction;
}

export async function scheduleAttraction(id: string, scheduledDate: string | null): Promise<void> {
  const { error } = await getSupabase()
    .from('attractions')
    .update({ scheduled_date: scheduledDate })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function updateAttraction(
  id: string,
  data: Partial<Pick<Attraction, 'name' | 'description' | 'category' | 'scheduled_date' | 'start_time' | 'end_time' | 'notes' | 'location' | 'is_checked'>>
): Promise<void> {
  // Callers only pass `location` when it actually changed, so re-geocoding
  // here doesn't fire on every unrelated edit (e.g. just moving the time).
  const patch: Record<string, unknown> = { ...data };
  if ('location' in patch) {
    const location = (patch.location as string | null) || null;
    const geo = location ? await geocodeAddress(location) : null;
    patch.location = location;
    patch.lat = geo?.lat ?? null;
    patch.lng = geo?.lng ?? null;
  }

  const { error } = await getSupabase().from('attractions').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function searchLocations(query: string): Promise<GeocodeSuggestion[]> {
  return searchLocationsGeo(query);
}

export async function deleteAttraction(id: string): Promise<void> {
  const { error } = await getSupabase().from('attractions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function addTicketUrl(id: string, url: string): Promise<void> {
  const supabase = getSupabase();
  const { data: row, error: fetchError } = await supabase
    .from('attractions')
    .select('ticket_urls')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const ticketUrls = [...((row?.ticket_urls as string[] | null) ?? []), url];
  const { error } = await supabase.from('attractions').update({ ticket_urls: ticketUrls }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function removeTicketUrl(id: string, url: string): Promise<void> {
  const supabase = getSupabase();
  const { data: row, error: fetchError } = await supabase
    .from('attractions')
    .select('ticket_urls')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const ticketUrls = ((row?.ticket_urls as string[] | null) ?? []).filter((u) => u !== url);
  const { error } = await supabase.from('attractions').update({ ticket_urls: ticketUrls }).eq('id', id);
  if (error) throw new Error(error.message);

  // Best-effort: also remove the underlying file from storage.
  const marker = '/storage/v1/object/public/tickets/';
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const path = url.slice(idx + marker.length);
    await supabase.storage.from('tickets').remove([path]);
  }

  revalidatePath('/');
}

export async function getDayNotes(): Promise<Record<string, string>> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {};
  }

  const { data, error } = await getSupabase().from('day_notes').select('date, note');
  if (error) return {};
  return Object.fromEntries(((data ?? []) as DayNote[]).map((row) => [row.date, row.note]));
}

export async function upsertDayNote(date: string, note: string): Promise<void> {
  const supabase = getSupabase();

  // Empty notes are deleted rather than stored, so the table doesn't fill
  // up with blank rows for every day that's ever had its note cleared.
  if (note.trim() === '') {
    const { error } = await supabase.from('day_notes').delete().eq('date', date);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('day_notes').upsert({ date, note }, { onConflict: 'date' });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/');
}
