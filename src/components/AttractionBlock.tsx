'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Attraction } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_ICONS, formatTime } from '@/lib/utils';
import { Clock, Circle, CheckCircle2 } from 'lucide-react';

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
  checkMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
}

export default function AttractionBlock({
  attraction,
  height,
  onClick,
  isCompact = false,
  isOverlay = false,
  checkMode = false,
  isChecked = false,
  onToggleCheck,
}: AttractionBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: attraction.id,
  });

  const colors = CATEGORY_COLORS[attraction.category];

  const style = isOverlay
    ? { height: height ?? 'auto' }
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.25 : isChecked ? 0.45 : 1,
        height: height ?? 'auto',
      };

  const isShort = height !== undefined && height < 40;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={[
        'rounded border overflow-hidden select-none transition-shadow flex flex-col w-full',
        'cursor-grab active:cursor-grabbing',
        colors.bg,
        colors.border,
        isDragging ? '' : 'shadow-sm hover:shadow-md',
        isOverlay ? 'shadow-2xl ring-2 ring-blue-400 rotate-1 scale-[1.02]' : '',
        onClick ? 'hover:brightness-95' : '',
      ].join(' ')}
    >
      <div className="px-2 py-1.5 flex flex-col h-full min-h-0 relative">
        {checkMode && !isOverlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCheck?.(); }}
            className={['absolute top-0.5 right-0.5 p-0.5 leading-none rounded-full transition-colors', isChecked ? 'text-green-500' : 'opacity-50 hover:opacity-80 ' + colors.text].join(' ')}
          >
            {isChecked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>
        )}
        <span className={['font-semibold truncate leading-tight', isShort ? 'text-[10px]' : 'text-xs', colors.text].join(' ')}>
          {CATEGORY_ICONS[attraction.category]} {attraction.name}
        </span>

        {!isShort && !isCompact && attraction.start_time && (
          <div className={['flex items-center gap-0.5 mt-0.5 opacity-60', colors.text].join(' ')}>
            <Clock size={9} />
            <span className="text-[10px]">
              {formatTime(attraction.start_time)}
              {attraction.end_time && ` – ${formatTime(attraction.end_time)}`}
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
