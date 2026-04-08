import { vi } from 'vitest';

export const frontendLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  getLogs: vi.fn(() => []),
  clearLogs: vi.fn(),
};
