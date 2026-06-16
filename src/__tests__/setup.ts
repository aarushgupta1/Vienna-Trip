import { vi } from 'vitest';

// Mock next/cache so server actions can be imported without a Next.js runtime
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
