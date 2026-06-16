'use client';

import { useState, useTransition } from 'react';
import { LogisticsPin, LogisticsPinCategory } from '@/lib/types';
import { createPin, updatePin, deletePin } from '@/app/logistics/actions';
import { PIN_CATEGORY_META } from './PinCard';
import { X, Trash2 } from 'lucide-react';

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

  const handleSave = () => {
    if (!form.title.trim()) return;
    startTransition(async () => {
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
    });
  };

  const handleDelete = async () => {
    if (!pin) return;
    setIsDeleting(true);
    await deletePin(pin.id);
    onDeleted?.(pin.id);
    onClose();
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-gray-900">{isEditing ? 'Edit Pin' : 'New Pin'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors rounded-full p-1 hover:bg-gray-100"
          >
            <X size={17} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((cat) => {
                const meta = PIN_CATEGORY_META[cat];
                return (
                  <label
                    key={cat}
                    className={[
                      'flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-xs font-medium transition-colors',
                      form.category === cat
                        ? `${meta.bg} ${meta.border} ${meta.text}`
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="pin-category"
                      value={cat}
                      checked={form.category === cat}
                      onChange={() => setForm((f) => ({ ...f, category: cat }))}
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
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Vienna Airport → Hotel transfer"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Details
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={5}
              placeholder="Flight numbers, confirmation codes, addresses, links…"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-300"
            />
          </div>
        </div>

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
              disabled={isPending || isDeleting || !form.title.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Pin'}
            </button>
          </div>
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="flex w-full items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
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
