'use client';

import { useEffect, useState, useTransition } from 'react';
import { Attraction, Category } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ICONS, generateTripDates, formatDateFull, formatDateShort, getMapsUrl, nextTripDate, timeAgo } from '@/lib/utils';
import { getCityForDate } from '@/lib/trip';
import { createAttractionObject, updateAttraction, deleteAttraction, removeTicketUrl } from '@/app/actions';
import { getEditorName } from '@/lib/editorName';
import { TICKET_IMAGE_EXTENSION_RE, ticketFilename, uploadTicketFile } from '@/lib/tickets';
import { isTicketFileTooLarge, MAX_TICKET_FILE_SIZE_LABEL } from '@/lib/ticketLimits';
import { findTimeConflict } from '@/lib/timeUtils';
import LocationAutocomplete from './LocationAutocomplete';
import TimeInput from './TimeInput';
import ConfirmDialog from './ConfirmDialog';
import { X, Trash2, Save, Copy, Upload, FileText, WifiOff, MapPin, Link2, Check } from 'lucide-react';

interface EditModalProps {
  attraction: Attraction;
  allAttractions: Attraction[];
  onClose: () => void;
  onSaved: (updated: Attraction) => void;
  onDeleted: (deleted: Attraction) => void;
  onDuplicated: (duplicate: Attraction) => void;
  readOnly?: boolean;
}

