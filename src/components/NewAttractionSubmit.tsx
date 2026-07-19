'use client';

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { getEditorName } from '@/lib/editorName';
import { WifiOff } from 'lucide-react';

export function OfflineFormBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
      <WifiOff size={13} className="shrink-0" />
      You&apos;re offline — this can&apos;t be submitted until you&apos;re back online.
    </div>
  );
}

// Plain server-action forms have no client state to read localStorage from
// at submit time, so this stashes the device's editor name into a hidden
// field once on mount instead.
export function EditedByField() {
  const [name, setName] = useState('');
  useEffect(() => {
    setName(getEditorName() ?? '');
  }, []);
  return <input type="hidden" name="edited_by" value={name} readOnly />;
}

export function NewAttractionSubmitButton() {
  const isOnline = useOnlineStatus();
  return (
    <button
      type="submit"
      disabled={!isOnline}
      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
    >
      Add to Trip ✈️
    </button>
  );
}
