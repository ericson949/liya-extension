import { beforeEach } from 'vitest';
import { createMockChrome } from './mocks/chrome.mock';

const mockChrome = createMockChrome();

(globalThis as any).chrome = {
  storage: mockChrome.storage,
  alarms: mockChrome.alarms,
  runtime: mockChrome.runtime,
};

(globalThis as any).browser = {
  storage: mockChrome.storage,
  alarms: mockChrome.alarms,
  runtime: mockChrome.runtime,
};

export { mockChrome };

beforeEach(() => {
  mockChrome.resetAll();
});
