import { browserAPI } from '@shared/utils/browser-api';
import { ChromeStorageAdapter } from '@features/sync/infrastructure/chrome-storage.adapter';
import { ChromeAlarmsAdapter, DEBOUNCE_ALARM_PREFIX } from '@features/sync/infrastructure/chrome-alarms.adapter';
import { FetchHttpClientAdapter } from '@features/sync/infrastructure/fetch-client.adapter';
import { DebounceSessionUseCase } from '@features/sync/application/debounce-session.usecase';
import { SyncSessionUseCase } from '@features/sync/application/sync-session.usecase';
import { SessionId } from '@features/sync/domain/session-id.vo';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';
import { PlatformType } from '@features/capture/domain/platform-type.vo';

// Instantiate infrastructure adapters
const storageAdapter = new ChromeStorageAdapter();
const schedulerAdapter = new ChromeAlarmsAdapter();
const httpClientAdapter = new FetchHttpClientAdapter();

// Instantiate application use cases
const debounceUseCase = new DebounceSessionUseCase(storageAdapter, schedulerAdapter);
const syncUseCase = new SyncSessionUseCase(storageAdapter, httpClientAdapter, schedulerAdapter);

console.log('[Liya AI Background] Service worker initialized.');

/**
 * Updates extension action icon per tab (active vs grayscale disabled)
 */
async function updateTabIcon(tabId: number, url?: string) {
  if (!url) {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.get) {
        const tab = await chrome.tabs.get(tabId);
        url = tab?.url;
      }
    } catch {
      return;
    }
  }

  const platformRes = url ? PlatformType.fromUrl(url) : null;
  const isSupported = platformRes ? platformRes.isSuccess() : false;

  const path = isSupported
    ? {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      }
    : {
        16: 'icons/icon-16-disabled.png',
        32: 'icons/icon-32-disabled.png',
        48: 'icons/icon-48-disabled.png',
        128: 'icons/icon-128-disabled.png',
      };

  const title = isSupported
    ? `Liya AI: Active on ${platformRes?.getValue().value}`
    : 'Liya AI: Standby (Navigate to ChatGPT, Claude, or Gemini)';

  try {
    const actionAPI = (typeof chrome !== 'undefined' && chrome.action) ? chrome.action : (browserAPI as any).action;
    if (actionAPI?.setIcon) {
      await actionAPI.setIcon({ tabId, path });
      if (actionAPI.setTitle) {
        await actionAPI.setTitle({ tabId, title });
      }
    }
  } catch {
    // Tab might be chrome:// or closed
  }
}

// Listen to tab activation
if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      await updateTabIcon(activeInfo.tabId, tab?.url);
    } catch {
      // Defensive
    }
  });
}

// Listen to tab updates (URL change, navigation complete)
if (typeof chrome !== 'undefined' && chrome.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
      updateTabIcon(tabId, tab.url);
    }
  });
}

/**
 * Handle incoming messages from Content scripts and Popup UI
 */
