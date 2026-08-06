'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Attraction } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_ICONS, formatTimeInZone, CalendarTimezone } from '@/lib/utils';
import { Clock } from 'lucide-react';

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

interface AttractionBlockProps {
  attraction: Attraction;
  height?: number;
  onClick?: () => void;
  isCompact?: boolean;
  isOverlay?: boolean;
  readOnly?: boolean;
  // Independent zones for the start and end time labels — a flight's
  // departure and arrival are naturally in two different zones, so these
  // aren't tied together the way a single "timezone" prop would imply.
  // Every other category just passes 'vienna' for both.
  startTimezone?: CalendarTimezone;
  endTimezone?: CalendarTimezone;
}

export default function AttractionBlock({
  attraction,
  height,
  onClick,
  isCompact = false,
  isOverlay = false,
  readOnly = false,
  startTimezone = 'vienna',
  endTimezone = 'vienna',
}: AttractionBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: attraction.id,
    disabled: readOnly,
  });

  const colors = CATEGORY_COLORS[attraction.category];

  const style = isOverlay
    ? { height: height ?? 'auto' }
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.25 : 1,
        height: height ?? 'auto',
      };

  const isShort = height !== undefined && height < 40;
  const isTiny = height !== undefined && height < 24;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={[
        'rounded border overflow-hidden select-none touch-manipulation transition-shadow flex flex-col w-full',
        readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        colors.bg,
        colors.border,
        isDragging ? '' : 'shadow-sm hover:shadow-md',
        isOverlay ? 'shadow-2xl ring-2 ring-blue-400 rotate-1 scale-[1.02]' : '',
        onClick ? 'hover:brightness-95' : '',
      ].join(' ')}
    >
      <div className={['flex flex-col h-full min-h-0 relative', isTiny ? 'px-1.5 py-0.5' : 'px-2 py-1.5'].join(' ')}>
        <span className={['font-semibold truncate leading-tight', isShort ? 'text-[10px]' : 'text-xs', colors.text].join(' ')}>
          {CATEGORY_ICONS[attraction.category]} {attraction.name}
        </span>

        {!isShort && !isCompact && attraction.start_time && (
          <div className={['flex items-center gap-0.5 mt-0.5 opacity-60', colors.text].join(' ')}>
            <Clock size={9} />
            <span className="text-[10px]">
              {formatTimeInZone(attraction.start_time, startTimezone)}
              {attraction.end_time && ` – ${formatTimeInZone(attraction.end_time, endTimezone)}`}
            </span>
          </div>
        )}

        {!isShort && !isCompact && height !== undefined && height > 72 && attraction.description && (
          <p className={['mt-0.5 text-[10px] opacity-50 line-clamp-2 leading-tight', colors.text].join(' ')}>
            {linkify(attraction.description)}
          </p>
        )}
      </div>
    </div>
  );
}
