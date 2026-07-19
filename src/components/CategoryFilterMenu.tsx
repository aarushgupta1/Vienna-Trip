'use client';

import { useEffect, useRef, useState } from 'react';
import { Category } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/lib/utils';
import { SlidersHorizontal, Check } from 'lucide-react';

interface CategoryFilterMenuProps {
  hiddenCategories: Category[];
  onChange: (hidden: Category[]) => void;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

// A small anchored dropdown (not a full modal — this is meant to be a quick,
// low-friction toggle) for showing/hiding event categories on the calendar.
// Purely a view filter: hidden events are still real events underneath —
// conflict detection, search, and drag/resize all keep working against the
// full unfiltered list, since callers pass the original `attractions` array
// to those, not whatever's currently hidden here.
export default function CategoryFilterMenu({ hiddenCategories, onChange }: CategoryFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = (cat: Category) => {
    onChange(
      hiddenCategories.includes(cat)
        ? hiddenCategories.filter((c) => c !== cat)
        : [...hiddenCategories, cat]
    );
  };

  const hiddenCount = hiddenCategories.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors',
          hiddenCount > 0
            ? 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
        ].join(' ')}
        title="Show or hide event categories"
      >
        <SlidersHorizontal size={13} />
        <span className="hidden sm:inline">Filter{hiddenCount > 0 ? ` (${hiddenCount})` : ''}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5">
          <div className="flex items-center justify-between px-3 pb-1.5 mb-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Show categories
            </span>
            {hiddenCount > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Show all
              </button>
            )}
          </div>
          {ALL_CATEGORIES.map((cat) => {
            const visible = !hiddenCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggle(cat)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span
                  className={[
                    'w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors',
                    visible ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-600',
                  ].join(' ')}
                >
                  {visible && <Check size={11} />}
                </span>
                <span>{CATEGORY_ICONS[cat]}</span>
                <span className="flex-1">{CATEGORY_LABELS[cat]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
