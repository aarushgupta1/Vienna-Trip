'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { Attraction, Category } from '@/lib/types';

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
  const { error } = await getSupabase().from('attractions').insert({
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as Category) || 'other',
    notes: (formData.get('notes') as string) || null,
    start_time: (formData.get('start_time') as string) || null,
    end_time: (formData.get('end_time') as string) || null,
    scheduled_date: (formData.get('scheduled_date') as string) || null,
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
}): Promise<Attraction> {
  const { data: row, error } = await getSupabase()
    .from('attractions')
    .insert(data)
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
  data: Partial<Pick<Attraction, 'name' | 'description' | 'category' | 'scheduled_date' | 'start_time' | 'end_time' | 'notes'>>
): Promise<void> {
  const { error } = await getSupabase().from('attractions').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function deleteAttraction(id: string): Promise<void> {
  const { error } = await getSupabase().from('attractions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}
