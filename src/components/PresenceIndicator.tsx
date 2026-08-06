'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { getEditorName } from '@/lib/editorName';
import { Users } from 'lucide-react';

const CHANNEL_NAME = 'presence-viewers';

interface PresenceEntry {
  name: string;
}

// Shows who else currently has the app open, using Supabase Realtime's
// Presence feature — each browser tab/device tracks itself on a shared
// channel with whatever editor name is set (see editorName.ts), and every
// client sees everyone else's presence update live, no polling needed.
// Multiple tabs/devices from the same person show up as separate
// connections under the hood, but are deduped by name here since "who's
// here" means people, not tabs.
export default function PresenceIndicator() {
  const [names, setNames] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client.channel(CHANNEL_NAME, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    const sync = () => {
      const state = channel.presenceState<PresenceEntry>();
      const allNames = Object.values(state).flatMap((entries) => entries.map((e) => e.name));
      setNames([...new Set(allNames)]);
    };

    const announce = () => {
      channel.track({ name: getEditorName() ?? 'Someone', online_at: new Date().toISOString() });
    };

    channel.on('presence', { event: 'sync' }, sync);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') announce();
    });

    // Re-announce if this tab's editor name changes mid-session (see the
    // dispatch in editorName.ts), so the list updates without a reload.
    window.addEventListener('editor-name-changed', announce);

    return () => {
      window.removeEventListener('editor-name-changed', announce);
      client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Nothing to show until this tab's own presence sync has come back at
  // least once — briefly empty on mount, same as other "wait for the client
  // to actually connect" states elsewhere in this app.
  if (names.length === 0) return null;

  const soloName = getEditorName() ?? 'Someone';
  const isAlone = names.length === 1 && names[0] === soloName;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={isAlone ? "You're the only one online right now" : `${names.length} online: ${names.join(', ')}`}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Users size={12} />
        {names.length}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[150px] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 px-1">
          {isAlone ? (
            <p className="px-2.5 py-1 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">Just you right now</p>
          ) : (
            names.map((n) => (
              <div key={n} className="flex items-center gap-2 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {n}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
