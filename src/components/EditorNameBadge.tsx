'use client';

import { useEffect, useState } from 'react';
import { getEditorName, setEditorName } from '@/lib/editorName';
import { User } from 'lucide-react';

// A tiny, no-auth "who am I" label — stored per-device, shown so edits made
// from this browser can be attributed as "last edited by ___" elsewhere in
// the app. Nudges once on first load if nothing's set yet, but is easy to
// skip and never nags beyond that.
export default function EditorNameBadge() {
  const [name, setName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const stored = getEditorName();
    setName(stored);
    if (!stored) setIsEditing(true);
  }, []);

  const openEditor = () => {
    setDraft(name ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    setEditorName(draft);
    setName(draft.trim() || null);
    setIsEditing(false);
  };

  return (
    <>
      <button
        onClick={openEditor}
        title={name ? 'Change your name' : "What should we call you? Shown on your edits."}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <User size={12} />
        {name ?? 'Add your name'}
      </button>

      {isEditing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setIsEditing(false); }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">What should we call you?</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Shown on the calendar as &quot;last edited by ___&quot; so everyone can tell who changed what.
            </p>
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Mom, Dad, Alex"
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-3.5 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