browserAPI.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (res: any) => void) => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  (async () => {
    try {
      switch (message.type) {
        case 'REGISTER_ACTIVE_TAB': {
          if (sender.tab?.id) {
            await updateTabIcon(sender.tab.id, sender.tab.url);
          }
          sendResponse({ success: true });
          break;
        }

        case 'TURN_CAPTURED': {
          const res = await debounceUseCase.execute(message.payload);
          sendResponse({ success: res.isSuccess(), sessionId: res.getOrElse('') });
          break;
        }

        case 'TURN_DISCARDED': {
          const hashToDiscard = TurnHash.fromHash(message.payload.turnHash);
          const sessions = await storageAdapter.getAll();
          for (const session of sessions) {
            session.discardTurn(hashToDiscard);
            await storageAdapter.save(session);
          }
          sendResponse({ success: true });
          break;
        }

        case 'SYNC_NOW': {
          const settings = await browserAPI.storage.local.get(['endpointUrl', 'authToken', 'isSyncPaused']);
          const endpointUrl = (settings.endpointUrl as string) || 'http://localhost:3000/api/sessions';
          const authToken = settings.authToken as string | undefined;
          const isPaused = Boolean(settings.isSyncPaused);

          const sessions = await storageAdapter.getAll();
          const pending = sessions.filter((s) => s.status === 'DEBOUNCING' || s.status === 'ACTIVE');

          let syncedCount = 0;
          for (const s of pending) {
            const syncResult = await syncUseCase.execute({
              sessionId: s.id,
              endpointUrl,
              authToken,
              isPaused,
            });
            if (syncResult.isSuccess()) {
              syncedCount++;
            }
          }
          sendResponse({ success: true, syncedCount });
          break;
        }

        case 'GET_STATUS': {
          const sessions = await storageAdapter.getAll();
          const settings = await browserAPI.storage.local.get(['endpointUrl', 'authToken', 'isSyncPaused']);

          // Detect active tab context
          let currentTabPlatform: string | null = null;
          let isSupportedUrl = false;
          try {
            if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
              const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (activeTab?.url) {
                const platformRes = PlatformType.fromUrl(activeTab.url);
                if (platformRes.isSuccess()) {
                  currentTabPlatform = platformRes.getValue().value;
                  isSupportedUrl = true;
                }
              }
            }
          } catch {
            // Defensive
          }

          const totalTurns = sessions.reduce((acc, s) => acc + s.turnsCount, 0);
          sendResponse({
            success: true,
            totalSessions: sessions.length,
            totalTurns,
            currentTabPlatform,
            isSupportedUrl,
            sessions: sessions.map((s) => s.flush()),
            settings: {
              endpointUrl: settings.endpointUrl || 'http://localhost:3000/api/sessions',
              authToken: settings.authToken || '',
              isSyncPaused: Boolean(settings.isSyncPaused),
            },
          });
          break;
        }

        case 'GET_SIDEBAR_SYNC_STATUS': {
          const requestedItems: Array<{ conversationId?: string; title: string }> = message.payload?.items || [];
          const sessions = await storageAdapter.getAll();

          // Active tab context (URL or explicit currentConversationId from content script)
          const senderUrl = sender.tab?.url || sender.url || '';
          const activeUrlMatch = senderUrl.match(/\/c\/([a-zA-Z0-9_-]+)/);
          const activeTabConversationId =
            message.payload?.currentConversationId || (activeUrlMatch ? activeUrlMatch[1] : undefined);
          const currentTurnCount =
            typeof message.payload?.currentTurnCount === 'number' ? message.payload.currentTurnCount : undefined;

          const statusMap: Record<
            string,
            { level: 'NONE' | 'PARTIAL' | 'FULL'; syncedTurns: number; totalTurns: number }
          > = {};

          for (const item of requestedItems) {
            const key = item.conversationId || item.title;
            if (!key) continue;

            const isActiveConversation = Boolean(
              item.conversationId && activeTabConversationId && item.conversationId === activeTabConversationId
            );

            let capturedTurns = 0;
            let syncedTurns = 0;
            let isSessionSynced = false;

            for (const session of sessions) {
              const turns = session.getTurns();
              for (const turn of turns) {
                // 1. Direct conversationId match
                const matchesId = Boolean(item.conversationId && turn.conversationId === item.conversationId);

                // 2. Active tab fallback: turn captured during this tab session, or turn has no conversationId
                const matchesActiveTab = Boolean(
                  !matchesId &&
                    isActiveConversation &&
                    (!turn.conversationId || turn.conversationId === activeTabConversationId)
                );

                // 3. Title/prompt substring heuristic
                const promptText = turn.prompt.value;
                const matchesTitle =
                  !matchesId &&
                  !matchesActiveTab &&
                  Boolean(
                    item.title &&
                      item.title.length >= 3 &&
                      (promptText.toLowerCase().includes(item.title.slice(0, 20).toLowerCase()) ||
                        item.title.toLowerCase().includes(promptText.slice(0, 20).toLowerCase()))
                  );

                if (matchesId || matchesActiveTab || matchesTitle) {
                  capturedTurns++;
                  if (session.status === 'SYNCED') {
                    syncedTurns++;
                    isSessionSynced = true;
                  }
                }
              }
            }

            let level: 'NONE' | 'PARTIAL' | 'FULL' = 'NONE';
            let displaySynced = 0;
            let displayTotal = 0;

            if (capturedTurns === 0) {
              level = 'NONE';
              displaySynced = 0;
              displayTotal = 0;
            } else if (isActiveConversation && currentTurnCount && currentTurnCount > 0) {
              // Active conversation: compare captured turns to the total turns currently visible on the page
              displaySynced = capturedTurns;
              displayTotal = currentTurnCount;

              if (capturedTurns >= currentTurnCount) {
                level = 'FULL';
              } else {
                level = 'PARTIAL';
              }
            } else {
              // Non-active conversation or current page count unavailable
              displaySynced = capturedTurns;
              displayTotal = capturedTurns;

              if (isSessionSynced || (syncedTurns >= capturedTurns && syncedTurns > 0)) {
                level = 'FULL';
              } else {
                level = 'PARTIAL';
              }
            }

            statusMap[key] = {
              level,
              syncedTurns: displaySynced,
              totalTurns: displayTotal,
            };
          }

          sendResponse({ success: true, statusMap });
          break;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      sendResponse({ error: err instanceof Error ? err.message : String(err) });
    }
  })();

  return true; // Keep message channel open for async response
});

/**
 * Handle debounced alarm triggers
 */
browserAPI.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith(DEBOUNCE_ALARM_PREFIX)) {
    const rawSessionId = ChromeAlarmsAdapter.parseSessionIdFromAlarm(alarm.name);
    if (!rawSessionId) return;

    const sessionIdRes = SessionId.create(rawSessionId);
    if (sessionIdRes.isFailure()) return;

    const settings = await browserAPI.storage.local.get(['endpointUrl', 'authToken', 'isSyncPaused']);
    const endpointUrl = (settings.endpointUrl as string) || 'http://localhost:3000/api/sessions';
    const authToken = settings.authToken as string | undefined;
    const isPaused = Boolean(settings.isSyncPaused);

    await syncUseCase.execute({
      sessionId: sessionIdRes.getValue(),
      endpointUrl,
      authToken,
      isPaused,
    });
  }
});
