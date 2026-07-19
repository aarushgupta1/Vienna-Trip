// A self-chosen display name, stored per-device in localStorage — not real
// auth (there's no login anywhere in this app), just a label sent along with
// each write so "last edited by ___" has something to show. Nothing here is
// verified; anyone can type anything.
const STORAGE_KEY = 'vienna-editor-name';

export function getEditorName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function setEditorName(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort — if storage is unavailable, edits just go through unattributed.
  }
}
