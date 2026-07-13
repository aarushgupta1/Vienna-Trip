'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Attraction, Category } from '@/lib/types';
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

  const { error } = await getSupabase().from('attractions').insert({
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
  });

  if (error) throw new Error(error.message);
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
  data: Partial<Pick<Attraction, 'name' | 'description' | 'category' | 'scheduled_date' | 'start_time' | 'end_time' | 'notes' | 'location'>>
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
