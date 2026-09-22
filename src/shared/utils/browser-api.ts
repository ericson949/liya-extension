/**
 * Cross-browser compatibility layer for WebExtension APIs.
 * Transparently wraps `browser` (Firefox) and `chrome` (Chromium).
 */

interface BrowserStorageArea {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

interface BrowserAlarm {
  name: string;
  scheduledTime: number;
  periodInMinutes?: number;
}

interface BrowserAlarms {
  create(name: string, alarmInfo: { delayInMinutes?: number; periodInMinutes?: number; when?: number }): Promise<void> | void;
  get(name: string): Promise<BrowserAlarm | undefined>;
  getAll(): Promise<BrowserAlarm[]>;
  clear(name: string): Promise<boolean>;
  clearAll(): Promise<boolean>;
  onAlarm: {
    addListener(callback: (alarm: BrowserAlarm) => void): void;
    removeListener(callback: (alarm: BrowserAlarm) => void): void;
    hasListener(callback: (alarm: BrowserAlarm) => void): boolean;
  };
}

interface BrowserRuntime {
  sendMessage<M = unknown, R = unknown>(message: M): Promise<R>;
  onMessage: {
    addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void | Promise<any>): void;
    removeListener(callback: Function): void;
    hasListener(callback: Function): boolean;
  };
  getURL(path: string): string;
  id?: string;
}

export interface BrowserAPI {
  storage: {
    local: BrowserStorageArea;
  };
  alarms: BrowserAlarms;
  runtime: BrowserRuntime;
}

function resolveBrowserAPI(): BrowserAPI {
  // 1. Check for standard global `browser` (Firefox / polyfilled)
  if (typeof (globalThis as any).browser !== 'undefined' && (globalThis as any).browser?.storage) {
    return (globalThis as any).browser as BrowserAPI;
  }

  // 2. Check for Chromium global `chrome`
  if (typeof (globalThis as any).chrome !== 'undefined' && (globalThis as any).chrome?.storage) {
    const rawChrome = (globalThis as any).chrome;

    return {
      storage: {
        local: {
          get: (keys) => {
            return new Promise((resolve, reject) => {
              rawChrome.storage.local.get(keys, (items: Record<string, unknown>) => {
                if (rawChrome.runtime?.lastError) {
                  return reject(new Error(rawChrome.runtime.lastError.message));
                }
                resolve(items);
              });
            });
          },
          set: (items) => {
            return new Promise((resolve, reject) => {
              rawChrome.storage.local.set(items, () => {
                if (rawChrome.runtime?.lastError) {
                  return reject(new Error(rawChrome.runtime.lastError.message));
                }
                resolve();
              });
            });
          },
          remove: (keys) => {
            return new Promise((resolve, reject) => {
              rawChrome.storage.local.remove(keys, () => {
                if (rawChrome.runtime?.lastError) {
                  return reject(new Error(rawChrome.runtime.lastError.message));
                }
                resolve();
              });
            });
          },
          clear: () => {
            return new Promise((resolve, reject) => {
              rawChrome.storage.local.clear(() => {
                if (rawChrome.runtime?.lastError) {
                  return reject(new Error(rawChrome.runtime.lastError.message));
                }
                resolve();
              });
            });
          },
        },
      },
      alarms: {
        create: (name, alarmInfo) => {
          return rawChrome.alarms.create(name, alarmInfo);
        },
        get: (name) => {
          return new Promise((resolve) => {
            rawChrome.alarms.get(name, (alarm: BrowserAlarm) => resolve(alarm));
          });
        },
        getAll: () => {
          return new Promise((resolve) => {
            rawChrome.alarms.getAll((alarms: BrowserAlarm[]) => resolve(alarms));
          });
        },
        clear: (name) => {
          return new Promise((resolve) => {
            rawChrome.alarms.clear(name, (wasCleared: boolean) => resolve(wasCleared));
          });
        },
        clearAll: () => {
          return new Promise((resolve) => {
            rawChrome.alarms.clearAll((wasCleared: boolean) => resolve(wasCleared));
          });
        },
        onAlarm: rawChrome.alarms.onAlarm,
      },
      runtime: {
        sendMessage: <M, R>(message: M): Promise<R> => {
          return new Promise((resolve, reject) => {
            rawChrome.runtime.sendMessage(message, (response: R) => {
              if (rawChrome.runtime?.lastError) {
                return reject(new Error(rawChrome.runtime.lastError.message));
              }
              resolve(response);
            });
          });
        },
        onMessage: rawChrome.runtime.onMessage,
        getURL: (path: string) => rawChrome.runtime.getURL(path),
        id: rawChrome.runtime?.id,
      },
    };
  }

  // 3. Fallback dummy placeholder (will be replaced by mock during test execution)
  return {} as BrowserAPI;
}

export const browserAPI: BrowserAPI = new Proxy({} as BrowserAPI, {
  get(_target, prop) {
    const resolved = resolveBrowserAPI();
    return (resolved as any)[prop];
  },
});
