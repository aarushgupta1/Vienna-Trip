'use client';

import { useEffect, useRef, useState } from 'react';
import { Category } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/lib/utils';
import { NotificationPermissionState } from '@/lib/pushNotifications';
import { MoreHorizontal, Map as MapIcon, Bell, BellRing, BellOff, Check } from 'lucide-react';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

interface MoreMenuProps {
  onOpenMap: () => void;
  notifyPermission: NotificationPermissionState;
  notifySubscribed: boolean;
  onEnableNotifications: () => void;
  onDisableNotifications: () => void;
  hiddenCategories: Category[];
  onHiddenCategoriesChange: (hidden: Category[]) => void;
}

// Map, Alerts, and the category filter all used to be their own separate
// buttons sitting directly in the utility bar — that read as cluttered once
// there were several of them, so they're consolidated into one "More" panel
// instead. Search and the timezone toggle stay outside this menu: search is
// used far more than the rest combined, and timezone is glanceable state
// (which one is active) that's worth keeping visible at rest rather than
// hidden behind a click.
export default function MoreMenu({
  onOpenMap,
  notifyPermission,
  notifySubscribed,
  onEnableNotifications,
  onDisableNotifications,
  hiddenCategories,
  onHiddenCategoriesChange,
}: MoreMenuProps) {
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

  const toggleCategory = (cat: Category) => {
    onHiddenCategoriesChange(
      hiddenCategories.includes(cat)
        ? hiddenCategories.filter((c) => c !== cat)
        : [...hiddenCategories, cat]
    );
  };

  const hiddenCount = hiddenCategories.length;
  const hasBadge = hiddenCount > 0 || notifyPermission === 'default';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'relative flex items-center px-2.5 py-1 rounded-lg border transition-colors',
          hiddenCount > 0
            ? 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
        ].join(' ')}
        title="More: map, alerts, category filter"
        aria-label="More options: map, alerts, category filter"
      >
        <MoreHorizontal size={15} />
        {hasBadge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5">
          {/* Map */}
          <button
            onClick={() => { onOpenMap(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <MapIcon size={14} className="text-gray-400 dark:text-gray-500" />
            See this day on a map
          </button>

          {/* Event reminders — the menu stays open after any of these so
              the "on"/"off" state change is visible right away, instead of
              the menu closing before you can see it took effect. */}
          {notifyPermission === 'default' && (
            <button
              onClick={onEnableNotifications}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell size={14} className="text-gray-400 dark:text-gray-500" />
              Get event alerts
            </button>
          )}
          {notifyPermission === 'granted' && notifySubscribed && (
            <button
              onClick={onDisableNotifications}
              title="You'll get a notification 30 minutes before each event starts, on this device — even if this app isn't open. Click to turn off."
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <BellRing size={14} className="text-blue-500 dark:text-blue-400" />
              Alerts on
              <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Turn off</span>
            </button>
          )}
          {notifyPermission === 'granted' && !notifySubscribed && (
            <button
              onClick={onEnableNotifications}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <BellOff size={14} className="text-gray-400 dark:text-gray-500" />
              Alerts off
              <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Turn on</span>
            </button>
          )}
          {notifyPermission === 'denied' && (
            <div
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500"
              title="Notifications are blocked for this site — enable them in your browser's site settings to get 30-minute event alerts"
            >
              <BellOff size={14} />
              Alerts blocked
            </div>
          )}

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          {/* Category filter */}
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Show categories
            </span>
            {hiddenCount > 0 && (
              <button
                onClick={() => onHiddenCategoriesChange([])}
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
                onClick={() => toggleCategory(cat)}
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
