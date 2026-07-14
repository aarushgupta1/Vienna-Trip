'use client';

import { useState, useTransition } from 'react';
import { Attraction, Category } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_ICONS, generateTripDates, formatDateFull } from '@/lib/utils';
import { updateAttraction, deleteAttraction, addTicketUrl, removeTicketUrl } from '@/app/actions';
import { getSupabaseClient } from '@/lib/supabase';
import { findTimeConflict } from '@/lib/timeUtils';
import LocationAutocomplete from './LocationAutocomplete';
import TimeInput from './TimeInput';
import ConfirmDialog from './ConfirmDialog';
import { X, Trash2, Save, Upload, FileText } from 'lucide-react';

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|heic|heif)$/i;

function ticketFilename(url: string): string {
  const last = url.split('/').pop() ?? 'Ticket';
  const withoutTimestampPrefix = last.replace(/^\d+-/, '');
  try {
    return decodeURIComponent(withoutTimestampPrefix);
  } catch {
    return withoutTimestampPrefix;
  }
}

interface EditModalProps {
  attraction: Attraction;
  allAttractions: Attraction[];
  onClose: () => void;
  onSaved: (updated: Attraction) => void;
  onDeleted: (id: string) => void;
}

export default function EditModal({ attraction, allAttractions, onClose, onSaved, onDeleted }: EditModalProps) {
  const initialForm = {
    name: attraction.name,
    description: attraction.description ?? '',
    category: attraction.category,
    scheduled_date: attraction.scheduled_date ?? '',
    start_time: attraction.start_time ?? '',
    end_time: attraction.end_time ?? '',
    notes: attraction.notes ?? '',
    location: attraction.location ?? '',
  };
  const [form, setForm] = useState(initialForm);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [tickets, setTickets] = useState(attraction.ticket_urls ?? []);
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

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
    setIsDeleting(true);
    await deleteAttraction(attraction.id);
    onDeleted(attraction.id);
    onClose();
  };

  const handleTicketUpload = async (file: File) => {
    setTicketError(null);
    const client = getSupabaseClient();
    if (!client) {
      setTicketError('Storage isn\'t configured.');
      return;
    }
    setUploadingTicket(true);
    try {
      const path = `${attraction.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await client.storage.from('tickets').upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = client.storage.from('tickets').getPublicUrl(path);
      await addTicketUrl(attraction.id, data.publicUrl);
      setTickets((prev) => [...prev, data.publicUrl]);
    } catch {
      setTicketError('Upload failed — try again.');
    } finally {
      setUploadingTicket(false);
    }
  };

  const handleTicketDelete = async (url: string) => {
    setTickets((prev) => prev.filter((u) => u !== url));
    await removeTicketUrl(attraction.id, url);
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
      const patch: Partial<Attraction> = {
        name: form.name.trim(),
        description: form.description || null,
        category: form.category as Category,
        scheduled_date: form.scheduled_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        notes: form.notes || null,
      };
      // Only send location when it actually changed, so the server doesn't
      // re-geocode on every save (e.g. just moving the time).
      const trimmedLocation = form.location.trim() || null;
      if (trimmedLocation !== attraction.location) {
        patch.location = trimmedLocation;
      }
      await updateAttraction(attraction.id, patch);
      onSaved({ ...attraction, ...patch });
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
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Edit Attraction</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={17} />
          </button>
        </div>

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
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={isPending || isDeleting || !form.name.trim()}
              title="Save changes"
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Save size={16} />
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              title="Delete attraction"
              className="shrink-0 p-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-colors disabled:opacity-40"
            >
              <Trash2 size={18} />
            </button>
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
              rows={3}
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
              {tickets.map((url) => {
                const filename = ticketFilename(url);
                const isImage = IMAGE_EXTENSION_RE.test(filename);
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
                      className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Remove ticket"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}

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
                    if (file) handleTicketUpload(file);
                  }}
                />
              </label>
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
