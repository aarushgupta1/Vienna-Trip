'use client';

import { useEffect, useState } from 'react';
import { LogisticsPin, LogisticsPinCategory } from '@/lib/types';
import { LOGISTICS_CATEGORY_ORDER as CATEGORY_ORDER } from '@/lib/utils';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { getSupabaseClient } from '@/lib/supabase';
import PinCard, { PIN_CATEGORY_META } from './PinCard';
import PinModal from './PinModal';
import { Plus } from 'lucide-react';

interface PinboardClientProps {
  initialPins: LogisticsPin[];
}

export default function PinboardClient({ initialPins }: PinboardClientProps) {
  const [pins, setPins] = useState<LogisticsPin[]>(initialPins);
  const [modalState, setModalState] = useState<
    | { mode: 'add' }
    | { mode: 'edit'; pin: LogisticsPin }
    | null
  >(null);
  const [activeFilter, setActiveFilter] = useState<LogisticsPinCategory | null>(null);
  const isOnline = useOnlineStatus();

  // Realtime: sync pins added/edited/deleted by other family members
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel('logistics-pins-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logistics_pins' }, (payload: any) => {
        const row = payload.new as LogisticsPin;
        setPins((prev) => prev.find((p) => p.id === row.id) ? prev : [...prev, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'logistics_pins' }, (payload: any) => {
        const row = payload.new as LogisticsPin;
        setPins((prev) => prev.map((p) => p.id === row.id ? row : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'logistics_pins' }, (payload: any) => {
        const id = (payload.old as { id: string }).id;
        setPins((prev) => prev.filter((p) => p.id !== id));
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, []);

  const filteredPins = activeFilter ? pins.filter((p) => p.category === activeFilter) : pins;

  const categoriesPresent = CATEGORY_ORDER.filter((c) => pins.some((p) => p.category === c));

  const handleSaved = (saved: LogisticsPin) => {
    setPins((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  };

  const handleDeleted = (id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveFilter(null)}
          className={[
            'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            activeFilter === null
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
          ].join(' ')}
        >
          All
        </button>
        {categoriesPresent.map((cat) => {
          const meta = PIN_CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                activeFilter === cat
                  ? `${meta.bg} ${meta.text} ring-1 ${meta.border}`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
              ].join(' ')}
            >
              <span>{meta.icon}</span>
              {meta.label}
            </button>
          );
        })}
        <button
          onClick={() => setModalState({ mode: 'add' })}
          disabled={!isOnline}
          title={isOnline ? undefined : "Unavailable while offline"}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0"
        >
          <Plus size={13} />
          Add Pin
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {filteredPins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-400 dark:text-gray-500">
            <span className="text-4xl">📌</span>
            <p className="text-sm font-medium">No pins yet</p>
            <p className="text-xs max-w-xs">
              Pin flight numbers, hotel addresses, transport info, and anything else you&apos;ll need on the trip.
            </p>
            <button
              onClick={() => setModalState({ mode: 'add' })}
              disabled={!isOnline}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Add your first pin
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {filteredPins.map((pin) => (
              <div key={pin.id} className="break-inside-avoid mb-4">
                <PinCard
                  pin={pin}
                  onEdit={() => setModalState({ mode: 'edit', pin })}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalState && (
        <PinModal
          pin={modalState.mode === 'edit' ? modalState.pin : undefined}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
