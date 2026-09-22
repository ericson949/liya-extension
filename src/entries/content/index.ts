import { PlatformAdapterFactory } from '@features/capture/infrastructure/factory';
import { BadgeShadowUI } from '@features/capture/infrastructure/ui/badge.shadow';
import { SidebarSyncUI } from '@features/capture/infrastructure/ui/sidebar-sync.ui';
import { CaptureTurnUseCase } from '@features/capture/application/capture-turn.usecase';
import { SanitizeTurnUseCase } from '@features/sanitization/application/sanitize-turn.usecase';

(function bootstrapLiyaContentScript() {
  console.log('[Liya AI] Content script loaded in isolated world.');

  try {
    const url = window.location.href;
    const adapter = PlatformAdapterFactory.create(url);

    console.log(`[Liya AI] Active strategy resolved for platform: ${adapter.platform}`);

    const badgeUI = new BadgeShadowUI();
    const sidebarSyncUI = new SidebarSyncUI();
    const sanitizeUseCase = new SanitizeTurnUseCase();
    const captureUseCase = new CaptureTurnUseCase(sanitizeUseCase, badgeUI);

    // Notify background service worker to activate the extension icon for this tab
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'REGISTER_ACTIVE_TAB' });
      }
    } catch {
      // Defensive
    }

    const processedHashes = new Set<string>();

    /**
     * Scans all conversation turns in the DOM and renders an informative icon
     * on every single assistant message's bottom action bar.
     */
    async function scanAndBadgeAllConversationTurns() {
      try {
        // Clean up any misplaced badges that may have leaked into code blocks or the main chat
        const misplaced = document.querySelectorAll(
          'code-block .liya-native-action-host, code-block .synapse-native-action-host, .code-block-decoration .liya-native-action-host, .code-block-decoration .synapse-native-action-host, #chat-history .liya-sidebar-sync-host, #chat-history .synapse-sidebar-sync-host, chat-window .liya-sidebar-sync-host, chat-window .synapse-sidebar-sync-host, infinite-scroller .liya-sidebar-sync-host, infinite-scroller .synapse-sidebar-sync-host, .conversation-container > .liya-sidebar-sync-host, .conversation-container > .synapse-sidebar-sync-host'
        );
        misplaced.forEach((el) => el.remove());

        const turns = adapter.extractAllTurns();
        for (const turn of turns) {
          const result = await captureUseCase.execute(turn);
          if (result.isSuccess()) {
            processedHashes.add(result.getValue());
          }
        }
      } catch (err) {
        console.warn('[Liya AI] Error scanning conversation turns:', err);
      }
    }

    /**
     * Scans the conversation history sidebar and updates the 3-level SVG sync indicator
     * for every conversation item in the list.
     */
    async function updateSidebarSyncStatus() {
      try {
        const sidebarItems = adapter.extractSidebarConversations();
        if (sidebarItems.length === 0) return;

        const currentConversationId = adapter.getCurrentConversationId();
        const currentTurnCount = adapter.extractAllTurns().length;

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          const payloadItems = sidebarItems.map((item) => ({
            conversationId: item.conversationId,
            title: item.title,
          }));

          chrome.runtime.sendMessage(
            {
              type: 'GET_SIDEBAR_SYNC_STATUS',
              payload: {
                items: payloadItems,
                currentConversationId,
                currentTurnCount,
              },
            },
            (response) => {
              if (response?.success && response.statusMap) {
                for (const item of sidebarItems) {
                  const key = item.conversationId || item.title;
                  const info = response.statusMap[key] || {
                    level: 'NONE',
                    syncedTurns: 0,
                    totalTurns: 0,
                  };
                  sidebarSyncUI.renderSyncIndicator(item, info);
                }
              }
            }
          );
        }
      } catch {
        // Defensive
      }
    }

    // 1. Initial scan on load to badge messages and sidebar history
    scanAndBadgeAllConversationTurns();
    updateSidebarSyncStatus();
    setTimeout(() => {
      scanAndBadgeAllConversationTurns();
      updateSidebarSyncStatus();
    }, 1200);

    // 2. Subscribe to stream end events (primary SSE interceptor bridge + fallback DOM observer)
    const unsubscribeStream = adapter.observeStreamEnd(async (rawTurn) => {
      console.log(`[Liya AI] Turn detected from ${rawTurn.platform}:`, {
        promptLength: rawTurn.prompt.length,
        responseLength: rawTurn.response.length,
      });

      const result = await captureUseCase.execute(rawTurn);
      if (result.isSuccess()) {
        console.log(`[Liya AI] Turn successfully processed with hash: ${result.getValue()}`);
        processedHashes.add(result.getValue());
      } else {
        console.warn('[Liya AI] Turn discarded or failed validation:', result.getError());
      }

      // Ensure all messages have their badges attached and sidebar is updated
      setTimeout(() => {
        scanAndBadgeAllConversationTurns();
        updateSidebarSyncStatus();
      }, 400);
      setTimeout(() => {
        scanAndBadgeAllConversationTurns();
        updateSidebarSyncStatus();
      }, 1200);
    });

    // 3. Periodic / mutation fallback to ensure newly appended messages & sidebar items are badged
    let mutationDebounce: ReturnType<typeof setTimeout> | null = null;
    const bodyObserver = new MutationObserver(() => {
      if (mutationDebounce) clearTimeout(mutationDebounce);
      mutationDebounce = setTimeout(() => {
        scanAndBadgeAllConversationTurns();
        updateSidebarSyncStatus();
      }, 1200);
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // 4. Handle SPA navigation (URL change / conversation switch)
    const handleUrlChange = () => {
      setTimeout(() => {
        scanAndBadgeAllConversationTurns();
        updateSidebarSyncStatus();
      }, 300);
      setTimeout(() => {
        scanAndBadgeAllConversationTurns();
        updateSidebarSyncStatus();
      }, 1000);
    };
    window.addEventListener('popstate', handleUrlChange);

    // Cleanup on window unload if applicable
    window.addEventListener('beforeunload', () => {
      unsubscribeStream();
      bodyObserver.disconnect();
      window.removeEventListener('popstate', handleUrlChange);
      if (mutationDebounce) clearTimeout(mutationDebounce);
      badgeUI.clearAllBadges();
    });
  } catch (error) {
    console.warn('[Liya AI] Platform adapter initialization bypassed:', error);
  }
})();
