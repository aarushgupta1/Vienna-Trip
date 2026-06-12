'use client';

import { useDroppable } from '@dnd-kit/core';
import { Attraction } from '@/lib/types';
import {
  PIXELS_PER_HOUR,
  PIXELS_PER_MINUTE,
  GRID_START_HOUR,
  GRID_END_HOUR,
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
      className={['absolute w-full border-b border-dashed border-gray-100 transition-colors', isOver ? 'bg-blue-100' : ''].join(' ')}
      style={{ top, height: PIXELS_PER_HOUR / 2 }}
    />
  );
}

interface DayColumnProps {
  date: string;
  attractions: Attraction[];
  onAttractionClick: (a: Attraction) => void;
  onTimeSlotClick: (date: string, time: string) => void;
  checkMode: boolean;
  checkedIds: Set<string>;
  onToggleCheck: (id: string) => void;
}

export default function DayColumn({ date, attractions, onAttractionClick, onTimeSlotClick, checkMode, checkedIds, onToggleCheck }: DayColumnProps) {
  const timedAttractions = attractions.filter((a) => a.start_time);
  const timeSlots = generateTimeSlots(date);
  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * PIXELS_PER_HOUR;

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinutes = GRID_START_HOUR * 60 + y / PIXELS_PER_MINUTE;
    const snapped = Math.round(rawMinutes / 30) * 30;
    const clamped = Math.max(GRID_START_HOUR * 60, Math.min(snapped, (GRID_END_HOUR - 1) * 60));
    onTimeSlotClick(date, minutesToTime(clamped));
  };

  return (
    <div className="flex flex-col border-r border-gray-200 bg-white flex-1 min-w-0" style={{ height: gridHeight }}>
      <div className="relative flex-shrink-0 cursor-pointer" style={{ height: gridHeight }} onClick={handleGridClick}>
        {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) =>
          i === 0 ? null : (
            <div key={i} className="absolute w-full border-t border-gray-200 pointer-events-none" style={{ top: i * PIXELS_PER_HOUR }} />
          )
        )}

        {timeSlots.map(({ id, top }) => (
          <TimeSlot key={id} id={id} top={top} />
        ))}

        {timedAttractions.map((a) => {
          const top = getEventTop(a.start_time!);
          const height = getEventHeight(a.start_time!, a.end_time);
          return (
            <div key={a.id} className="absolute left-0.5 right-0.5 z-10" style={{ top, height }}>
              <AttractionBlock
                attraction={a}
                height={height}
                onClick={() => onAttractionClick(a)}
                checkMode={checkMode}
                isChecked={checkedIds.has(a.id)}
                onToggleCheck={() => onToggleCheck(a.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
