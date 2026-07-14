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
import { DayWeather, weatherCodeInfo } from '@/lib/weather';
import { TravelSegment, TravelMode } from '@/lib/travel';
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
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { updateAttraction } from '@/app/actions';
import DayColumn from './DayColumn';
import UnscheduledSidebar from './UnscheduledSidebar';
import AttractionBlock from './AttractionBlock';
import EditModal from './EditModal';
import CreateModal from './CreateModal';
import TimeLabels from './TimeLabels';
import { ChevronLeft, ChevronRight, Pencil, PanelLeftOpen, WifiOff } from 'lucide-react';

function DayHeader({
  date, note, onNoteChange, weather,
}: {
  date: string; note: string; onNoteChange: (v: string) => void; weather?: DayWeather;
}) {
  const { weekday, monthDay } = formatDate(date);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex-1 border-l border-gray-100 dark:border-gray-800 first:border-l-0 flex flex-col">
      <div className="text-center pt-2 pb-1 px-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{weekday}</div>
        <div className="text-sm font-bold leading-snug text-gray-800 dark:text-gray-200">{monthDay}</div>
        {weather && (() => {
          const { icon, label } = weatherCodeInfo(weather.code);
          return (
            <div
              className="flex items-center justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5"
              title={`${label}${weather.isForecast ? '' : ' (average)'} — Vienna`}
            >
              <span>{icon}</span>
              <span className="font-medium">{weather.high}°</span>
              <span className="text-gray-300 dark:text-gray-600">/{weather.low}°</span>
              {!weather.isForecast && <span className="text-gray-300 dark:text-gray-600">~</span>}
            </div>
          );
        })()}
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
            className="w-full text-[9px] text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-1 outline-none resize-none leading-tight placeholder-gray-300 dark:placeholder-gray-600 shadow-sm"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="group w-full text-left text-[9px] leading-tight rounded px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {note && (
              <span className="text-gray-500 dark:text-gray-400 whitespace-pre-wrap block mb-0.5">{note}</span>
            )}
            <span className="flex items-center gap-1 text-gray-300 dark:text-gray-600 italic group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors">
              <Pencil size={8} />
              + day notes
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarBoard({
  initialAttractions,
  weather,
  travelSegments,
}: {
  initialAttractions: Attraction[];
  weather: Record<string, DayWeather>;
  travelSegments: Record<string, TravelSegment>;
}) {
  const [attractions, setAttractions] = useState(initialAttractions);
  const [activeAttraction, setActiveAttraction] = useState<Attraction | null>(null);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [createSlot, setCreateSlot] = useState<{ date: string; time: string } | null>(null);
  const [colWidth, setColWidth] = useState(200);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  // Defaults assume desktop; the resize effect below corrects for the
  // actual viewport right after mount so this can render on the server.
  const [daysPerPage, setDaysPerPage] = useState(DAYS_PER_PAGE);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState<'vienna' | 'eastern'>('vienna');
  const [travelModes, setTravelModes] = useState<Record<string, TravelMode>>({});
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    try { setCheckedIds(new Set(JSON.parse(localStorage.getItem('vienna-checked') ?? '[]'))); } catch {}
    try { setDayNotes(JSON.parse(localStorage.getItem('vienna-day-notes') ?? '{}')); } catch {}
    try { setTravelModes(JSON.parse(localStorage.getItem('vienna-travel-modes') ?? '{}')); } catch {}
  }, []);

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

  useEffect(() => {
    localStorage.setItem('vienna-travel-modes', JSON.stringify(travelModes));
  }, [travelModes]);

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

  const updateTravelMode = (pairKey: string, mode: TravelMode) => {
    setTravelModes((prev) => ({ ...prev, [pairKey]: mode }));
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

  const handleAttractionResize = (id: string, newEndTime: string) => {
    setAttractions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, end_time: newEndTime } : a))
    );
    startTransition(() => {
      updateAttraction(id, { end_time: newEndTime });
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
        id="calendar-board-dnd"
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full overflow-hidden bg-white dark:bg-gray-900 relative">
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
              readOnly={!isOnline}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!isOnline && (
              <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-3 py-1.5 text-amber-800 dark:text-amber-300 text-xs shrink-0">
                <WifiOff size={13} className="shrink-0" />
                You&apos;re offline — read-only until you&apos;re back online.
              </div>
            )}
            {/* Universal nav strip — arrows on top for all screen sizes */}
            <div className="flex items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-2 py-1.5 shrink-0">
              {/* Sidebar toggle — only useful on mobile since sidebar is always visible on desktop */}
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="sm:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                title="Unscheduled"
              >
                <PanelLeftOpen size={20} />
              </button>
              <div className="hidden sm:block w-11" />

              {/* Navigation — centered */}
              <div className="flex-1 flex items-center justify-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-25 text-gray-600 dark:text-gray-300 transition-colors"
                  title="Previous"
                >
                  <ChevronLeft size={24} />
                </button>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 tabular-nums min-w-[3.5rem] text-center">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-25 text-gray-600 dark:text-gray-300 transition-colors"
                  title="Next"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Timezone toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-semibold">
                <button
                  onClick={() => setTimezone('vienna')}
                  className={timezone === 'vienna' ? 'px-2.5 py-1.5 bg-blue-500 text-white' : 'px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'}
                >
                  VIE
                </button>
                <button
                  onClick={() => setTimezone('eastern')}
                  className={timezone === 'eastern' ? 'px-2.5 py-1.5 bg-blue-500 text-white' : 'px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'}
                >
                  ET
                </button>
              </div>
            </div>

            {/* Header row: time-label spacer + day names */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
              <div className="w-16 shrink-0 border-r border-gray-100 dark:border-gray-800" />

              {visibleDates.map((date) => (
                <DayHeader
                  key={date}
                  date={date}
                  note={dayNotes[date] ?? ''}
                  weather={weather[date]}
                  onNoteChange={(v) => updateDayNote(date, v)}
                />
              ))}
            </div>

            {/* Anytime-zone spacer in time-label column + scrollable grid */}
            <div ref={scrollRef} className="flex flex-1 overflow-y-auto overflow-x-hidden">
              <TimeLabels timezone={timezone} />
              {visibleDates.map((date) => (
                <DayColumn
                  key={date}
                  date={date}
                  attractions={scheduledByDate[date] ?? []}
                  onAttractionClick={setEditingAttraction}
                  onTimeSlotClick={(d, t) => setCreateSlot({ date: d, time: t })}
                  onAttractionResize={handleAttractionResize}
                  checkMode={true}
                  checkedIds={checkedIds}
                  onToggleCheck={toggleChecked}
                  travelSegments={travelSegments}
                  travelModes={travelModes}
                  onTravelModeChange={updateTravelMode}
                  readOnly={!isOnline}
                  timezone={timezone}
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
                <AttractionBlock attraction={activeAttraction} isOverlay height={h} timezone={timezone} />
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
          readOnly={!isOnline}
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
