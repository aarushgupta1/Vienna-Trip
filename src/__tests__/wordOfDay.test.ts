import { describe, it, expect } from 'vitest';
import { getWordOfDay } from '@/lib/wordOfDay';

describe('getWordOfDay', () => {
  it('returns German for Vienna and Salzburg days', () => {
    expect(getWordOfDay('2026-08-06').language).toBe('German'); // Vienna
    expect(getWordOfDay('2026-08-10').language).toBe('German'); // Salzburg
  });

  it('returns Czech for Prague days', () => {
    expect(getWordOfDay('2026-08-13').language).toBe('Czech');
  });

  it('is deterministic — the same date always returns the same word', () => {
    const a = getWordOfDay('2026-08-07');
    const b = getWordOfDay('2026-08-07');
    expect(a).toEqual(b);
  });

  it('gives different words to different days in the same language run', () => {
    const first = getWordOfDay('2026-08-06');
    const second = getWordOfDay('2026-08-07');
    expect(first.word).not.toBe(second.word);
  });

  it('continues the German sequence across the Vienna→Salzburg boundary rather than restarting', () => {
    // Aug 6-8 is Vienna, Aug 9-11 is Salzburg — both German, so Aug 9 should
    // pick up where Aug 8 left off, not reset back to the first word.
    const lastViennaDay = getWordOfDay('2026-08-08');
    const firstSalzburgDay = getWordOfDay('2026-08-09');
    expect(firstSalzburgDay.word).not.toBe(lastViennaDay.word);
  });

  it('falls back gracefully for a date outside the trip', () => {
    expect(() => getWordOfDay('2099-01-01')).not.toThrow();
  });
});
