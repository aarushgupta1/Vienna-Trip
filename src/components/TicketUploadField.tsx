'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';

const TICKET_IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|heic|heif)$/i;

export default function TicketUploadField() {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // The native input's FileList is the source of truth for form submission,
  // so every state change has to be mirrored into it via DataTransfer.
  const syncFiles = (next: File[]) => {
    const dt = new DataTransfer();
    next.forEach((file) => dt.items.add(file));
    if (inputRef.current) inputRef.current.files = dt.files;
    setFiles(next);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
        Tickets
      </label>
      <div className="space-y-1.5">
        {files.map((file, i) => {
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
                onClick={() => syncFiles(files.filter((_, idx) => idx !== i))}
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
          Add ticket
          <input
            ref={inputRef}
            type="file"
            name="tickets"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length) syncFiles([...files, ...picked]);
            }}
          />
        </label>
      </div>
    </div>
  );
}
