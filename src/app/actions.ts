'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Attraction, Category, DayNote, Hotel, Currency } from '@/lib/types';
import { geocodeAddress, searchLocations as searchLocationsGeo, GeocodeSuggestion } from '@/lib/geocode';
import { MAX_TICKET_FILE_SIZE_BYTES } from '@/lib/ticketLimits';

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
      edited_by: (formData.get('edited_by') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  // The client already blocks oversized files before submit; skipping (rather
  // than throwing) here is just a defensive backstop so one bad file can't
  // fail the whole submission if that check is ever bypassed.
  const tickets = formData
    .getAll('tickets')
    .filter((f): f is File => f instanceof File && f.size > 0 && f.size <= MAX_TICKET_FILE_SIZE_BYTES);
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

export async function createAttractionObject(
  data: {
    name: string;
    description: string | null;
    category: Category;
    scheduled_date: string | null;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    location: string | null;
  },
  editedBy?: string | null
): Promise<Attraction> {
  const geo = data.location ? await geocodeAddress(data.location) : null;

  const { data: row, error } = await getSupabase()
    .from('attractions')
    .insert({
      ...data,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      edited_by: editedBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/');
  return row as Attraction;
}

export async function scheduleAttraction(id: string, scheduledDate: string | null): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('attractions')
    .update({ scheduled_date: scheduledDate })
    .eq('id', id);

  if (error) throw new Error(error.message);
  // The day changed — clear any pending "reminder already sent" record so a
  // rescheduled event gets a fresh 30-minutes-prior notification for its new
  // slot instead of silently staying marked as already reminded.
  await supabase.from('event_reminders_sent').delete().eq('attraction_id', id);
  revalidatePath('/');
}

export async function updateAttraction(
  id: string,
  data: Partial<Pick<Attraction, 'name' | 'description' | 'category' | 'scheduled_date' | 'start_time' | 'end_time' | 'notes' | 'location'>>,
  editedBy?: string | null
): Promise<void> {
  // Callers only pass `location` when it actually changed, so re-geocoding
  // here doesn't fire on every unrelated edit (e.g. just moving the time).
  const patch: Record<string, unknown> = { ...data, edited_by: editedBy ?? null, updated_at: new Date().toISOString() };
  if ('location' in patch) {
    const location = (patch.location as string | null) || null;
    const geo = location ? await geocodeAddress(location) : null;
    patch.location = location;
    patch.lat = geo?.lat ?? null;
    patch.lng = geo?.lng ?? null;
  }

  const supabase = getSupabase();

  // Some callers (e.g. the edit form) always resend scheduled_date/start_time
  // even when the user didn't touch them, so only clear the "already
  // reminded" record if the day or start time is genuinely changing —
  // otherwise every unrelated edit (description, notes, category…) would
  // reset it and risk a duplicate notification.
  if ('scheduled_date' in patch || 'start_time' in patch) {
    const { data: current } = await supabase
      .from('attractions')
      .select('scheduled_date, start_time')
      .eq('id', id)
      .single();
    const dateChanged = 'scheduled_date' in patch && patch.scheduled_date !== current?.scheduled_date;
    const timeChanged = 'start_time' in patch && patch.start_time !== current?.start_time;
    if (dateChanged || timeChanged) {
      await supabase.from('event_reminders_sent').delete().eq('attraction_id', id);
    }
  }

  const { error } = await supabase.from('attractions').update(patch).eq('id', id);
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

export async function upsertDayNote(date: string, note: string, editedBy?: string | null): Promise<void> {
  const supabase = getSupabase();

  // Empty notes are deleted rather than stored, so the table doesn't fill
  // up with blank rows for every day that's ever had its note cleared.
  if (note.trim() === '') {
    const { error } = await supabase.from('day_notes').delete().eq('date', date);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('day_notes')
      .upsert({ date, note, edited_by: editedBy ?? null, updated_at: new Date().toISOString() }, { onConflict: 'date' });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/');
}

export async function getHotels(): Promise<Hotel[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from('hotels')
    .select('*')
    .order('check_in', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Hotel[];
}

export async function createHotel(
  data: {
    name: string;
    location: string | null;
    check_in: string | null;
    check_out: string | null;
    price: number | null;
    currency: Currency;
    confirmation_number: string | null;
    notes: string | null;
  },
  editedBy?: string | null
): Promise<Hotel> {
  const geo = data.location ? await geocodeAddress(data.location) : null;

  const { data: row, error } = await getSupabase()
    .from('hotels')
    .insert({
      ...data,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      edited_by: editedBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/');
  return row as Hotel;
}

export async function updateHotel(
  id: string,
  data: Partial<Pick<Hotel, 'name' | 'location' | 'check_in' | 'check_out' | 'price' | 'currency' | 'confirmation_number' | 'notes'>>,
  editedBy?: string | null
): Promise<void> {
  // Only re-geocode when the location actually changed, same reasoning as
  // updateAttraction — callers only pass `location` when it's different.
  const patch: Record<string, unknown> = { ...data, edited_by: editedBy ?? null, updated_at: new Date().toISOString() };
  if ('location' in patch) {
    const location = (patch.location as string | null) || null;
    const geo = location ? await geocodeAddress(location) : null;
    patch.location = location;
    patch.lat = geo?.lat ?? null;
    patch.lng = geo?.lng ?? null;
  }

  const { error } = await getSupabase().from('hotels').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function deleteHotel(id: string): Promise<void> {
  const { error } = await getSupabase().from('hotels').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

// Registers (or re-registers) this device's push subscription so
// /api/send-event-reminders can wake it with a "starts in 30 min"
// notification. Upserted by endpoint since re-subscribing on the same device
// yields the same endpoint most of the time.
export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  const { error } = await getSupabase()
    .from('push_subscriptions')
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: 'endpoint' }
    );
  if (error) throw new Error(error.message);
}
