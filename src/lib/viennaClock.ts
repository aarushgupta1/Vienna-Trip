'use client';

import { useEffect, useState } from 'react';
import { getViennaNow, ViennaNow } from './viennaTime';

export type { ViennaNow };
export { getViennaNow };

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
