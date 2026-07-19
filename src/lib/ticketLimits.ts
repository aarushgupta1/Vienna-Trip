// Shared cap on individual ticket file uploads (images/PDFs). Enforced
// client-side for immediate feedback (CreateModal, EditModal) and again
// server-side (actions.ts, tickets.ts) as a defensive backstop, so a single
// large file can't silently eat into Supabase Storage's quota.
export const MAX_TICKET_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_TICKET_FILE_SIZE_LABEL = '10MB';

export function isTicketFileTooLarge(file: File): boolean {
  return file.size > MAX_TICKET_FILE_SIZE_BYTES;
}
