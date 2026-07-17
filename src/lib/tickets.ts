import { getSupabaseClient } from './supabase';
import { addTicketUrl } from '@/app/actions';
import { MAX_TICKET_FILE_SIZE_BYTES, MAX_TICKET_FILE_SIZE_LABEL } from './ticketLimits';

export const TICKET_IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|heic|heif)$/i;

export function ticketFilename(url: string): string {
  const last = url.split('/').pop() ?? 'Ticket';
  const withoutTimestampPrefix = last.replace(/^\d+-/, '');
  try {
    return decodeURIComponent(withoutTimestampPrefix);
  } catch {
    return withoutTimestampPrefix;
  }
}

// Uploads a file to the "tickets" storage bucket under the given attraction
// and records the resulting public URL on that attraction's row.
export async function uploadTicketFile(attractionId: string, file: File): Promise<string> {
  if (file.size > MAX_TICKET_FILE_SIZE_BYTES) {
    throw new Error(`"${file.name}" is over the ${MAX_TICKET_FILE_SIZE_LABEL} limit.`);
  }

  const client = getSupabaseClient();
  if (!client) throw new Error("Storage isn't configured.");

  const path = `${attractionId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await client.storage.from('tickets').upload(path, file);
  if (uploadError) throw uploadError;

  const { data } = client.storage.from('tickets').getPublicUrl(path);
  await addTicketUrl(attractionId, data.publicUrl);
  return data.publicUrl;
}
