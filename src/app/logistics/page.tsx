import { getPins } from './actions';
import PinboardClient from '@/components/PinboardClient';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { ClipboardList, ArrowLeft, AlertTriangle } from 'lucide-react';

export default async function LogisticsPage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pins = await getPins();

  return (
    <main className="h-dvh flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-5 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Back to planner"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
            <div>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-base">Logistics</span>
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">Vienna · Aug 6 – 16, 2026</span>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {!isConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-5 py-2.5 text-amber-800 dark:text-amber-300 text-xs shrink-0">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            Supabase is not configured — pins won&apos;t be saved. Copy{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env.local.example</code> to{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env.local</code> and add your
            credentials. You&apos;ll also need a{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">logistics_pins</code> table — see{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">README.md</code> for the schema.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <PinboardClient initialPins={pins} />
      </div>
    </main>
  );
}
