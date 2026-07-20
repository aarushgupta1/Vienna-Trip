import { getAttractions, getDayNotes, getHotels } from './actions';
import CalendarBoard from '@/components/CalendarBoardClient';
import ThemeToggle from '@/components/ThemeToggle';
import EditorNameBadge from '@/components/EditorNameBadge';
import PresenceIndicator from '@/components/PresenceIndicator';
import InstallPrompt from '@/components/InstallPrompt';
import { generateTripDates } from '@/lib/utils';
import { getWeatherForDates } from '@/lib/weather';
import { getTravelSegments } from '@/lib/travel';
import { MapPin, AlertTriangle } from 'lucide-react';

export default async function HomePage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const attractions = await getAttractions();
  const weather = await getWeatherForDates(generateTripDates());
  const travelSegments = await getTravelSegments(attractions);
  const dayNotes = await getDayNotes();
  const hotels = await getHotels();

  return (
    <main className="h-dvh flex flex-col bg-blue-50/40 dark:bg-gray-950">
      <header className="h-14 bg-blue-50/70 dark:bg-gray-900 border-b border-blue-100 dark:border-gray-800 flex items-center justify-between gap-2 px-3 sm:px-5 shrink-0 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <MapPin size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="min-w-0">
            <span className="block sm:inline truncate font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">Vienna · Salzburg · Prague</span>
            <span className="hidden sm:inline ml-2 text-xs text-gray-400 dark:text-gray-500">Aug 6 – 16, 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <InstallPrompt />
          <PresenceIndicator />
          <EditorNameBadge />
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
        <CalendarBoard
          initialAttractions={attractions}
          weather={weather}
          travelSegments={travelSegments}
          initialDayNotes={dayNotes}
          initialHotels={hotels}
        />
      </div>
    </main>
  );
}
