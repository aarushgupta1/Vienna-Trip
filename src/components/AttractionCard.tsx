'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Attraction } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ICONS, formatTime } from '@/lib/utils';
import { Clock, FileText } from 'lucide-react';

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline opacity-80 hover:opacity-100"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

interface AttractionCardProps {
  attraction: Attraction;
  onClick?: () => void;
  isOverlay?: boolean;
}

export default function AttractionCard({
  attraction,
  onClick,
  isOverlay = false,
}: AttractionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: attraction.id,
  });

  const style = isOverlay
    ? {}
    : { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 };

  const colors = CATEGORY_COLORS[attraction.category];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={[
        'rounded-lg border text-sm select-none transition-shadow',
        'cursor-grab active:cursor-grabbing',
        colors.bg,
        colors.border,
        isDragging ? '' : 'shadow-sm hover:shadow-md',
        isOverlay ? 'shadow-2xl ring-2 ring-blue-400 rotate-1 scale-105' : '',
        onClick ? 'hover:brightness-95' : '',
      ].join(' ')}
    >
      <div className="p-2.5">
        <div className="flex items-start gap-1.5">
          <span className="text-base leading-none mt-px shrink-0">
            {CATEGORY_ICONS[attraction.category]}
          </span>
          <div className="flex-1 min-w-0">
            <div className={['font-semibold truncate text-sm leading-tight', colors.text].join(' ')}>
              {attraction.name}
            </div>

            <span className={['inline-block text-[10px] px-1.5 py-px rounded-full font-medium mt-1 bg-white/60', colors.text].join(' ')}>
              {CATEGORY_LABELS[attraction.category]}
            </span>

            {(attraction.start_time || attraction.end_time) && (
              <div className={['flex items-center gap-1 mt-1 text-[11px] opacity-70', colors.text].join(' ')}>
                <Clock size={10} />
                {attraction.start_time && formatTime(attraction.start_time)}
                {attraction.end_time && ` – ${formatTime(attraction.end_time)}`}
              </div>
            )}

            {attraction.description && (
              <p className={['mt-1 text-[11px] opacity-60 line-clamp-2 leading-tight', colors.text].join(' ')}>
                {linkify(attraction.description)}
              </p>
            )}

            {attraction.notes && !isOverlay && (
              <div className={['flex items-center gap-1 mt-1 text-[10px] opacity-50', colors.text].join(' ')}>
                <FileText size={9} />
                <span className="break-all">{linkify(attraction.notes)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
