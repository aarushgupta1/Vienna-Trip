'use client';

import { LogisticsPin, LogisticsPinCategory } from '@/lib/types';
import { Pencil } from 'lucide-react';

export const PIN_CATEGORY_META: Record<
  LogisticsPinCategory,
  { label: string; icon: string; bg: string; text: string; border: string; badge: string }
> = {
  flights: {
    label: 'Flights',
    icon: '✈️',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
  },
  accommodation: {
    label: 'Hotels',
    icon: '🏨',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
  },
  transport: {
    label: 'Transport',
    icon: '🚆',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  documents: {
    label: 'Documents',
    icon: '📄',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  contacts: {
    label: 'Contacts',
    icon: '📞',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
  },
  budget: {
    label: 'Budget',
    icon: '💰',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
  },
  other: {
    label: 'Other',
    icon: '📌',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
  },
};

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline opacity-80 hover:opacity-100 break-all"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

interface PinCardProps {
  pin: LogisticsPin;
  onEdit: () => void;
}

export default function PinCard({ pin, onEdit }: PinCardProps) {
  const meta = PIN_CATEGORY_META[pin.category];

  return (
    <div
      className={[
        'rounded-xl border shadow-sm group relative transition-shadow hover:shadow-md',
        meta.bg,
        meta.border,
      ].join(' ')}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-xl leading-none mt-0.5 shrink-0">{meta.icon}</span>
            <div className="min-w-0">
              <span
                className={[
                  'inline-block text-[10px] px-1.5 py-px rounded-full font-semibold mb-1',
                  meta.badge,
                ].join(' ')}
              >
                {meta.label}
              </span>
              <h3 className={['font-semibold text-sm leading-snug', meta.text].join(' ')}>
                {pin.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-black/5"
            aria-label="Edit pin"
          >
            <Pencil size={13} className={meta.text} />
          </button>
        </div>

        {pin.content && (
          <p
            className={[
              'mt-2 text-xs leading-relaxed whitespace-pre-wrap opacity-80',
              meta.text,
            ].join(' ')}
          >
            {linkify(pin.content)}
          </p>
        )}
      </div>
    </div>
  );
}
