'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { LogisticsPin, LogisticsPinCategory } from '@/lib/types';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getPins(): Promise<LogisticsPin[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from('logistics_pins')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as LogisticsPin[];
}

export async function createPin(data: {
  category: LogisticsPinCategory;
  title: string;
  content: string;
}): Promise<LogisticsPin> {
  const { data: row, error } = await getSupabase()
    .from('logistics_pins')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/logistics');
  return row as LogisticsPin;
}

export async function updatePin(
  id: string,
  data: Partial<Pick<LogisticsPin, 'category' | 'title' | 'content'>>
): Promise<void> {
  const { error } = await getSupabase().from('logistics_pins').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/logistics');
}

export async function deletePin(id: string): Promise<void> {
  const { error } = await getSupabase().from('logistics_pins').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/logistics');
}
