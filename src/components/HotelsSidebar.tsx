'use client';

import { Hotel } from '@/lib/types';
import HotelCard from './HotelCard';
import { Plus, BedDouble, X } from 'lucide-react';

interface HotelsSidebarProps {
  hotels: Hotel[];
  onAddHotel: () => void;
  onHotelClick: (hotel: Hotel) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export default function HotelsSidebar({
  hotels,
  onAddHotel,
  onHotelClick,
  onClose,
  readOnly = false,
}: HotelsSidebarProps) {
  return (
    <div className="w-60 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900 shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Hotels</h2>
            <span className="text-xs text-gray-400 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
              {hotels.length}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="sm:hidden p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {readOnly ? (
          <div
            className="flex items-center justify-center gap-1.5 w-full bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-semibold px-3 py-2 rounded-lg cursor-not-allowed"
            title="Unavailable while offline"
          >
            <Plus size={13} />
            Add Hotel
          </div>
        ) : (
          <button
            onClick={onAddHotel}
            className="flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Add Hotel
          </button>
        )}
      </div>

      <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
        {hotels.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-300 dark:text-gray-700 py-10 gap-2">
            <BedDouble size={28} strokeWidth={1.5} />
            <div className="text-xs leading-relaxed">
              No hotels yet.<br />
              Add one to keep track of dates and price!
            </div>
          </div>
        ) : (
          hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} onClick={() => onHotelClick(hotel)} />
          ))
        )}
      </div>
    </div>
  );
}
