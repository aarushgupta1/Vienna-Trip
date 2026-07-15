'use client';

import dynamic from 'next/dynamic';
import { Attraction } from '@/lib/types';
import { DayWeather } from '@/lib/weather';
import { TravelSegment } from '@/lib/travel';

const CalendarBoard = dynamic(() => import('./CalendarBoard'));

export default function CalendarBoardClient(props: {
  initialAttractions: Attraction[];
  weather: Record<string, DayWeather>;
  travelSegments: Record<string, TravelSegment>;
  initialDayNotes: Record<string, string>;
}) {
  return <CalendarBoard {...props} />;
}
