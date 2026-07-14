'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { parseTimeInput } from '@/lib/timeUtils';

interface TimeInputProps {
  name?: string;
  value?: string; // "HH:MM", 24-hour — controlled
  defaultValue?: string; // for uncontrolled/native-form usage
  onChange?: (value: string) => void; // receives "HH:MM" or ''
  placeholder?: string;
  className?: string;
}

const STEP_MINUTES = 15;

const TIME_OPTIONS = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => {
  const m = i * STEP_MINUTES;
  const value = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { value, label: formatTime(value) };
});

export default function TimeInput({ name, value, defaultValue, onChange, placeholder, className }: TimeInputProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const storedValue = isControlled ? value! : internalValue;

  const [text, setText] = useState(storedValue ? formatTime(storedValue) : '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the displayed text in sync when the underlying value changes from outside
  // (e.g. another field resets it), but not while the user is actively typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(storedValue ? formatTime(storedValue) : '');
    }
  }, [storedValue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setText(storedValue ? formatTime(storedValue) : '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [storedValue]);

  const commit = (v: string) => {
    if (isControlled) onChange?.(v);
    else setInternalValue(v);
  };

  const handleBlur = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      commit('');
      return;
    }
    const parsed = parseTimeInput(trimmed);
    if (parsed) {
      commit(parsed);
      setText(formatTime(parsed));
    } else {
      setText(storedValue ? formatTime(storedValue) : '');
    }
  };

  const selectOption = (v: string) => {
    commit(v);
    setText(formatTime(v));
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div
      ref={containerRef}
      onClick={() => inputRef.current?.focus()}
      className={[className, 'relative flex items-center gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-blue-500'].filter(Boolean).join(' ')}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { handleBlur(); setOpen(false); inputRef.current?.blur(); }
          if (e.key === 'Escape') { setText(storedValue ? formatTime(storedValue) : ''); setOpen(false); inputRef.current?.blur(); }
        }}
        placeholder={placeholder ?? '--:--'}
        className="w-full min-w-0 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-600"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); inputRef.current?.focus(); }}
        className="shrink-0 opacity-40 hover:opacity-80 transition-opacity"
        aria-label="Choose a time"
      >
        <Clock size={14} />
      </button>
      {name && <input type="hidden" name={name} value={storedValue} />}
      {open && (
        <ul className="absolute z-30 right-0 top-full mt-1 w-32 max-h-56 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1">
          {TIME_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => selectOption(opt.value)}
                className={[
                  'w-full text-left px-3 py-1.5 text-sm transition-colors',
                  opt.value === storedValue
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700',
                ].join(' ')}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
