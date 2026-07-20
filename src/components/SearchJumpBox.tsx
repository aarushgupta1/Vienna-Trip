'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Attraction } from '@/lib/types';
import { CATEGORY_ICONS, formatDate, formatDateFull, formatTime, generateTripDates } from '@/lib/utils';
import { getCityForDate, getCitiesForDate, CITY_COLORS } from '@/lib/trip';
import { Search, X, CalendarDays } from 'lucide-react';

interface SearchJumpBoxProps {
  attractions: Attraction[];
  onClose: () => void;
  onJumpToDate: (date: string) => void;
  onSelectAttraction: (attraction: Attraction) => void;
}

// A combined "search events" + "jump to any day" overlay. Typing filters
// attractions by name/location/notes; leaving it blank instead shows every
// trip day as a quick-jump grid, since there was previously no way to get to
// a specific day (or a specific event) without paging through the calendar
// one screen at a time.
export default function SearchJumpBox({ attractions, onClose, onJumpToDate, onSelectAttraction }: SearchJumpBoxProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tripDates = useMemo(() => generateTripDates(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmed) return [];
    return attractions
      .filter(
        (a) =>
          a.name.toLowerCase().includes(trimmed) ||
          (a.location ?? '').toLowerCase().includes(trimmed) ||
          (a.notes ?? '').toLowerCase().includes(trimmed)
      )
      .sort((a, b) => {
        const dateCompare = (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? '');
        if (dateCompare !== 0) return dateCompare;
        return (a.start_time ?? '').localeCompare(b.start_time ?? '');
      })
      .slice(0, 20);
  }, [attractions, trimmed]);

  const handleSelectResult = (attraction: Attraction) => {
    if (attraction.scheduled_date) onJumpToDate(attraction.scheduled_date);
    onSelectAttraction(attraction);
    onClose();
  };

  const handleJumpToDay = (date: string) => {
    onJumpToDate(date);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[10vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, or jump to a day…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {trimmed ? (
            results.length > 0 ? (
              <div className="py-1.5">
                {results.map((a) => {
                  const city = a.scheduled_date ? getCityForDate(a.scheduled_date) : null;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSelectResult(a)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-base shrink-0">{CATEGORY_ICONS[a.category]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{a.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {a.scheduled_date ? formatDateFull(a.scheduled_date) : 'No date'}
                          {city ? ` — ${city}` : ''}
                          {a.start_time ? ` · ${formatTime(a.start_time)}` : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                No events match &quot;{query}&quot;
              </p>
            )
          ) : (
            <div className="p-3">
              <div className="px-1 pb-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                <CalendarDays size={11} />
                Jump to a day
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {tripDates.map((date) => {
                  const { weekday, monthDay } = formatDate(date);
                  // Most days belong to one city, but a day-trip day (like Aug
                  // 10, Salzburg base with a day trip back to Vienna) belongs
                  // to more than one — show one dot per city rather than just
                  // whichever is "primary".
                  const cities = getCitiesForDate(date);
                  return (
                    <button
                      key={date}
                      onClick={() => handleJumpToDay(date)}
                      className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{weekday}</span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{monthDay}</span>
                      <span className="flex items-center gap-0.5">
                        {cities.map((city) => (
                          <span key={city} className={['w-1 h-1 rounded-full', CITY_COLORS[city].dot].join(' ')} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
