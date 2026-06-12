'use client';

import dynamic from 'next/dynamic';
import { Attraction } from '@/lib/types';

const CalendarBoard = dynamic(() => import('./CalendarBoard'), { ssr: false });

export default function CalendarBoardClient(props: { initialAttractions: Attraction[] }) {
  return <CalendarBoard {...props} />;
}
