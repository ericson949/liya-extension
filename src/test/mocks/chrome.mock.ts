/**
 * Comprehensive Chrome/WebExtension API Mock Suite for Vitest.
 * Provides in-memory storage, alarms simulation, and messaging dispatch.
 */
import { vi } from 'vitest';

export class MockStorageArea {
  private store: Map<string, unknown> = new Map();

  public get = vi.fn((keys?: string | string[] | Record<string, unknown> | null, callback?: (items: any) => void) => {
    let result: Record<string, unknown> = {};

    if (!keys) {
      this.store.forEach((value, key) => {
        result[key] = value;
      });
    } else if (typeof keys === 'string') {
      if (this.store.has(keys)) {
        result[keys] = this.store.get(keys);
      }
    } else if (Array.isArray(keys)) {
      for (const k of keys) {
        if (this.store.has(k)) {
          result[k] = this.store.get(k);
        }
      }
    } else if (typeof keys === 'object') {
      result = { ...keys };
      for (const k of Object.keys(keys)) {
        if (this.store.has(k)) {
          result[k] = this.store.get(k);
        }
      }
    }

    if (callback) {
      callback(result);
      return;
    }
    return Promise.resolve(result);
  });

  public set = vi.fn((items: Record<string, unknown>, callback?: () => void) => {
    for (const [key, value] of Object.entries(items)) {
      this.store.set(key, value);
    }
    if (callback) {
      callback();
      return;
    }
    return Promise.resolve();
  });

  public remove = vi.fn((keys: string | string[], callback?: () => void) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      this.store.delete(k);
    }
    if (callback) {
      callback();
      return;
    }
    return Promise.resolve();
  });

  public clear = vi.fn((callback?: () => void) => {
    this.store.clear();
    if (callback) {
      callback();
      return;
    }
    return Promise.resolve();
  });

  // Test helper
  public _dump(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    this.store.forEach((val, key) => {
      obj[key] = val;
    });
    return obj;
  }

  public _reset(): void {
    this.store.clear();
    this.get.mockClear();
    this.set.mockClear();
    this.remove.mockClear();
    this.clear.mockClear();
  }
}

export class MockAlarms {
  private alarms: Map<string, { name: string; scheduledTime: number; periodInMinutes?: number }> = new Map();
  private listeners: Set<(alarm: { name: string; scheduledTime: number; periodInMinutes?: number }) => void> = new Set();

  public create = vi.fn((name: string, alarmInfo: { delayInMinutes?: number; periodInMinutes?: number; when?: number }) => {
    const delay = alarmInfo.delayInMinutes ? alarmInfo.delayInMinutes * 60 * 1000 : 0;
    const scheduledTime = alarmInfo.when ?? Date.now() + delay;
    this.alarms.set(name, {
      name,
      scheduledTime,
      periodInMinutes: alarmInfo.periodInMinutes,
    });
  });

  public get = vi.fn((name: string, callback?: (alarm: any) => void) => {
    const alarm = this.alarms.get(name);
    if (callback) {
      callback(alarm);
      return;
    }
    return Promise.resolve(alarm);
  });

  public getAll = vi.fn((callback?: (alarms: any[]) => void) => {
    const list = Array.from(this.alarms.values());
    if (callback) {
      callback(list);
      return;
    }
    return Promise.resolve(list);
  });

  public clear = vi.fn((name: string, callback?: (wasCleared: boolean) => void) => {
    const existed = this.alarms.delete(name);
    if (callback) {
      callback(existed);
      return;
    }
    return Promise.resolve(existed);
  });

  public clearAll = vi.fn((callback?: (wasCleared: boolean) => void) => {
    const hadAny = this.alarms.size > 0;
    this.alarms.clear();
    if (callback) {
      callback(hadAny);
      return;
    }
    return Promise.resolve(hadAny);
  });

  public onAlarm = {
    addListener: vi.fn((cb: (alarm: any) => void) => {
      this.listeners.add(cb);
    }),
    removeListener: vi.fn((cb: (alarm: any) => void) => {
      this.listeners.delete(cb);
    }),
    hasListener: vi.fn((cb: (alarm: any) => void) => {
      return this.listeners.has(cb);
    }),
  };

  // Test trigger
  public _trigger(name: string): void {
    const alarm = this.alarms.get(name) ?? { name, scheduledTime: Date.now() };
    for (const listener of this.listeners) {
      listener(alarm);
    }
  }

  public _reset(): void {
    this.alarms.clear();
    this.listeners.clear();
    this.create.mockClear();
    this.get.mockClear();
    this.getAll.mockClear();
    this.clear.mockClear();
    this.clearAll.mockClear();
    this.onAlarm.addListener.mockClear();
  }
}

export class MockRuntime {
  private messageListeners: Set<(message: any, sender: any, sendResponse: (res?: any) => void) => boolean | void | Promise<any>> = new Set();
  public id = 'mock-extension-id';
  public lastError: Error | null = null;

  public sendMessage = vi.fn((message: unknown, callback?: (response: unknown) => void) => {
    let responded = false;
    let asyncHandling = false;

    const responsePromise = new Promise((resolve) => {
      const sendResponse = (res: unknown) => {
        responded = true;
        resolve(res);
        if (callback) callback(res);
      };

      for (const listener of this.messageListeners) {
        const ret = listener(message, { id: this.id }, sendResponse);
        if (ret === true) {
          asyncHandling = true;
        }
      }

      if (!asyncHandling && !responded) {
        resolve(undefined);
        if (callback) callback(undefined);
      }
    });

    if (callback) {
      return;
    }
    return responsePromise;
  });

  public onMessage = {
    addListener: vi.fn((cb: any) => {
      this.messageListeners.add(cb);
    }),
    removeListener: vi.fn((cb: any) => {
      this.messageListeners.delete(cb);
    }),
    hasListener: vi.fn((cb: any) => {
      return this.messageListeners.has(cb);
    }),
  };

  public getURL = vi.fn((path: string) => `chrome-extension://${this.id}/${path.replace(/^\//, '')}`);

  public _reset(): void {
    this.messageListeners.clear();
    this.sendMessage.mockClear();
    this.onMessage.addListener.mockClear();
    this.lastError = null;
  }
}

export interface MockChromeEnvironment {
  storage: {
    local: MockStorageArea;
  };
  alarms: MockAlarms;
  runtime: MockRuntime;
  resetAll: () => void;
}

export function createMockChrome(): MockChromeEnvironment {
  const localStorage = new MockStorageArea();
  const alarms = new MockAlarms();
  const runtime = new MockRuntime();

  return {
    storage: { local: localStorage },
    alarms,
    runtime,
    resetAll: () => {
      localStorage._reset();
      alarms._reset();
      runtime._reset();
    },
  };
}
