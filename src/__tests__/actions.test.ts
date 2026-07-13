import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Attraction } from '@/lib/types';

// ---------------------------------------------------------------------------
// Proxy-based builder mock: every method returns `this` for chaining,
// and the object is thenable so `await chain` resolves to `mockResult`.
// ---------------------------------------------------------------------------
let mockResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeBuilder() {
  const handler: ProxyHandler<object> = {
    get(_, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown) =>
          Promise.resolve(mockResult).then(resolve);
      }
      return () => proxy;
    },
  };
  const proxy = new Proxy({}, handler);
  return proxy;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => makeBuilder()),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  })),
}));

// next/cache is mocked globally in setup.ts

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SAMPLE: Attraction = {
  id: 'abc-123',
  name: 'Belvedere Palace',
  description: 'Baroque palace with Klimt paintings',
  category: 'museum',
  scheduled_date: '2026-08-07',
  start_time: '10:00',
  end_time: '12:00',
  notes: null,
  location: null,
  lat: null,
  lng: null,
  created_at: '2026-01-01T00:00:00Z',
};

function setEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}

function clearEnv() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// ---------------------------------------------------------------------------
describe('getAttractions', () => {
  afterEach(clearEnv);

  it('returns an empty array when Supabase is not configured', async () => {
    clearEnv();
    const { getAttractions } = await import('@/app/actions');
    await expect(getAttractions()).resolves.toEqual([]);
  });

  it('returns attractions from Supabase when configured', async () => {
    setEnv();
    mockResult = { data: [SAMPLE], error: null };
    const { getAttractions } = await import('@/app/actions');
    const result = await getAttractions();
    expect(result).toEqual([SAMPLE]);
  });

  it('throws when Supabase returns an error', async () => {
    setEnv();
    mockResult = { data: null, error: { message: 'connection refused' } };
    const { getAttractions } = await import('@/app/actions');
    await expect(getAttractions()).rejects.toThrow('connection refused');
  });
});

// ---------------------------------------------------------------------------
describe('createAttractionObject', () => {
  beforeEach(setEnv);
  afterEach(clearEnv);

  it('returns the newly created attraction', async () => {
    mockResult = { data: SAMPLE, error: null };
    const { createAttractionObject } = await import('@/app/actions');
    const result = await createAttractionObject({
      name: SAMPLE.name,
      description: SAMPLE.description,
      category: SAMPLE.category,
      scheduled_date: SAMPLE.scheduled_date,
      start_time: SAMPLE.start_time,
      end_time: SAMPLE.end_time,
      notes: SAMPLE.notes,
      location: SAMPLE.location,
    });
    expect(result).toEqual(SAMPLE);
  });

  it('throws when Supabase returns an error', async () => {
    mockResult = { data: null, error: { message: 'unique constraint violated' } };
    const { createAttractionObject } = await import('@/app/actions');
    await expect(
      createAttractionObject({
        name: 'x',
        description: null,
        category: 'other',
        scheduled_date: null,
        start_time: null,
        end_time: null,
        notes: null,
        location: null,
      })
    ).rejects.toThrow('unique constraint violated');
  });
});

// ---------------------------------------------------------------------------
describe('updateAttraction', () => {
  beforeEach(setEnv);
  afterEach(clearEnv);

  it('resolves without error on success', async () => {
    mockResult = { data: null, error: null };
    const { updateAttraction } = await import('@/app/actions');
    await expect(
      updateAttraction('abc-123', { name: 'Updated Name' })
    ).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockResult = { data: null, error: { message: 'row not found' } };
    const { updateAttraction } = await import('@/app/actions');
    await expect(updateAttraction('bad-id', { name: 'x' })).rejects.toThrow('row not found');
  });
});

// ---------------------------------------------------------------------------
describe('deleteAttraction', () => {
  beforeEach(setEnv);
  afterEach(clearEnv);

  it('resolves without error on success', async () => {
    mockResult = { data: null, error: null };
    const { deleteAttraction } = await import('@/app/actions');
    await expect(deleteAttraction('abc-123')).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    mockResult = { data: null, error: { message: 'permission denied' } };
    const { deleteAttraction } = await import('@/app/actions');
    await expect(deleteAttraction('abc-123')).rejects.toThrow('permission denied');
  });
});
