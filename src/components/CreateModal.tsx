'use client';

import { useState, useTransition } from 'react';
import { Attraction, Category } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ICONS, generateTripDates, formatDateFull } from '@/lib/utils';
import { createAttractionObject } from '@/app/actions';
import { TICKET_IMAGE_EXTENSION_RE, uploadTicketFile } from '@/lib/tickets';
import { minutesToTime, timeToMinutes, DEFAULT_DURATION_MINUTES, findTimeConflict } from '@/lib/timeUtils';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import LocationAutocomplete from './LocationAutocomplete';
import TimeInput from './TimeInput';
import ConfirmDialog from './ConfirmDialog';
import { X, Upload, FileText, WifiOff } from 'lucide-react';

interface CreateModalProps {
  date: string;
  startTime: string;
  allAttractions: Attraction[];
  onClose: () => void;
  onCreated: (attraction: Attraction) => void;
}

export default function CreateModal({ date, startTime, allAttractions, onClose, onCreated }: CreateModalProps) {
  const defaultEndTime = minutesToTime(timeToMinutes(startTime) + DEFAULT_DURATION_MINUTES);

  const initialForm = {
    name: '',
    description: '',
    category: 'other' as Category,
    scheduled_date: date,
    start_time: startTime,
    end_time: defaultEndTime,
    location: '',
  };
  const [form, setForm] = useState(initialForm);
  const [pendingTickets, setPendingTickets] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  const handleClose = () => {
    const hasChanges =
      (Object.keys(initialForm) as (keyof typeof initialForm)[]).some((key) => form[key] !== initialForm[key]) ||
      pendingTickets.length > 0;
    if (hasChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const tripDates = generateTripDates();
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  const handleCreate = () => {
    if (!form.name.trim() || !isOnline) return;
    if (form.scheduled_date && form.start_time) {
      const conflict = findTimeConflict(allAttractions, form.scheduled_date, form.start_time, form.end_time || null);
      if (conflict) {
        setConflictError(`Conflicts with "${conflict.name}"`);
        return;
      }
    }
    setConflictError(null);
    setTicketError(null);
    startTransition(async () => {
      const attraction = await createAttractionObject({
        name: form.name.trim(),
        description: form.description || null,
        category: form.category,
        scheduled_date: form.scheduled_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        notes: null,
        location: form.location.trim() || null,
      });

      let ticketUrls = attraction.ticket_urls;
      if (pendingTickets.length > 0) {
        try {
          const uploaded = await Promise.all(pendingTickets.map((file) => uploadTicketFile(attraction.id, file)));
          ticketUrls = [...ticketUrls, ...uploaded];
        } catch {
          setTicketError('Some tickets failed to upload — you can add them from the event afterward.');
        }
      }

      onCreated({ ...attraction, ticket_urls: ticketUrls });
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">New Attraction</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={17} />
          </button>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
            <WifiOff size={13} className="shrink-0" />
            You&apos;re offline — new attractions can&apos;t be added until you&apos;re back online.
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Schönbrunn Palace"
            />
          </div>

          {/* Day */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Day
            </label>
            <select
              value={form.scheduled_date}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200"
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
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Start time
                </label>
                <TimeInput
                  value={form.start_time}
                  onChange={(v) => { setConflictError(null); setForm((f) => ({ ...f, start_time: v })); }}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  End time
                </label>
                <TimeInput
                  value={form.end_time}
                  onChange={(v) => { setConflictError(null); setForm((f) => ({ ...f, end_time: v })); }}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
            {conflictError && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 font-medium">{conflictError}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <label
                  key={cat}
                  className={[
                    'flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-xs font-medium transition-colors',
                    form.category === cat
                      ? 'border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300',
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

          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Location
            </label>
            <LocationAutocomplete
              value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600"
              placeholder="Address or place name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-300 dark:placeholder-gray-600"
              placeholder="Brief description..."
            />
          </div>

          {/* Tickets */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Tickets
            </label>
            <div className="space-y-1.5">
              {pendingTickets.map((file, i) => {
                const isImage = TICKET_IMAGE_EXTENSION_RE.test(file.name);
                return (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 px-2.5 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0">
                        <FileText size={16} />
                      </div>
                    )}
                    <span className="flex-1 min-w-0 truncate text-xs text-gray-600 dark:text-gray-300">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingTickets((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Remove ticket"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}

              {isOnline && (
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Upload size={14} />
                  Add ticket
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) setPendingTickets((prev) => [...prev, file]);
                    }}
                  />
                </label>
              )}
              {ticketError && (
                <p className="text-xs text-red-500 dark:text-red-400 font-medium">{ticketError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isPending || !form.name.trim() || !isOnline}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {isPending ? 'Adding…' : 'Add to trip'}
          </button>
        </div>
      </div>

      {showDiscardConfirm && (
        <ConfirmDialog
          message="Discard unsaved changes?"
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
}
