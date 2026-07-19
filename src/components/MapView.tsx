'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Attraction, Hotel } from '@/lib/types';
import { CATEGORY_ICONS, formatDateFull, formatTime, generateTripDates } from '@/lib/utils';
import { getCityForDate, CITY_INFO } from '@/lib/trip';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MapViewProps {
  attractions: Attraction[];
  hotels: Hotel[];
  initialDate: string;
  onClose: () => void;
}

// This only ever mounts on the client (loaded via next/dynamic with
// ssr: false in CalendarBoard) — Leaflet touches `window`/`document` at
// import time, which would blow up a server render otherwise.
export default function MapView({ attractions, hotels, initialDate, onClose }: MapViewProps) {
  const tripDates = useMemo(() => generateTripDates(), []);
  const [date, setDate] = useState(initialDate);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Only events with a geocoded location can be plotted — sorted
  // chronologically so the route/numbering reflects the day's actual plan.
  const dayEvents = useMemo(
    () =>
      attractions
        .filter((a) => a.scheduled_date === date && a.lat != null && a.lng != null)
        .sort((a, b) => (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99')),
    [attractions, date]
  );

  // Whichever hotel covers this night, if it's been geocoded — shown as a
  // distinct "home base" pin so it's obvious how far the day's plan is from
  // where you're actually staying.
  const hotel = useMemo(
    () =>
      hotels.find(
        (h) => h.check_in && h.check_out && h.lat != null && h.lng != null && date >= h.check_in && date < h.check_out
      ),
    [hotels, date]
  );

  // Create the map once and tear it down on unmount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const cityCenter = CITY_INFO[getCityForDate(date)];
    const map = L.map(containerRef.current, { zoomControl: true }).setView([cityCenter.lat, cityCenter.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // The modal animates/lays out after mount, so the container's real size
    // isn't known yet on the very first paint — without this, Leaflet can
    // render into a 0-height box and the tiles never fill the visible area.
    const t = setTimeout(() => map.invalidateSize(), 50);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw pins/route whenever the selected day's data changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points: L.LatLngExpression[] = [];

    if (hotel && hotel.lat != null && hotel.lng != null) {
      L.marker([hotel.lat, hotel.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="background:#7c3aed;color:white;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,0.4);border:2px solid white;">🏨</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      })
        .bindPopup(`<strong>${escapeHtml(hotel.name)}</strong><br/>Where you're staying`)
        .addTo(layer);
      points.push([hotel.lat, hotel.lng]);
    }

    dayEvents.forEach((a, i) => {
      L.marker([a.lat!, a.lng!], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#2563eb;color:white;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,0.4);border:2px solid white;">${i + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      })
        .bindPopup(
          `<strong>${escapeHtml(a.name)}</strong>` +
            (a.start_time ? `<br/>${escapeHtml(formatTime(a.start_time))}` : '') +
            (a.location ? `<br/>${escapeHtml(a.location)}` : '')
        )
        .addTo(layer);
      points.push([a.lat!, a.lng!]);
    });

    if (points.length > 1) {
      L.polyline(points, { color: '#2563eb', weight: 3, opacity: 0.6, dashArray: '6 6' }).addTo(layer);
    }

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    } else {
      const cityCenter = CITY_INFO[getCityForDate(date)];
      map.setView([cityCenter.lat, cityCenter.lng], 12);
    }
  }, [dayEvents, hotel, date]);

  const dateIdx = tripDates.indexOf(date);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => dateIdx > 0 && setDate(tripDates[dateIdx - 1])}
              disabled={dateIdx <= 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 text-gray-500 dark:text-gray-400 transition-colors"
              title="Previous day"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[11rem] text-center">
              {formatDateFull(date)}
              <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">{getCityForDate(date)}</span>
            </div>
            <button
              onClick={() => dateIdx < tripDates.length - 1 && setDate(tripDates[dateIdx + 1])}
              disabled={dateIdx >= tripDates.length - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 text-gray-500 dark:text-gray-400 transition-colors"
              title="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={17} />
          </button>
        </div>

        <div ref={containerRef} className="flex-1 min-h-0" />

        {/* Order list / legend */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-5 py-2.5 max-h-28 overflow-y-auto">
          {dayEvents.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No located events this day — add a location to an event to see it here.
            </p>
          ) : (
            <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
              {dayEvents.map((a, i) => (
                <li key={a.id} className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span>{CATEGORY_ICONS[a.category]}</span>
                  <span className="font-medium">{a.name}</span>
                  {a.start_time && <span className="text-gray-400 dark:text-gray-500">{formatTime(a.start_time)}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// Popup HTML is built from user-entered event/hotel data, so it needs
// escaping to avoid it being interpreted as markup by Leaflet's popup (which
// just sets innerHTML on whatever string it's given).
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
