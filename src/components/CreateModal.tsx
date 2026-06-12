'use client';

import { useState, useTransition } from 'react';
import { Attraction, Category } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ICONS, generateTripDates, formatDateFull } from '@/lib/utils';
import { createAttractionObject } from '@/app/actions';
import { minutesToTime, timeToMinutes, DEFAULT_DURATION_MINUTES, findTimeConflict } from '@/lib/timeUtils';
import { X } from 'lucide-react';

interface CreateModalProps {
  date: string;
  startTime: string;
  allAttractions: Attraction[];
  onClose: () => void;
  onCreated: (attraction: Attraction) => void;
}

export default function CreateModal({ date, startTime, allAttractions, onClose, onCreated }: CreateModalProps) {
  const defaultEndTime = minutesToTime(timeToMinutes(startTime) + DEFAULT_DURATION_MINUTES);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other' as Category,
    scheduled_date: date,
    start_time: startTime,
    end_time: defaultEndTime,
    notes: '',
  });
  const [isPending, startTransition] = useTransition();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const tripDates = generateTripDates();
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  const handleCreate = () => {
    if (!form.name.trim()) return;
    if (form.scheduled_date && form.start_time) {
      const conflict = findTimeConflict(allAttractions, form.scheduled_date, form.start_time, form.end_time || null);
      if (conflict) {
        setConflictError(`Conflicts with "${conflict.name}"`);
        return;
      }
    }
    setConflictError(null);
    startTransition(async () => {
      const attraction = await createAttractionObject({
        name: form.name.trim(),
        description: form.description || null,
        category: form.category,
        scheduled_date: form.scheduled_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        notes: form.notes || null,
      });
      onCreated(attraction);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-gray-900">New Attraction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors rounded-full p-1 hover:bg-gray-100"
          >
            <X size={17} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Schönbrunn Palace"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <label
                  key={cat}
                  className={[
                    'flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-xs font-medium transition-colors',
                    form.category === cat
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="create-category"
                    value={cat}
                    checked={form.category === cat}
                    onChange={() => setForm((f) => ({ ...f, category: cat }))}
                    className="sr-only"
                  />
                  {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-300"
              placeholder="Brief description..."
            />
          </div>

          {/* Day */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Day
            </label>
            <select
              value={form.scheduled_date}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            >
              <option value="">Unscheduled</option>
              {tripDates.map((d) => (
                <option key={d} value={d}>
                  {formatDateFull(d)}
                </option>
              ))}
            </select>
          </div>

          {/* Times */}
          <div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Start time
                </label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => { setConflictError(null); setForm((f) => ({ ...f, start_time: e.target.value })); }}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  End time
                </label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => { setConflictError(null); setForm((f) => ({ ...f, end_time: e.target.value })); }}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {conflictError && (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{conflictError}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Notes & Tips
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-300"
              placeholder="Booking links, ticket prices, tips for the family..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isPending || !form.name.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {isPending ? 'Adding…' : 'Add to trip'}
          </button>
        </div>
      </div>
    </div>
  );
}
