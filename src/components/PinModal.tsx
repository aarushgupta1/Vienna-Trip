'use client';

import { useState, useTransition } from 'react';
import { LogisticsPin, LogisticsPinCategory } from '@/lib/types';
import { createPin, updatePin, deletePin } from '@/app/logistics/actions';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { PIN_CATEGORY_META } from './PinCard';
import { X, Trash2, WifiOff } from 'lucide-react';

const CATEGORIES = Object.keys(PIN_CATEGORY_META) as LogisticsPinCategory[];

interface PinModalProps {
  pin?: LogisticsPin;
  onClose: () => void;
  onSaved: (pin: LogisticsPin) => void;
  onDeleted?: (id: string) => void;
}

export default function PinModal({ pin, onClose, onSaved, onDeleted }: PinModalProps) {
  const isEditing = !!pin;

  const [form, setForm] = useState({
    category: pin?.category ?? ('flights' as LogisticsPinCategory),
    title: pin?.title ?? '',
    content: pin?.content ?? '',
  });
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  const handleSave = () => {
    if (!form.title.trim() || !isOnline) return;
    setError(null);
    startTransition(async () => {
      try {
        if (isEditing) {
          await updatePin(pin.id, {
            category: form.category,
            title: form.title.trim(),
            content: form.content,
          });
          onSaved({ ...pin, category: form.category, title: form.title.trim(), content: form.content });
        } else {
          const created = await createPin({
            category: form.category,
            title: form.title.trim(),
            content: form.content,
          });
          onSaved(created);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save — try again.");
      }
    });
  };

  const handleDelete = async () => {
    if (!pin || !isOnline) return;
    setError(null);
    setIsDeleting(true);
    try {
      await deletePin(pin.id);
      onDeleted?.(pin.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete — try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">{isEditing ? 'Edit Pin' : 'New Pin'}</h2>
          <button
            onClick={onClose}
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

        <div className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((cat) => {
                const meta = PIN_CATEGORY_META[cat];
                return (
                  <label
                    key={cat}
                    className={[
                      'flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-medium transition-colors',
                      isOnline ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                      form.category === cat
                        ? `${meta.bg} ${meta.border} ${meta.text}`
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="pin-category"
                      value={cat}
                      checked={form.category === cat}
                      onChange={() => setForm((f) => ({ ...f, category: cat }))}
                      disabled={!isOnline}
                      className="sr-only"
                    />
                    {meta.icon} {meta.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Vienna Airport → Hotel transfer"
              disabled={!isOnline}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Details
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={5}
              placeholder="Flight numbers, confirmation codes, addresses, links…"
              disabled={!isOnline}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-300 dark:placeholder-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div className="px-6 pb-5 space-y-2">
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || isDeleting || !form.title.trim() || !isOnline}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Pin'}
            </button>
          </div>
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={isDeleting || isPending || !isOnline}
              className="flex w-full items-center justify-center gap-2 px-4 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} />
              {isDeleting ? 'Deleting…' : 'Delete pin'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
