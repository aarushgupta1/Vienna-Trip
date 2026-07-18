import { getAttractions, getDayNotes } from '../actions';
import {
  generateTripDates,
  formatDateFull,
  formatTime,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  getMapsUrl,
} from '@/lib/utils';
import { getTravelSegments, TravelSegment } from '@/lib/travel';
import { getCityForDate } from '@/lib/trip';
import { Attraction } from '@/lib/types';
import PrintButton from '@/components/PrintButton';
import PrintTravelRow from '@/components/PrintTravelRow';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';

function EventRow({ attraction }: { attraction: Attraction }) {
  return (
    <div className="flex gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <div className="w-32 shrink-0 text-right text-xs text-gray-400 leading-relaxed pt-0.5 whitespace-nowrap">
        {attraction.start_time ? (
          <>
            {formatTime(attraction.start_time)}
            {attraction.end_time && (
              <>
                <span className="mx-0.5">–</span>
                {formatTime(attraction.end_time)}
              </>
            )}
          </>
        ) : (
          <span className="italic">—</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug">
          {CATEGORY_ICONS[attraction.category]}{' '}
          {attraction.name}
          <span className="ml-1.5 text-[10px] font-normal text-gray-400 uppercase tracking-wide">
            {CATEGORY_LABELS[attraction.category]}
          </span>
        </p>
        {attraction.description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{attraction.description}</p>
        )}
        {attraction.notes && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed italic">{attraction.notes}</p>
        )}
        {attraction.location && (() => {
          const mapsUrl = getMapsUrl(attraction);
          return (
            <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                  <MapPin size={11} className="shrink-0" />
                  {attraction.location}
                </a>
              ) : (
                attraction.location
              )}
            </p>
          );
        })()}
      </div>
    </div>
  );
}

function DayEvents({ events, travelSegments }: { events: Attraction[]; travelSegments: Record<string, TravelSegment> }) {
  const timed = events.filter((a) => a.start_time);
  const untimed = events.filter((a) => !a.start_time);

  return (
    <>
      {timed.map((a, i) => {
        const next = timed[i + 1];
        const pairKey = next ? `${a.id}->${next.id}` : null;
        const segment = pairKey ? travelSegments[pairKey] : undefined;
        return (
          <div key={a.id}>
            <EventRow attraction={a} />
            {pairKey && segment && <PrintTravelRow pairKey={pairKey} segment={segment} />}
          </div>
        );
      })}
      {untimed.map((a) => (
        <EventRow key={a.id} attraction={a} />
      ))}
    </>
  );
}

export default async function PrintPage() {
  const attractions = await getAttractions();
  const dayNotes = await getDayNotes();
  const travelSegments = await getTravelSegments(attractions);
  const dates = generateTripDates();

  const byDate = dates.map((date) => ({
    date,
    events: attractions
      .filter((a) => a.scheduled_date === date)
      .sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      }),
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to planner
        </Link>
        <PrintButton />
      </div>

      {/* Printable content */}
      <div className="max-w-2xl mx-auto px-10 py-10 print:px-0 print:py-0 print:max-w-none">
        {/* Title */}
        <div className="mb-8 pb-4 border-b-2 border-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vienna, Salzburg & Prague Trip Planner</h1>
          <p className="text-sm text-gray-500 mt-0.5">August 6 – 16, 2026 &nbsp;·&nbsp; Family Itinerary</p>
        </div>

        {/* Itinerary */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4 pb-2 border-b-2 border-gray-900">
            Itinerary
          </h2>

          <div className="space-y-8">
            {byDate.map(({ date, events }) => (
              <div key={date} className="break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  {formatDateFull(date)}
                  <span className="ml-1.5 font-semibold normal-case tracking-normal text-gray-300">
                    — {getCityForDate(date)}
                  </span>
                </h3>
                {dayNotes[date] && (
                  <p className="text-xs text-gray-500 italic mb-2 pl-32 whitespace-pre-wrap leading-relaxed">
                    {dayNotes[date]}
                  </p>
                )}
                {events.length === 0 ? (
                  <p className="text-sm text-gray-300 italic pl-32">Nothing scheduled</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <DayEvents events={events} travelSegments={travelSegments} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
