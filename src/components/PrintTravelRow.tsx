'use client';

import { useEffect, useState } from 'react';
import { TravelSegment, TravelMode, segmentMinutes, formatDistance, isEstimatedMode } from '@/lib/travel';

const TRAVEL_MODE_ICON: Record<TravelMode, string> = {
  walk: '🚶',
  bus: '🚌',
  drive: '🚗',
  train: '🚆',
};

const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  walk: 'Walk',
  bus: 'Bus',
  drive: 'Drive',
  train: 'Train',
};

export default function PrintTravelRow({ pairKey, segment }: { pairKey: string; segment: TravelSegment }) {
  const [mode, setMode] = useState<TravelMode>('walk');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('vienna-travel-modes') ?? '{}');
      if (stored[pairKey]) setMode(stored[pairKey]);
    } catch {}
  }, [pairKey]);

  const minutes = segmentMinutes(segment, mode);
  const estimated = isEstimatedMode(mode);

  return (
    <div className="flex gap-4 py-1 border-b border-gray-100 last:border-b-0">
      <div className="w-32 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[10px] text-gray-400 italic">
        <span>{TRAVEL_MODE_ICON[mode]}</span>
        <span>{TRAVEL_MODE_LABEL[mode]}</span>
        <span>&middot;</span>
        <span>{formatDistance(segment.distanceMeters)}</span>
        <span>&middot;</span>
        <span>{estimated && '~'}{minutes != null ? `${minutes} min` : '—'}</span>
      </div>
    </div>
  );
}
