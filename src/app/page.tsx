import { getAttractions } from './actions';
import CalendarBoard from '@/components/CalendarBoardClient';
import Link from 'next/link';
import { MapPin, AlertTriangle } from 'lucide-react';

export default async function HomePage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const attractions = await getAttractions();

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-600" />
          <div>
            <span className="font-bold text-gray-900 text-base">Vienna Trip Planner</span>
            <span className="ml-2 text-xs text-gray-400">Aug 6 – 16, 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/logistics"
            className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors"
          >
            Logistics
          </Link>
          <Link
            href="/attractions/new"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            + Add Attraction
          </Link>
        </div>
      </header>

      {!isConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-amber-800 text-xs shrink-0">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            Supabase is not configured. Copy <code className="font-mono bg-amber-100 px-1 rounded">.env.local.example</code> to{' '}
            <code className="font-mono bg-amber-100 px-1 rounded">.env.local</code> and add your project credentials to save data.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <CalendarBoard initialAttractions={attractions} />
      </div>
    </main>
  );
}
