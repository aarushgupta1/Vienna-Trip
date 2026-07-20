'use client';

import { Hotel } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';
import { Calendar, MapPin } from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', CZK: 'Kč' };

function nightsBetween(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const ms = new Date(checkOut + 'T00:00:00Z').getTime() - new Date(checkIn + 'T00:00:00Z').getTime();
  const n = Math.round(ms / (1000 * 60 * 60 * 24));
  return n > 0 ? n : null;
}

interface HotelCardProps {
  hotel: Hotel;
  onClick?: () => void;
}

export default function HotelCard({ hotel, onClick }: HotelCardProps) {
  const nights = nightsBetween(hotel.check_in, hotel.check_out);
  const symbol = CURRENCY_SYMBOLS[hotel.currency] ?? `${hotel.currency} `;

  return (
    <div
      onClick={onClick}
      className={[
        'rounded-lg border text-sm select-none transition-shadow',
        onClick ? 'cursor-pointer hover:shadow-md hover:brightness-95' : '',
        'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 shadow-sm',
      ].join(' ')}
    >
      <div className="p-2.5">
        <div className="flex items-start gap-1.5">
          <span className="text-base leading-none mt-px shrink-0">🏨</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate text-sm leading-tight text-violet-700 dark:text-violet-300">
              {hotel.name}
            </div>

            {(hotel.check_in || hotel.check_out) && (
              <div className="flex items-center gap-1 mt-1 text-[11px] opacity-70 text-violet-700 dark:text-violet-300">
                <Calendar size={10} className="shrink-0" />
                <span>
                  {hotel.check_in ? formatDateShort(hotel.check_in) : '—'}
                  {' → '}
                  {hotel.check_out ? formatDateShort(hotel.check_out) : '—'}
                </span>
              </div>
            )}

            {hotel.location && (
              <div className="flex items-center gap-1 mt-1 text-[11px] opacity-60 text-violet-700 dark:text-violet-300">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{hotel.location}</span>
              </div>
            )}
          </div>
        </div>

        {hotel.price != null && (
          <div className="mt-2 flex items-center justify-between rounded-md bg-white/70 dark:bg-black/20 px-2 py-1.5">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-violet-500 dark:text-violet-400">
              {nights ? `${nights} night${nights === 1 ? '' : 's'}` : 'Price'}
            </span>
            <span className="font-bold text-violet-700 dark:text-violet-300 text-sm tabular-nums">
              {symbol}{hotel.price.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
