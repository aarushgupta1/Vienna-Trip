'use client';

import dynamic from 'next/dynamic';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from '@dnd-kit/core';
import { useState, useTransition, useEffect, useRef } from 'react';
import { Attraction, Category, DayNote, Hotel } from '@/lib/types';
import { generateTripDates, formatDate, timeAgo } from '@/lib/utils';
import { getEditorName } from '@/lib/editorName';
import { getCityForDate, CITY_COLORS } from '@/lib/trip';
import { DayWeather, weatherCodeInfo } from '@/lib/weather';
import { TravelSegment, TravelMode } from '@/lib/travel';
import {
  DAYS_PER_PAGE,
  GRID_START_HOUR,
  GRID_END_HOUR,
  getDuration,
  getEventHeight,
  timeToMinutes,
  minutesToTime,
  DEFAULT_DURATION_MINUTES,
  findTimeConflict,
} from '@/lib/timeUtils';
import { getSupabaseClient } from '@/lib/supabase';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { getViennaNow, useNowInVienna } from '@/lib/viennaClock';
import { usePushNotifications } from '@/lib/pushNotifications';
import { updateAttraction, upsertDayNote } from '@/app/actions';
import DayColumn from './DayColumn';
import HotelsSidebar from './HotelsSidebar';
import HotelModal from './HotelModal';
import AttractionBlock from './AttractionBlock';
import EditModal from './EditModal';
import CreateModal from './CreateModal';
import SearchJumpBox from './SearchJumpBox';
import CategoryFilterMenu from './CategoryFilterMenu';
import TimeLabels from './TimeLabels';
import { ChevronLeft, ChevronRight, Pencil, PanelLeftOpen, WifiOff, CalendarDays, Bell, BellRing, BellOff, Plus, Search, Map as MapIcon } from 'lucide-react';

// Leaflet touches `window`/`document` at import time, so it can only ever
// load on the client — ssr: false keeps it (and its CSS) out of the server
// render entirely instead of crashing it.
const MapView = dynamic(() => import('./MapView'), { ssr: false });

function pageForDate(date: string, daysPerPage: number): number {
  const idx = generateTripDates().indexOf(date);
  return idx === -1 ? 0 : Math.floor(idx / daysPerPage);
}


