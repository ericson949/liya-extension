import { beforeEach } from 'vitest';
import { createMockChrome } from './mocks/chrome.mock';

const mockChrome = createMockChrome();

(globalThis as any).chrome = {
  storage: mockChrome.storage,
  alarms: mockChrome.alarms,
  runtime: mockChrome.runtime,
  identity: mockChrome.identity,
};

(globalThis as any).browser = {
  storage: mockChrome.storage,
  alarms: mockChrome.alarms,
  runtime: mockChrome.runtime,
  identity: mockChrome.identity,
};

export { mockChrome };

beforeEach(() => {
  mockChrome.resetAll();
});
