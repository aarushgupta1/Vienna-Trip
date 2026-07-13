import { getAttractions } from './actions';
import CalendarBoard from '@/components/CalendarBoardClient';
import ThemeToggle from '@/components/ThemeToggle';
import { generateTripDates } from '@/lib/utils';
import { getWeatherForDates } from '@/lib/weather';
import { getTravelSegments } from '@/lib/travel';
import Link from 'next/link';
import { MapPin, AlertTriangle } from 'lucide-react';

export default async function HomePage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const attractions = await getAttractions();
  const weather = await getWeatherForDates(generateTripDates());
  const travelSegments = await getTravelSegments(attractions);

  return (
    <main className="h-dvh flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-5 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-600 dark:text-blue-400" />
          <div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-base">Vienna Trip Planner</span>
            <span className="hidden sm:inline ml-2 text-xs text-gray-400 dark:text-gray-500">Aug 6 – 16, 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/logistics"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
          >
            Logistics
          </Link>
          <Link
            href="/print"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
          >
            Print
          </Link>
          <Link
            href="/attractions/new"
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
          >
            + Add Attraction
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {!isConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-5 py-2.5 text-amber-800 dark:text-amber-300 text-xs shrink-0">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            Supabase is not configured. Copy <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env.local.example</code> to{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env.local</code> and add your project credentials to save data.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <CalendarBoard initialAttractions={attractions} weather={weather} travelSegments={travelSegments} />
      </div>
    </main>
  );
}
