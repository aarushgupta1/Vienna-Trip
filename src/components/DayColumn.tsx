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
import AttractionBlock from './AttractionBlock';

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
}

export default function DayColumn({ date, attractions, onAttractionClick, onTimeSlotClick, onAttractionResize, checkMode, checkedIds, onToggleCheck }: DayColumnProps) {
  const timedAttractions = attractions.filter((a) => a.start_time);
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
              {height >= 20 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-4 z-20 cursor-s-resize flex items-end justify-center pb-0.5"
                  onPointerDown={(e) => startResize(e, a)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-8 h-0.5 rounded-full bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
