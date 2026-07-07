'use client';

import { useState, useTransition } from 'react';
import { Attraction, Category } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ICONS, generateTripDates, formatDateFull, buildGCalUrl } from '@/lib/utils';
import { updateAttraction, deleteAttraction } from '@/app/actions';
import { findTimeConflict } from '@/lib/timeUtils';
import { X, Trash2, CalendarPlus } from 'lucide-react';

interface EditModalProps {
  attraction: Attraction;
  allAttractions: Attraction[];
  onClose: () => void;
  onSaved: (updated: Attraction) => void;
  onDeleted: (id: string) => void;
}

export default function EditModal({ attraction, allAttractions, onClose, onSaved, onDeleted }: EditModalProps) {
  const [form, setForm] = useState({
    name: attraction.name,
    description: attraction.description ?? '',
    category: attraction.category,
    scheduled_date: attraction.scheduled_date ?? '',
    start_time: attraction.start_time ?? '',
    end_time: attraction.end_time ?? '',
    notes: attraction.notes ?? '',
  });
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteAttraction(attraction.id);
    onDeleted(attraction.id);
    onClose();
  };
  const tripDates = generateTripDates();
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (form.scheduled_date && form.start_time) {
      const conflict = findTimeConflict(
        allAttractions,
        form.scheduled_date,
        form.start_time,
        form.end_time || null,
        attraction.id
      );
      if (conflict) {
        setConflictError(`Conflicts with "${conflict.name}"`);
        return;
      }
    }
    setConflictError(null);
    startTransition(async () => {
      const patch = {
        name: form.name.trim(),
        description: form.description || null,
        category: form.category as Category,
        scheduled_date: form.scheduled_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        notes: form.notes || null,
      };
      await updateAttraction(attraction.id, patch);
      onSaved({ ...attraction, ...patch });
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
          <h2 className="font-bold text-gray-900">Edit Attraction</h2>
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
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    name="edit-category"
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
        <div className="px-6 pb-5 space-y-2">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || isDeleting || !form.name.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
          {form.scheduled_date && (
            <a
              href={buildGCalUrl(form.name || attraction.name, form.scheduled_date, form.start_time, form.end_time, form.description)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium transition-colors"
            >
              <CalendarPlus size={14} />
              Add to Google Calendar
            </a>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting || isPending}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting…' : 'Delete attraction'}
          </button>
        </div>
      </div>
    </div>
  );
}