export default function EditModal({ attraction, allAttractions, onClose, onSaved, onDeleted, onDuplicated, readOnly = false }: EditModalProps) {
  // Legacy unscheduled events (from before the "Unscheduled" option was
  // removed) fall back to the trip's first day rather than an empty value,
  // since every event now needs a real scheduled date.
  const initialForm = {
    name: attraction.name,
    description: attraction.description ?? '',
    category: attraction.category,
    scheduled_date: attraction.scheduled_date ?? generateTripDates()[0],
    start_time: attraction.start_time ?? '',
    end_time: attraction.end_time ?? '',
    notes: attraction.notes ?? '',
    location: attraction.location ?? '',
    departure_timezone: attraction.departure_timezone,
    arrival_timezone: attraction.arrival_timezone,
  };
  const [form, setForm] = useState(initialForm);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [tickets, setTickets] = useState(attraction.ticket_urls ?? []);
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicateSuccess, setDuplicateSuccess] = useState<string | null>(null);
  const [showDuplicatePicker, setShowDuplicatePicker] = useState(false);
  const [duplicateDates, setDuplicateDates] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  // Based on the saved attraction (not the in-progress form edit) since lat/lng
  // only exist once the location has actually been geocoded on a prior save.
  const mapsUrl = getMapsUrl(attraction);

  // Copies a link that opens straight to this event (?event=<id>) — handled
  // in CalendarBoard, which reads it on mount, jumps to the right day, and
  // opens this same modal. Lets someone text "check this out" instead of
  // "open the app, go to Tuesday, find the dinner reservation."
  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?event=${attraction.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — no real
      // fallback worth building for a family trip app; worst case the
      // button just doesn't visibly confirm anything.
    }
  };

  const handleClose = () => {
    const hasChanges = (Object.keys(initialForm) as (keyof typeof initialForm)[]).some(
      (key) => form[key] !== initialForm[key]
    );
    if (hasChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const deleted = await deleteAttraction(attraction.id);
      onDeleted(deleted);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete — try again.");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!duplicateSuccess) return;
    const t = setTimeout(() => setDuplicateSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [duplicateSuccess]);

  // Opens the inline "duplicate to..." picker, preselecting just the next
  // trip day (same reasoning as the required day/start/end fields: an exact
  // same-day, same-time duplicate would render stacked directly on top of
  // the original) — but lets you check off any number of additional days,
  // for things like a recurring breakfast across the whole trip.
  const openDuplicatePicker = () => {
    setDuplicateError(null);
    setDuplicateSuccess(null);
    setDuplicateDates([nextTripDate(attraction.scheduled_date ?? generateTripDates()[0])]);
    setShowDuplicatePicker(true);
  };

  const toggleDuplicateDate = (date: string) => {
    setDuplicateDates((prev) => (prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]));
  };

  // Duplicates the last-saved event (not any unsaved edits in the form) to
  // every checked day, one at a time so each gets its own conflict check.
  // A day that conflicts is skipped rather than aborting the whole batch —
  // the picker stays open afterward if anything was skipped so it's obvious
  // which days still need attention, and stays open either way so
  // duplicating in a few more days later doesn't require reopening it.
  const handleDuplicate = () => {
    if (duplicateDates.length === 0) return;
    setDuplicateError(null);
    setDuplicateSuccess(null);
    setIsDuplicating(true);
    startTransition(async () => {
      const created: Attraction[] = [];
      const skipped: { date: string; reason: string }[] = [];

      for (const targetDate of duplicateDates) {
        if (attraction.start_time) {
          const conflict = findTimeConflict(allAttractions, targetDate, attraction.start_time, attraction.end_time);
          if (conflict) {
            skipped.push({ date: targetDate, reason: `conflicts with "${conflict.name}"` });
            continue;
          }
        }
        try {
          const duplicate = await createAttractionObject(
            {
              name: `${attraction.name} (copy)`,
              description: attraction.description,
              category: attraction.category,
              scheduled_date: targetDate,
              start_time: attraction.start_time,
              end_time: attraction.end_time,
              notes: attraction.notes,
              location: attraction.location,
              departure_timezone: attraction.departure_timezone,
              arrival_timezone: attraction.arrival_timezone,
            },
            getEditorName()
          );
          created.push(duplicate);
        } catch (err) {
          skipped.push({ date: targetDate, reason: err instanceof Error ? err.message : 'save failed' });
        }
      }

      created.forEach((duplicate) => onDuplicated(duplicate));

      if (created.length > 0) {
        const dayList = created
          .map((d) => d.scheduled_date)
          .filter((d): d is string => !!d)
          .map((d) => formatDateShort(d))
          .join(', ');
        setDuplicateSuccess(
          skipped.length > 0
            ? `Duplicated to ${created.length} of ${duplicateDates.length} days (${dayList}).`
            : `Duplicated to ${dayList}.`
        );
      }
      if (skipped.length > 0) {
        setDuplicateError(
          skipped.length === 1
            ? `Skipped ${formatDateShort(skipped[0].date)} — ${skipped[0].reason}.`
            : `Skipped ${skipped.length} days due to conflicts.`
        );
      } else {
        setShowDuplicatePicker(false);
      }
      setIsDuplicating(false);
    });
  };

  const handleTicketUpload = async (file: File) => {
    setTicketError(null);
    setUploadingTicket(true);
    try {
      const url = await uploadTicketFile(attraction.id, file);
      setTickets((prev) => [...prev, url]);
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Upload failed — try again.');
    } finally {
      setUploadingTicket(false);
    }
  };

  const handleTicketDelete = async (url: string) => {
    setTicketError(null);
    setTickets((prev) => prev.filter((u) => u !== url));
    try {
      await removeTicketUrl(attraction.id, url);
    } catch (err) {
      // Roll back the optimistic removal so the ticket doesn't just vanish
      // from view while it's still sitting in the database.
      setTickets((prev) => (prev.includes(url) ? prev : [...prev, url]));
      setTicketError(err instanceof Error ? err.message : "Couldn't remove ticket — try again.");
    }
  };
  const tripDates = generateTripDates();
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (!form.scheduled_date || !form.start_time || !form.end_time) {
      setConflictError('Day, start time, and end time are all required.');
      return;
    }
    const conflict = findTimeConflict(
      allAttractions,
      form.scheduled_date,
      form.start_time,
      form.end_time,
      attraction.id
    );
    if (conflict) {
      setConflictError(`Conflicts with "${conflict.name}"`);
      return;
    }
    setConflictError(null);
    setSaveError(null);
    startTransition(async () => {
      const patch: Partial<Attraction> = {
        name: form.name.trim(),
        description: form.description || null,
        category: form.category as Category,
        scheduled_date: form.scheduled_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        notes: form.notes || null,
        departure_timezone: form.departure_timezone,
        arrival_timezone: form.arrival_timezone,
      };
      // Only send location when it actually changed, so the server doesn't
      // re-geocode on every save (e.g. just moving the time).
      const trimmedLocation = form.location.trim() || null;
      if (trimmedLocation !== attraction.location) {
        patch.location = trimmedLocation;
      }
      try {
        const editedBy = getEditorName();
        await updateAttraction(attraction.id, patch, editedBy);
        onSaved({ ...attraction, ...patch, edited_by: editedBy, updated_at: new Date().toISOString() });
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Couldn't save — try again.");
      }
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
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Edit Event</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyLink}
              title="Copy a link to this event"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {linkCopied ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} />}
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {readOnly && (
          <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
            <WifiOff size={13} className="shrink-0" />
            You&apos;re offline — read-only until you&apos;re back online.
          </div>
        )}

        {attraction.edited_by && (
          <div className="px-6 pt-3 text-[11px] text-gray-400 dark:text-gray-500">
            Last edited by <span className="font-medium text-gray-500 dark:text-gray-400">{attraction.edited_by}</span> · {timeAgo(new Date(attraction.updated_at).getTime())}
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Name + actions */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={readOnly}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={isPending || isDeleting || !form.name.trim() || readOnly || !form.scheduled_date || !form.start_time || !form.end_time}
              title="Save changes"
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Save size={16} />
              {isPending && !isDuplicating ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => (showDuplicatePicker ? setShowDuplicatePicker(false) : openDuplicatePicker())}
              disabled={isPending || isDeleting || readOnly}
              title="Duplicate to another day"
              className={[
                'shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40',
                showDuplicatePicker
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300',
              ].join(' ')}
            >
              <Copy size={18} />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || isPending || readOnly}
              title="Delete event"
              className="shrink-0 p-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-colors disabled:opacity-40"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {showDuplicatePicker && (
            <div className="-mt-2 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Duplicate to{duplicateDates.length > 0 ? ` (${duplicateDates.length})` : ''}
                </span>
                <button
                  onClick={() => setShowDuplicatePicker(false)}
                  title="Cancel"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {generateTripDates().map((d) => {
                  const selected = duplicateDates.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDuplicateDate(d)}
                      className={[
                        'px-1.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors',
                        selected
                          ? 'border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                      ].join(' ')}
                    >
                      {formatDateShort(d)}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleDuplicate}
                disabled={isPending || duplicateDates.length === 0}
                className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {isPending && isDuplicating
                  ? 'Duplicating…'
                  : `Duplicate to ${duplicateDates.length} day${duplicateDates.length === 1 ? '' : 's'}`}
              </button>
            </div>
          )}

          {(saveError || deleteError || duplicateError) && (
            <p className="-mt-2 text-xs text-red-500 dark:text-red-400 font-medium">
              {saveError || deleteError || duplicateError}
            </p>
          )}
          {duplicateSuccess && (
            <p className="-mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">{duplicateSuccess}</p>
          )}

          {/* Day */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Day <span className="text-red-400">*</span>
            </label>
            <select
              value={form.scheduled_date}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
              disabled={readOnly}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tripDates.map((d) => (
                <option key={d} value={d}>
                  {formatDateFull(d)} — {getCityForDate(d)}
                </option>
              ))}
            </select>
          </div>

          {/* Times */}
          <div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Start time <span className="text-red-400">*</span>
                </label>
                <TimeInput
                  value={form.start_time}
                  onChange={(v) => { setConflictError(null); setForm((f) => ({ ...f, start_time: v })); }}
                  disabled={readOnly}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  End time <span className="text-red-400">*</span>
                </label>
                <TimeInput
                  value={form.end_time}
                  onChange={(v) => { setConflictError(null); setForm((f) => ({ ...f, end_time: v })); }}
                  disabled={readOnly}
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
                    'flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-medium transition-colors',
                    readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    form.category === cat
                      ? 'border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="edit-category"
                    value={cat}
                    checked={form.category === cat}
                    onChange={() => setForm((f) => ({ ...f, category: cat }))}
                    disabled={readOnly}
                    className="sr-only"
                  />
                  {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>
            {form.category === 'flights' && (
              <div className="mt-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-600 dark:text-gray-300 flex flex-col gap-1.5">
                <label className={['flex items-center gap-2', readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'].join(' ')}>
                  <input
                    type="checkbox"
                    checked={form.departure_timezone === 'eastern'}
                    onChange={(e) => setForm((f) => ({ ...f, departure_timezone: e.target.checked ? 'eastern' : 'vienna' }))}
                    disabled={readOnly}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  Departure time is in Eastern (ET)
                </label>
                <label className={['flex items-center gap-2', readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'].join(' ')}>
                  <input
                    type="checkbox"
                    checked={form.arrival_timezone === 'eastern'}
                    onChange={(e) => setForm((f) => ({ ...f, arrival_timezone: e.target.checked ? 'eastern' : 'vienna' }))}
                    disabled={readOnly}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  Arrival time is in Eastern (ET)
                </label>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Location
              </label>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <MapPin size={11} />
                  Open in Maps
                </a>
              )}
            </div>
            <LocationAutocomplete
              value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
              disabled={readOnly}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600"
              placeholder="Address or place name (Vienna, Salzburg, or Prague)"
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
              rows={3}
              disabled={readOnly}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-300 dark:placeholder-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Tickets */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Tickets
            </label>
            <div className="space-y-1.5">
              {tickets.map((url) => {
                const filename = ticketFilename(url);
                const isImage = TICKET_IMAGE_EXTENSION_RE.test(filename);
                return (
                  <div
                    key={url}
                    className="flex items-center gap-2 px-2.5 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800"
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={filename}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <FileText size={16} />
                        </div>
                      )}
                    </a>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 truncate text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {filename}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleTicketDelete(url)}
                      disabled={readOnly}
                      className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:cursor-not-allowed disabled:hover:text-gray-400"
                      title="Remove ticket"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}

              {!readOnly && (
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Upload size={14} />
                  {uploadingTicket ? 'Uploading…' : 'Upload ticket'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploadingTicket}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      if (isTicketFileTooLarge(file)) {
                        setTicketError(`"${file.name}" is over the ${MAX_TICKET_FILE_SIZE_LABEL} limit.`);
                        return;
                      }
                      handleTicketUpload(file);
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
