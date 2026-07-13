'use client';

import { LogisticsPin } from '@/lib/types';
import { PIN_CATEGORY_META } from '@/lib/utils';
import { Pencil } from 'lucide-react';

export { PIN_CATEGORY_META };

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
