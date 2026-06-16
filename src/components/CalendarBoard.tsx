'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { useState, useTransition, useEffect, useRef } from 'react';
import { Attraction } from '@/lib/types';
import { generateTripDates, formatDate } from '@/lib/utils';
import {
  DAYS_PER_PAGE,
  getDuration,
  getEventHeight,
  timeToMinutes,
  minutesToTime,
  DEFAULT_DURATION_MINUTES,
  findTimeConflict,
} from '@/lib/timeUtils';
import { getSupabaseClient } from '@/lib/supabase';
import { updateAttraction } from '@/app/actions';
import DayColumn from './DayColumn';
import UnscheduledSidebar from './UnscheduledSidebar';
import AttractionBlock from './AttractionBlock';
import EditModal from './EditModal';
import CreateModal from './CreateModal';
import TimeLabels from './TimeLabels';
import { ChevronLeft, ChevronRight, Pencil, PanelLeftOpen } from 'lucide-react';

function DayHeader({
  date, count, note, onNoteChange,
}: {
  date: string; count: number; note: string; onNoteChange: (v: string) => void;
}) {
  const { weekday, monthDay } = formatDate(date);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex-1 border-l border-gray-100 first:border-l-0 flex flex-col">
      <div className="text-center pt-2 pb-1 px-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{weekday}</div>
        <div className="text-sm font-bold leading-snug text-gray-800">{monthDay}</div>
        {count > 0 && (
          <div className="text-[9px] text-gray-400 mt-0.5">
            {count} event{count !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      <div className="px-1.5 pb-1.5">
        {editing ? (
          <textarea
            autoFocus
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            onBlur={() => setEditing(false)}
            rows={2}
            placeholder="Notes for this day…"
            className="w-full text-[9px] text-gray-600 bg-white border border-blue-200 rounded px-1.5 py-1 outline-none resize-none leading-tight placeholder-gray-300 shadow-sm"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="group w-full text-left text-[9px] leading-tight rounded px-1.5 py-0.5 hover:bg-gray-100 transition-colors"
          >
            {note && (
              <span className="text-gray-500 whitespace-pre-wrap block mb-0.5">{note}</span>
            )}
            <span className="flex items-center gap-1 text-gray-300 italic group-hover:text-gray-400 transition-colors">
              <Pencil size={8} />
              + day notes
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarBoard({ initialAttractions }: { initialAttractions: Attraction[] }) {
  const [attractions, setAttractions] = useState(initialAttractions);
  const [activeAttraction, setActiveAttraction] = useState<Attraction | null>(null);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [createSlot, setCreateSlot] = useState<{ date: string; time: string } | null>(null);
  const [colWidth, setColWidth] = useState(200);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [daysPerPage, setDaysPerPage] = useState(() => {
    const w = window.innerWidth;
    return w < 640 ? 1 : w < 1024 ? 2 : DAYS_PER_PAGE;
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 640);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('vienna-checked') ?? '[]')); }
    catch { return new Set(); }
  });
  const [dayNotes, setDayNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('vienna-day-notes') ?? '{}'); }
    catch { return {}; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const next = w < 640 ? 1 : w < 1024 ? 2 : DAYS_PER_PAGE;
      setDaysPerPage((prev) => {
        if (prev !== next) setCurrentPage(0);
        return next;
      });
      setSidebarOpen(w >= 640);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!conflictMsg) return;
    const t = setTimeout(() => setConflictMsg(null), 3000);
    return () => clearTimeout(t);
  }, [conflictMsg]);

  useEffect(() => {
    localStorage.setItem('vienna-checked', JSON.stringify([...checkedIds]));
  }, [checkedIds]);

  useEffect(() => {
    localStorage.setItem('vienna-day-notes', JSON.stringify(dayNotes));
  }, [dayNotes]);

  // Realtime: sync changes made by other family members
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel('attractions-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attractions' }, (payload: any) => {
        const row = payload.new as Attraction;
        setAttractions((prev) => prev.find((a) => a.id === row.id) ? prev : [...prev, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'attractions' }, (payload: any) => {
        const row = payload.new as Attraction;
        setAttractions((prev) => prev.map((a) => a.id === row.id ? row : a));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'attractions' }, (payload: any) => {
        const id = (payload.old as { id: string }).id;
        setAttractions((prev) => prev.filter((a) => a.id !== id));
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, []);

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateDayNote = (date: string, text: string) => {
    setDayNotes((prev) => ({ ...prev, [date]: text }));
  };

  // Keep colWidth in sync with the actual rendered column width
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const TIME_LABELS_PX = 64; // w-16
    const update = () =>
      setColWidth(Math.max(80, (el.offsetWidth - TIME_LABELS_PX) / visibleDates.length));
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); // re-measure whenever the page (and thus column count) changes

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const TRIP_DATES = generateTripDates();
  const totalPages = Math.ceil(TRIP_DATES.length / daysPerPage);
  const visibleDates = TRIP_DATES.slice(
    currentPage * daysPerPage,
    (currentPage + 1) * daysPerPage
  );

  const unscheduled = attractions.filter((a) => !a.scheduled_date);
  const scheduledByDate = TRIP_DATES.reduce<Record<string, Attraction[]>>((acc, date) => {
    acc[date] = attractions.filter((a) => a.scheduled_date === date);
    return acc;
  }, {});

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAttraction(attractions.find((a) => a.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAttraction(null);
    if (!over) return;

    const attractionId = active.id as string;
    const attraction = attractions.find((a) => a.id === attractionId);
    if (!attraction) return;

    const overId = over.id as string;
    let newDate: string | null;
    let newStartTime: string | null;
    let newEndTime: string | null;

    if (overId === 'unscheduled') {
      newDate = null; newStartTime = null; newEndTime = null;
    } else if (overId.includes('T')) {
      const splitIdx = overId.indexOf('T');
      const date = overId.slice(0, splitIdx);
      const time = overId.slice(splitIdx + 1);
      const duration = attraction.start_time
        ? getDuration(attraction.start_time, attraction.end_time)
        : DEFAULT_DURATION_MINUTES;
      newDate = date;
      newStartTime = time;
      newEndTime = minutesToTime(Math.min(timeToMinutes(time) + duration, 23 * 60));
    } else {
      newDate = overId; newStartTime = null; newEndTime = null;
    }

    if (
      attraction.scheduled_date === newDate &&
      attraction.start_time === newStartTime &&
      attraction.end_time === newEndTime
    ) return;

    if (newDate && newStartTime) {
      const conflict = findTimeConflict(attractions, newDate, newStartTime, newEndTime, attractionId);
      if (conflict) {
        setConflictMsg(`Can't move here — overlaps with "${conflict.name}"`);
        return;
      }
    }

    setAttractions((prev) =>
      prev.map((a) =>
        a.id === attractionId
          ? { ...a, scheduled_date: newDate, start_time: newStartTime, end_time: newEndTime }
          : a
      )
    );

    startTransition(() => {
      updateAttraction(attractionId, {
        scheduled_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });
    });
  };

  const handleAttractionDeleted = (id: string) => {
    setAttractions((prev) => prev.filter((a) => a.id !== id));
    if (editingAttraction?.id === id) setEditingAttraction(null);
  };

  const handleAttractionUpdated = (updated: Attraction) => {
    setAttractions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleAttractionCreated = (attraction: Attraction) => {
    setAttractions((prev) => [...prev, attraction]);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full overflow-hidden bg-white relative">
          {/* Backdrop for mobile sidebar */}
          {sidebarOpen && (
            <div
              className="sm:hidden absolute inset-0 z-40 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar: always visible on sm+, overlay on mobile */}
          <div className={[
            'z-50 h-full sm:static absolute top-0 left-0 transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0',
          ].join(' ')}>
            <UnscheduledSidebar
              attractions={unscheduled}
              onAttractionClick={(a) => { setEditingAttraction(a); setSidebarOpen(false); }}
              onClose={() => setSidebarOpen(false)}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Single header row: nav arrows in time-label cell + day names — ONE border */}
            <div className="flex border-b border-gray-200 bg-white shrink-0">
              {/* Nav arrows share the time-label width column */}
              <div className="w-16 shrink-0 flex flex-row items-center justify-center border-r border-gray-100 gap-0.5">
                <button
                  onClick={() => setSidebarOpen((o) => !o)}
                  className="sm:hidden p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Unscheduled"
                >
                  <PanelLeftOpen size={12} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-500 transition-colors"
                  title="Previous"
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="text-[9px] text-gray-400 font-medium tabular-nums">
                  {currentPage + 1}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-500 transition-colors"
                  title="Next"
                >
                  <ChevronRight size={12} />
                </button>
              </div>

              {visibleDates.map((date) => (
                <DayHeader
                  key={date}
                  date={date}
                  count={scheduledByDate[date]?.length ?? 0}
                  note={dayNotes[date] ?? ''}
                  onNoteChange={(v) => updateDayNote(date, v)}
                />
              ))}
            </div>

            {/* Anytime-zone spacer in time-label column + scrollable grid */}
            <div ref={scrollRef} className="flex flex-1 overflow-y-auto overflow-x-hidden">
              <TimeLabels />
              {visibleDates.map((date) => (
                <DayColumn
                  key={date}
                  date={date}
                  attractions={scheduledByDate[date] ?? []}
                  onAttractionClick={setEditingAttraction}
                  onTimeSlotClick={(d, t) => setCreateSlot({ date: d, time: t })}
                  checkMode={true}
                  checkedIds={checkedIds}
                  onToggleCheck={toggleChecked}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeAttraction && (() => {
            const h = activeAttraction.start_time
              ? getEventHeight(activeAttraction.start_time, activeAttraction.end_time)
              : 72;
            const w = activeAttraction.start_time ? colWidth : 208;
            return (
              <div style={{ width: w }} className="pointer-events-none">
                <AttractionBlock attraction={activeAttraction} isOverlay height={h} />
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>

      {conflictMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl pointer-events-none">
          {conflictMsg}
        </div>
      )}

      {editingAttraction && (
        <EditModal
          attraction={editingAttraction}
          allAttractions={attractions}
          onClose={() => setEditingAttraction(null)}
          onSaved={(updated) => {
            handleAttractionUpdated(updated);
            setEditingAttraction(null);
          }}
          onDeleted={handleAttractionDeleted}
        />
      )}

      {createSlot && (
        <CreateModal
          date={createSlot.date}
          startTime={createSlot.time}
          allAttractions={attractions}
          onClose={() => setCreateSlot(null)}
          onCreated={(attraction) => {
            handleAttractionCreated(attraction);
            setCreateSlot(null);
          }}
        />
      )}
    </>
  );
}
