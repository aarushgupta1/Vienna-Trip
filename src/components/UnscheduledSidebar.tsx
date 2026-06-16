'use client';

import { useDroppable } from '@dnd-kit/core';
import { Attraction } from '@/lib/types';
import AttractionCard from './AttractionCard';
import Link from 'next/link';
import { Plus, Inbox, X } from 'lucide-react';

interface UnscheduledSidebarProps {
  attractions: Attraction[];
  onAttractionClick: (a: Attraction) => void;
  onClose?: () => void;
}

export default function UnscheduledSidebar({
  attractions,
  onAttractionClick,
  onClose,
}: UnscheduledSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' });

  return (
    <div className="w-60 border-r border-gray-200 flex flex-col bg-white shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-700 text-sm">Unscheduled</h2>
            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
              {attractions.length}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="sm:hidden p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Link
          href="/attractions/new"
          className="flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={13} />
          Add Attraction
        </Link>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex-1 p-3 flex flex-col gap-2 overflow-y-auto transition-colors',
          isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : '',
        ].join(' ')}
      >
        {attractions.length === 0 && !isOver ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-300 py-10 gap-2">
            <Inbox size={28} strokeWidth={1.5} />
            <div className="text-xs leading-relaxed">
              No unscheduled attractions.<br />
              Add one to get started!
            </div>
          </div>
        ) : (
          attractions.map((attraction) => (
            <AttractionCard
              key={attraction.id}
              attraction={attraction}
              onClick={() => onAttractionClick(attraction)}
            />
          ))
        )}

        {isOver && (
          <div className="flex items-center justify-center py-3 text-blue-400 text-xs font-medium border-2 border-dashed border-blue-300 rounded-lg mt-1">
            Unschedule
          </div>
        )}
      </div>
    </div>
  );
}
