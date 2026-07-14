'use client';

import { useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Attraction } from '@/lib/types';
import {
  PIXELS_PER_HOUR,
  PIXELS_PER_MINUTE,
  GRID_START_HOUR,
  GRID_END_HOUR,
  DEFAULT_DURATION_MINUTES,
  generateTimeSlots,
  getEventTop,
  getEventHeight,
  timeToMinutes,
  minutesToTime,
} from '@/lib/timeUtils';
import { TravelSegment, TravelMode, segmentMinutes, formatDistance, isEstimatedMode } from '@/lib/travel';
import AttractionBlock from './AttractionBlock';

const TRAVEL_MODE_ICON: Record<TravelMode, string> = {
  walk: '🚶',
  bus: '🚌',
  drive: '🚗',
  train: '🚆',
};

const MIN_GAP_PX = 24; // below this the gap is too tight to fit a badge without overlapping events

function TravelBadge({ top, height, segment, mode }: { top: number; height: number; segment: TravelSegment; mode: TravelMode }) {
  const minutes = segmentMinutes(segment, mode);
  const estimated = isEstimatedMode(mode);
  return (
    <div
      className="absolute left-1 right-1 pointer-events-none z-0"
      style={{ top, height }}
      title={estimated ? 'Estimated from typical travel speeds' : 'Estimated driving time (real route)'}
    >
      {/* connector line running from the event above to the event below, so the
          badge reads as sitting "on the path between them" rather than floating */}
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-gray-300 dark:border-gray-600" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[9px] font-medium whitespace-nowrap shadow-sm">
        <span>{TRAVEL_MODE_ICON[mode]}</span>
        <span>{formatDistance(segment.distanceMeters)}</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>{estimated && '~'}{minutes != null ? `${minutes} min` : '—'}</span>
      </div>
    </div>
  );
}

function TimeSlot({ id, top }: { id: string; top: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={['absolute w-full border-b border-dashed border-gray-100 dark:border-gray-800 transition-colors', isOver ? 'bg-blue-100 dark:bg-blue-900/40' : ''].join(' ')}
      style={{ top, height: PIXELS_PER_HOUR / 2 }}
    />
  );
}

interface DayColumnProps {
  date: string;
  attractions: Attraction[];
  onAttractionClick: (a: Attraction) => void;
  onTimeSlotClick: (date: string, time: string) => void;
  onAttractionResize: (id: string, newEndTime: string) => void;
  checkMode: boolean;
  checkedIds: Set<string>;
  onToggleCheck: (id: string) => void;
  travelSegments: Record<string, TravelSegment>;
  travelMode: TravelMode;
}

export default function DayColumn({ date, attractions, onAttractionClick, onTimeSlotClick, onAttractionResize, checkMode, checkedIds, onToggleCheck, travelSegments, travelMode }: DayColumnProps) {
  const timedAttractions = attractions
    .filter((a) => a.start_time)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!));
  const timeSlots = generateTimeSlots(date);
  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * PIXELS_PER_HOUR;
  const [localHeights, setLocalHeights] = useState<Record<string, number>>({});

  // Always keep a current ref so window listeners aren't affected by stale closures
  const onAttractionResizeRef = useRef(onAttractionResize);
  onAttractionResizeRef.current = onAttractionResize;

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinutes = GRID_START_HOUR * 60 + y / PIXELS_PER_MINUTE;
    const snapped = Math.round(rawMinutes / 30) * 30;
    const clamped = Math.max(GRID_START_HOUR * 60, Math.min(snapped, (GRID_END_HOUR - 1) * 60));
    onTimeSlotClick(date, minutesToTime(clamped));
  };

  const startResize = (e: React.PointerEvent, a: Attraction) => {
    e.stopPropagation();
    e.preventDefault();

    const startY = e.clientY;
    const startMinutes = timeToMinutes(a.start_time!);
    const origEndMinutes = a.end_time
      ? timeToMinutes(a.end_time)
      : startMinutes + DEFAULT_DURATION_MINUTES;

    const snap = (clientY: number) => {
      const raw = origEndMinutes + (clientY - startY) / PIXELS_PER_MINUTE;
      const snapped = Math.round(raw / 15) * 15;
      return Math.max(startMinutes + 15, Math.min(snapped, GRID_END_HOUR * 60));
    };

    const onMove = (ev: PointerEvent) => {
      const endMin = snap(ev.clientY);
      setLocalHeights((prev) => ({ ...prev, [a.id]: (endMin - startMinutes) * PIXELS_PER_MINUTE }));
    };

    const onUp = (ev: PointerEvent) => {
      const endMin = snap(ev.clientY);
      onAttractionResizeRef.current(a.id, minutesToTime(endMin));
      setLocalHeights((prev) => { const n = { ...prev }; delete n[a.id]; return n; });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1 min-w-0" style={{ height: gridHeight }}>
      <div className="relative flex-shrink-0 cursor-pointer" style={{ height: gridHeight }} onClick={handleGridClick}>
        {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) =>
          i === 0 ? null : (
            <div key={i} className="absolute w-full border-t border-gray-200 dark:border-gray-800 pointer-events-none" style={{ top: i * PIXELS_PER_HOUR }} />
          )
        )}

        {timeSlots.map(({ id, top }) => (
          <TimeSlot key={id} id={id} top={top} />
        ))}

        {timedAttractions.map((a) => {
          const top = getEventTop(a.start_time!);
          const height = localHeights[a.id] ?? getEventHeight(a.start_time!, a.end_time);
          return (
            <div key={a.id} className="group absolute left-0.5 right-0.5 z-10" style={{ top, height }}>
              <AttractionBlock
                attraction={a}
                height={height}
                onClick={() => onAttractionClick(a)}
                checkMode={checkMode}
                isChecked={checkedIds.has(a.id)}
                onToggleCheck={() => onToggleCheck(a.id)}
              />
              <div
                className="absolute bottom-0 left-0 right-0 z-20 cursor-s-resize flex items-end justify-center pb-0.5"
                style={{ height: Math.max(6, Math.min(16, height * 0.4)) }}
                onPointerDown={(e) => startResize(e, a)}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-8 h-0.5 rounded-full bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}

        {timedAttractions.slice(0, -1).map((a, i) => {
          const b = timedAttractions[i + 1];
          const segment = travelSegments[`${a.id}->${b.id}`];
          if (!segment) return null;

          const aHeight = localHeights[a.id] ?? getEventHeight(a.start_time!, a.end_time);
          const prevBottom = getEventTop(a.start_time!) + aHeight;
          const nextTop = getEventTop(b.start_time!);
          const gap = nextTop - prevBottom;
          if (gap < MIN_GAP_PX) return null;

          return <TravelBadge key={`${a.id}-${b.id}`} top={prevBottom} height={gap} segment={segment} mode={travelMode} />;
        })}
      </div>
    </div>
  );
}
