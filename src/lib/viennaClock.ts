'use client';

import { useEffect, useState } from 'react';

export interface ViennaNow {
  date: string; // YYYY-MM-DD, Vienna-local calendar date
  minutes: number; // minutes since midnight, Vienna-local time
}

// The calendar grid always represents Vienna wall-clock time regardless of
// the VIE/ET display toggle (see shiftTime in utils.ts), so "today" and the
// current-time line both need the real Vienna-local clock, not the browser's
// local timezone.
export function getViennaNow(): ViennaNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = Number(get('hour')) % 24; // Intl can render midnight as "24" with hour12: false
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + Number(get('minute')),
  };
}

// Starts `null` (rather than computing during the initial render) so the
// server-rendered HTML and the client's first render always match — the
// "today" highlight and current-time line only appear once mounted
// client-side, then refresh every minute.
export function useNowInVienna(): ViennaNow | null {
  const [now, setNow] = useState<ViennaNow | null>(null);

  useEffect(() => {
    setNow(getViennaNow());
    const id = setInterval(() => setNow(getViennaNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}
