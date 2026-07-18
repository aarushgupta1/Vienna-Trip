'use client';

import { useState, useTransition } from 'react';
import { Hotel, Currency } from '@/lib/types';
import { createHotel, updateHotel, deleteHotel } from '@/app/actions';
import { getMapsUrl } from '@/lib/utils';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import LocationAutocomplete from './LocationAutocomplete';
import ConfirmDialog from './ConfirmDialog';
import { X, Trash2, Save, MapPin, WifiOff } from 'lucide-react';

interface HotelModalProps {
  hotel?: Hotel;
  onClose: () => void;
  onSaved: (hotel: Hotel) => void;
  onDeleted?: (id: string) => void;
}

const CURRENCY_OPTIONS: Currency[] = ['EUR', 'USD'];
const CURRENCY_SYMBOLS: Record<Currency, string> = { EUR: '€', USD: '$' };

function nightsBetween(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null;
  const ms = new Date(checkOut + 'T00:00:00Z').getTime() - new Date(checkIn + 'T00:00:00Z').getTime();
  const n = Math.round(ms / (1000 * 60 * 60 * 24));
  return n > 0 ? n : null;
}

export default function HotelModal({ hotel, onClose, onSaved, onDeleted }: HotelModalProps) {
  const isEditing = !!hotel;
  const isOnline = useOnlineStatus();

  const initialForm = {
    name: hotel?.name ?? '',
    location: hotel?.location ?? '',
    check_in: hotel?.check_in ?? '',
    check_out: hotel?.check_out ?? '',
    price: hotel?.price != null ? String(hotel.price) : '',
    currency: hotel?.currency ?? ('EUR' as Currency),
    confirmation_number: hotel?.confirmation_number ?? '',
    notes: hotel?.notes ?? '',
  };
  const [form, setForm] = useState(initialForm);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const mapsUrl = hotel ? getMapsUrl(hotel) : null;
  const nights = nightsBetween(form.check_in, form.check_out);

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

  const handleSave = () => {
    if (!form.name.trim() || !isOnline) return;
    setSaveError(null);

    const trimmedLocation = form.location.trim() || null;
    const price = form.price.trim() ? Number(form.price) : null;
    const checkIn = form.check_in || null;
    const checkOut = form.check_out || null;
    const confirmationNumber = form.confirmation_number.trim() || null;
    const notes = form.notes.trim() || null;

    startTransition(async () => {
      try {
        if (hotel) {
          const patch: Partial<Hotel> = {
            name: form.name.trim(),
            check_in: checkIn,
            check_out: checkOut,
            price,
            currency: form.currency,
            confirmation_number: confirmationNumber,
            notes,
          };
          // Only send location when it actually changed, so the server
          // doesn't re-geocode on every save (same reasoning as attractions).
          if (trimmedLocation !== hotel.location) patch.location = trimmedLocation;
          await updateHotel(hotel.id, patch);
          onSaved({ ...hotel, ...patch });
        } else {
          const created = await createHotel({
            name: form.name.trim(),
            location: trimmedLocation,
            check_in: checkIn,
            check_out: checkOut,
            price,
            currency: form.currency,
            confirmation_number: confirmationNumber,
            notes,
          });
          onSaved(created);
        }
        onClose();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Couldn't save — try again.");
      }
    });
  };

  const handleDelete = async () => {
    if (!hotel) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteHotel(hotel.id);
      onDeleted?.(hotel.id);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete — try again.");
      setIsDeleting(false);
    }
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
          <h2 className="font-bold text-gray-900 dark:text-gray-100">{isEditing ? 'Edit Hotel' : 'Add Hotel'}</h2>
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
            You&apos;re offline — read-only until you&apos;re back online.
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Hotel Name <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!isOnline}
              placeholder="e.g. Hotel Sacher Wien"
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
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
              disabled={!isOnline}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600"
              placeholder="Hotel address"
            />
          </div>

          {/* Check-in / Check-out */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Check-in
              </label>
              <input
                type="date"
                value={form.check_in}
                onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value }))}
                disabled={!isOnline}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Check-out
              </label>
              <input
                type="date"
                value={form.check_out}
                onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))}
                disabled={!isOnline}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          {/* Price box */}
          <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4">
            <label className="block text-[11px] font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide mb-2">
              Price
            </label>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-violet-200 dark:border-violet-800 overflow-hidden text-xs font-semibold shrink-0">
                {CURRENCY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, currency: c }))}
                    disabled={!isOnline}
                    className={
                      form.currency === c
                        ? 'px-3 py-2.5 bg-violet-600 text-white'
                        : 'px-3 py-2.5 bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors'
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400 dark:text-violet-500 font-bold pointer-events-none">
                  {CURRENCY_SYMBOLS[form.currency]}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  disabled={!isOnline}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 border border-violet-200 dark:border-violet-800 rounded-lg text-lg font-bold bg-white dark:bg-gray-900 text-violet-700 dark:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-violet-200 dark:placeholder-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
            {nights && form.price.trim() && !isNaN(Number(form.price)) && (
              <p className="mt-2 text-xs text-violet-500 dark:text-violet-400">
                ≈ {CURRENCY_SYMBOLS[form.currency]}{(Number(form.price) / nights).toFixed(2)} / night · {nights} night{nights === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {/* Confirmation number */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Confirmation Number
            </label>
            <input
              type="text"
              value={form.confirmation_number}
              onChange={(e) => setForm((f) => ({ ...f, confirmation_number: e.target.value }))}
              disabled={!isOnline}
              placeholder="Booking confirmation #"
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              disabled={!isOnline}
              placeholder="Room type, breakfast included, front desk hours…"
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-300 dark:placeholder-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {(saveError || deleteError) && (
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">{saveError || deleteError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={isDeleting || isPending || !isOnline}
              title="Delete hotel"
              className="shrink-0 p-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-colors disabled:opacity-40"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || isDeleting || !form.name.trim() || !isOnline}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Save size={16} />
            {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Hotel'}
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