function DayHeader({
  date, note, onNoteChange, onNoteCommit, weather, readOnly, isToday,
}: {
  date: string;
  note: string;
  onNoteChange: (v: string) => void;
  onNoteCommit: (v: string) => void;
  weather?: DayWeather;
  readOnly: boolean;
  isToday: boolean;
}) {
  const { weekday, monthDay } = formatDate(date);
  const [editing, setEditing] = useState(false);
  const city = getCityForDate(date);
  const cityColor = CITY_COLORS[city];

  return (
    <div
      className={[
        'flex-1 border-l border-gray-100 dark:border-gray-800 first:border-l-0 flex flex-col',
        isToday ? 'bg-blue-50/60 dark:bg-blue-950/30' : '',
      ].join(' ')}
    >
      <div className="text-center pt-2 pb-1 px-1">
        <div className={['text-[10px] font-bold uppercase tracking-wider', isToday ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'].join(' ')}>
          {isToday ? 'Today' : weekday}
        </div>
        <div className={['text-sm font-bold leading-snug', isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'].join(' ')}>
          {monthDay}
        </div>
        <div
          className={['inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide', cityColor.bg, cityColor.text].join(' ')}
          title={city}
        >
          <span className={['w-1 h-1 rounded-full', cityColor.dot].join(' ')} />
          {city}
        </div>
        {weather && (() => {
          const { icon, label } = weatherCodeInfo(weather.code);
          return (
            <div
              className="flex items-center justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5"
              title={`${label}${weather.isForecast ? '' : ' (average)'} — ${city}`}
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
            onBlur={(e) => { setEditing(false); onNoteCommit(e.target.value); }}
            rows={2}
            placeholder="Notes for this day…"
            className="w-full text-[9px] text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-1 outline-none resize-none leading-tight placeholder-gray-300 dark:placeholder-gray-600 shadow-sm"
          />
        ) : (
          <button
            onClick={() => !readOnly && setEditing(true)}
            disabled={readOnly}
            className="group w-full text-left text-[9px] leading-tight rounded px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
          >
            {note && (
              <span className="text-gray-500 dark:text-gray-400 whitespace-pre-wrap block mb-0.5">{note}</span>
            )}
            {!readOnly && (
              <span className="flex items-center gap-1 text-gray-300 dark:text-gray-600 italic group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors">
                <Pencil size={8} />
                + day notes
              </span>
            )}
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
  initialDayNotes,
  initialHotels,
}: {
  initialAttractions: Attraction[];
  weather: Record<string, DayWeather>;
  travelSegments: Record<string, TravelSegment>;
  initialDayNotes: Record<string, string>;
  initialHotels: Hotel[];
}) {
  const [attractions, setAttractions] = useState(initialAttractions);
  const [activeAttraction, setActiveAttraction] = useState<Attraction | null>(null);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [hotels, setHotels] = useState(initialHotels);
  const [hotelModalState, setHotelModalState] = useState<
    { mode: 'add' } | { mode: 'edit'; hotel: Hotel } | null
  >(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [createSlot, setCreateSlot] = useState<{ date: string; time: string } | null>(null);
  // Set when "+ Add Event" is used instead of clicking a specific grid slot —
  // CreateModal falls back to sensible defaults (today, untimed) in that case.
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [colWidth, setColWidth] = useState(200);
  // Doubles as both the drag/resize conflict notice and a generic error toast
  // for failed writes (move, resize, check, day note) — same transient banner.
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // Defaults assume desktop; the resize effect below corrects for the
  // actual viewport right after mount so this can render on the server.
  const [daysPerPage, setDaysPerPage] = useState(DAYS_PER_PAGE);
  // Starts closed: on mobile this is the correct resting state already (no
  // open-then-slam-shut flash on mount), and on desktop the sidebar is always
  // visible regardless of this flag (forced by `sm:translate-x-0` below).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timezone, setTimezone] = useState<'vienna' | 'eastern'>('vienna');
  const [travelModes, setTravelModes] = useState<Record<string, TravelMode>>({});
  // Purely a view filter — hidden categories are still real events
  // underneath; everything else (conflict checks, search, drag/resize)
  // keeps working off the full unfiltered `attractions` state below.
  const [hiddenCategories, setHiddenCategories] = useState<Category[]>([]);
  const [dayNotes, setDayNotes] = useState<Record<string, string>>(initialDayNotes);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const isOnline = useOnlineStatus();
  const now = useNowInVienna();
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  // Tracks whether the initial "jump to today's page" has happened yet, so
  // later window resizes fall back to the normal reset-to-page-0 behavior
  // instead of yanking the user back to today every time they resize.
  const hasJumpedToToday = useRef(false);
  const { permission: notifyPermission, enable: enablePushNotifications } = usePushNotifications();

  useEffect(() => {
    try { setTravelModes(JSON.parse(localStorage.getItem('vienna-travel-modes') ?? '{}')); } catch {}
    try { setHiddenCategories(JSON.parse(localStorage.getItem('vienna-hidden-categories') ?? '[]')); } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('vienna-hidden-categories', JSON.stringify(hiddenCategories));
  }, [hiddenCategories]);

  // Records the last moment the app was confirmed online, so the offline
  // banner can tell you how stale the cached view you're looking at is
  // (rather than just "you're offline" with no sense of when it last synced).
  useEffect(() => {
    if (!isOnline) {
      try {
        const stored = localStorage.getItem('vienna-last-synced');
        if (stored) setLastSynced(Number(stored));
      } catch {}
      return;
    }
    const nowMs = Date.now();
    try { localStorage.setItem('vienna-last-synced', String(nowMs)); } catch {}
    setLastSynced(nowMs);
  }, [isOnline]);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const next = w < 640 ? 1 : w < 1024 ? 2 : DAYS_PER_PAGE;
      setDaysPerPage((prev) => {
        if (!hasJumpedToToday.current) {
          // On first load, open straight to whichever page today falls on
          // (if today's within the trip) instead of always starting at
          // page 1 — the whole point of this view is "what's happening now."
          setCurrentPage(pageForDate(getViennaNow().date, next));
        } else if (prev !== next) {
          setCurrentPage(0);
        }
        return next;
      });
      hasJumpedToToday.current = true;
      setSidebarOpen(w >= 640);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // "/" opens search/jump from anywhere, like most search-heavy apps —
  // except while the user is actually typing into a text field (day notes,
  // form inputs, etc.), where "/" should just be a normal character.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      e.preventDefault();
      setShowSearch(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  // Realtime: sync day notes made by other family members
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const upsertNote = (payload: any) => {
      const row = payload.new as DayNote;
      setDayNotes((prev) => ({ ...prev, [row.date]: row.note }));
    };

    const channel = client
      .channel('day-notes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'day_notes' }, upsertNote)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'day_notes' }, upsertNote)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'day_notes' }, (payload: any) => {
        const date = (payload.old as { date: string }).date;
        setDayNotes((prev) => {
          const next = { ...prev };
          delete next[date];
          return next;
        });
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, []);

  // Realtime: sync hotels added/edited/deleted by other family members
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel('hotels-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hotels' }, (payload: any) => {
        const row = payload.new as Hotel;
        setHotels((prev) => prev.find((h) => h.id === row.id) ? prev : [...prev, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hotels' }, (payload: any) => {
        const row = payload.new as Hotel;
        setHotels((prev) => prev.map((h) => h.id === row.id ? row : h));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'hotels' }, (payload: any) => {
        const id = (payload.old as { id: string }).id;
        setHotels((prev) => prev.filter((h) => h.id !== id));
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, []);

  const handleHotelSaved = (hotel: Hotel) => {
    setHotels((prev) => {
      const idx = prev.findIndex((h) => h.id === hotel.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = hotel;
        return next;
      }
      return [...prev, hotel];
    });
  };

  const handleHotelDeleted = (id: string) => {
    setHotels((prev) => prev.filter((h) => h.id !== id));
  };

  const updateDayNote = (date: string, text: string) => {
    setDayNotes((prev) => ({ ...prev, [date]: text }));
  };

  const commitDayNote = (date: string, text: string) => {
    startTransition(async () => {
      try {
        await upsertDayNote(date, text, getEditorName());
      } catch {
        setToastMsg("Couldn't save day note — check your connection and try again.");
      }
    });
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
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch requires a long press before a drag starts, so a normal swipe
    // still scrolls the calendar instead of picking up the event underneath.
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
  );

  const TRIP_DATES = generateTripDates();
  const totalPages = Math.ceil(TRIP_DATES.length / daysPerPage);
  const visibleDates = TRIP_DATES.slice(
    currentPage * daysPerPage,
    (currentPage + 1) * daysPerPage
  );

  // Hidden categories are excluded here only — this feeds DayColumn's
  // rendering, not the `attractions` state itself, so drag/resize/conflict
  // checks and search elsewhere in this component still see every event.
  const scheduledByDate = TRIP_DATES.reduce<Record<string, Attraction[]>>((acc, date) => {
    acc[date] = attractions.filter((a) => a.scheduled_date === date && !hiddenCategories.includes(a.category));
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

    if (overId.includes('T')) {
      const splitIdx = overId.indexOf('T');
      const date = overId.slice(0, splitIdx);
      const time = overId.slice(splitIdx + 1);
      const duration = attraction.start_time
        ? getDuration(attraction.start_time, attraction.end_time)
        : DEFAULT_DURATION_MINUTES;
      // Preserve the event's full duration: if dropping here would push the
      // end past the grid, slide the start back instead of shrinking it.
      const gridEndMinutes = GRID_END_HOUR * 60;
      const gridStartMinutes = GRID_START_HOUR * 60;
      let startMinutes = timeToMinutes(time);
      if (startMinutes + duration > gridEndMinutes) {
        startMinutes = Math.max(gridStartMinutes, gridEndMinutes - duration);
      }
      newDate = date;
      newStartTime = minutesToTime(startMinutes);
      newEndTime = minutesToTime(startMinutes + duration);
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
        setToastMsg(`Can't move here — overlaps with "${conflict.name}"`);
        return;
      }
    }

    const previous = { scheduled_date: attraction.scheduled_date, start_time: attraction.start_time, end_time: attraction.end_time };

    setAttractions((prev) =>
      prev.map((a) =>
        a.id === attractionId
          ? { ...a, scheduled_date: newDate, start_time: newStartTime, end_time: newEndTime }
          : a
      )
    );

    startTransition(async () => {
      try {
        await updateAttraction(
          attractionId,
          {
            scheduled_date: newDate,
            start_time: newStartTime,
            end_time: newEndTime,
          },
          getEditorName()
        );
      } catch {
        // Roll back to where it was before the drag — otherwise the card sits
        // in its new spot on this screen while the database still has the old
        // slot, so it'll "jump back" as soon as anyone else's edit syncs in.
        setAttractions((prev) => prev.map((a) => (a.id === attractionId ? { ...a, ...previous } : a)));
        setToastMsg("Couldn't move — check your connection and try again.");
      }
    });
  };

  const handleAttractionResize = (id: string, newEndTime: string) => {
    const attraction = attractions.find((a) => a.id === id);
    const previousEndTime = attraction?.end_time ?? null;

    setAttractions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, end_time: newEndTime } : a))
    );
    startTransition(async () => {
      try {
        await updateAttraction(id, { end_time: newEndTime }, getEditorName());
      } catch {
        setAttractions((prev) => prev.map((a) => (a.id === id ? { ...a, end_time: previousEndTime } : a)));
        setToastMsg("Couldn't resize — check your connection and try again.");
      }
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
            <HotelsSidebar
              hotels={hotels}
              onAddHotel={() => { setHotelModalState({ mode: 'add' }); setSidebarOpen(false); }}
              onHotelClick={(hotel) => { setHotelModalState({ mode: 'edit', hotel }); setSidebarOpen(false); }}
              onClose={() => setSidebarOpen(false)}
              readOnly={!isOnline}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!isOnline && (
              <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-3 py-1.5 text-amber-800 dark:text-amber-300 text-xs shrink-0">
                <WifiOff size={13} className="shrink-0" />
                You&apos;re offline — viewing cached data{lastSynced ? ` from ${timeAgo(lastSynced)}` : ''}, read-only until you&apos;re back online.
              </div>
            )}
            {/* Utility bar — search and the less time-critical controls
                (reminders, timezone) live here, above the main nav strip, so
                day-to-day navigation isn't competing with them for space. */}
            <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-100 dark:border-gray-800 px-2 py-1 shrink-0">
              {/* Search/jump — find an event by name or hop straight to any
                  trip day, without paging through the calendar one screen at
                  a time. Also reachable via the "/" keyboard shortcut. */}
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 self-start"
                title="Search events or jump to a day (/)"
              >
                <Search size={13} />
                <span className="hidden sm:inline">Search</span>
              </button>

              {/* Map — see a day's events plotted and connected in order, to
                  gauge how far apart things actually are before committing
                  to a plan. */}
              <button
                onClick={() => setShowMap(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                title="See this day's events on a map"
              >
                <MapIcon size={13} />
                <span className="hidden sm:inline">Map</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Event reminders — offer to enable once; show a quiet status icon after that */}
                {notifyPermission === 'default' && (
                  <button
                    onClick={enablePushNotifications}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-gray-500 dark:text-gray-400 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Get a notification 30 minutes before each event starts — delivered even if this app isn't open"
                  >
                    <Bell size={13} />
                    <span className="hidden sm:inline">Alerts</span>
                  </button>
                )}
                {notifyPermission === 'granted' && (
                  <span
                    className="flex items-center text-gray-300 dark:text-gray-600"
                    title="You'll get a notification 30 minutes before each event starts, on this device — even if this app isn't open"
                  >
                    <BellRing size={14} />
                  </span>
                )}
                {notifyPermission === 'denied' && (
                  <span
                    className="flex items-center text-gray-300 dark:text-gray-600"
                    title="Notifications are blocked for this site — enable them in your browser's site settings to get 30-minute event alerts"
                  >
                    <BellOff size={14} />
                  </span>
                )}

                {/* Category filter — hide categories you don't want cluttering the view */}
                <CategoryFilterMenu hiddenCategories={hiddenCategories} onChange={setHiddenCategories} />

                {/* Timezone toggle */}
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-semibold">
                  <button
                    onClick={() => setTimezone('vienna')}
                    title="Local time (Vienna, Salzburg & Prague all share the same time zone)"
                    className={timezone === 'vienna' ? 'px-2.5 py-1 bg-blue-500 text-white' : 'px-2.5 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'}
                  >
                    CEST
                  </button>
                  <button
                    onClick={() => setTimezone('eastern')}
                    className={timezone === 'eastern' ? 'px-2.5 py-1 bg-blue-500 text-white' : 'px-2.5 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'}
                  >
                    ET
                  </button>
                </div>
              </div>
            </div>

            {/* Main nav strip — sidebar toggle, day navigation, add event, jump to today */}
            <div className="flex items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-2 py-1.5 shrink-0">
              {/* Sidebar toggle — only useful on mobile since sidebar is always visible on desktop */}
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="sm:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                title="Hotels"
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

              <div className="flex items-center gap-1">
                {/* Add event — opens the same modal a grid click would, just without
                    a slot pre-picked (defaults to today/untimed, editable inside) */}
                <button
                  onClick={() => setShowQuickAdd(true)}
                  disabled={!isOnline}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                  title="Add an event to any day"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Add Event</span>
                </button>

                {/* Jump to today — only relevant while the trip is actually underway */}
                {now && generateTripDates().includes(now.date) && (
                  <button
                    onClick={() => setCurrentPage(pageForDate(now.date, daysPerPage))}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                    title="Jump to today"
                  >
                    <CalendarDays size={13} />
                    <span className="hidden sm:inline">Today</span>
                  </button>
                )}
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
                  onNoteCommit={(v) => commitDayNote(date, v)}
                  readOnly={!isOnline}
                  isToday={date === now?.date}
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
                  travelSegments={travelSegments}
                  travelModes={travelModes}
                  onTravelModeChange={updateTravelMode}
                  readOnly={!isOnline}
                  timezone={timezone}
                  nowMinutes={date === now?.date ? now.minutes : null}
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

      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl pointer-events-none">
          {toastMsg}
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
          onDuplicated={handleAttractionCreated}
          readOnly={!isOnline}
        />
      )}

      {(createSlot || showQuickAdd) && (
        <CreateModal
          date={createSlot?.date}
          startTime={createSlot?.time}
          allAttractions={attractions}
          onClose={() => { setCreateSlot(null); setShowQuickAdd(false); }}
          onCreated={(attraction) => {
            handleAttractionCreated(attraction);
            setCreateSlot(null);
            setShowQuickAdd(false);
          }}
        />
      )}

      {showSearch && (
        <SearchJumpBox
          attractions={attractions}
          onClose={() => setShowSearch(false)}
          onJumpToDate={(date) => setCurrentPage(pageForDate(date, daysPerPage))}
          onSelectAttraction={(attraction) => setEditingAttraction(attraction)}
        />
      )}

      {showMap && (
        <MapView
          attractions={attractions.filter((a) => !hiddenCategories.includes(a.category))}
          hotels={hotels}
          initialDate={now && generateTripDates().includes(now.date) ? now.date : visibleDates[0]}
          onClose={() => setShowMap(false)}
        />
      )}

      {hotelModalState && (
        <HotelModal
          hotel={hotelModalState.mode === 'edit' ? hotelModalState.hotel : undefined}
          onClose={() => setHotelModalState(null)}
          onSaved={(hotel) => {
            handleHotelSaved(hotel);
            setHotelModalState(null);
          }}
          onDeleted={handleHotelDeleted}
        />
      )}
    </>
  );
}
