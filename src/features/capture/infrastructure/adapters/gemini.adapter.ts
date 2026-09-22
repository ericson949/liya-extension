import { PlatformExtractorStrategy, SidebarConversationItem } from '../../ports/platform-extractor.strategy';
import { SupportedPlatform } from '../../domain/platform-type.vo';
import { RawTurnDTO } from '../../domain/raw-turn.dto';
import { MessageBridge } from '../bridge/message-bridge';

export class GeminiAdapter implements PlatformExtractorStrategy {
  public readonly platform: SupportedPlatform = 'GEMINI';

  public matches(url: string): boolean {
    return url.includes('gemini.google.com');
  }

  public observeStreamEnd(onComplete: (rawTurn: RawTurnDTO) => void): () => void {
    let lastDispatchedHash = '';

    // 1. Primary: MessageBridge from MAIN world interceptor
    const unlistenBridge = MessageBridge.listenInIsolatedWorld((turn) => {
      if (turn.platform === 'GEMINI') {
        const hash = `${turn.prompt.length}_${turn.response.length}`;
        if (hash !== lastDispatchedHash) {
          lastDispatchedHash = hash;
          onComplete(turn);
        }
      }
    });

    // 2. Fallback: DOM MutationObserver
    let domObserver: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    if (typeof document !== 'undefined') {
      try {
        domObserver = new MutationObserver(() => {
          if (debounceTimer) clearTimeout(debounceTimer);

          debounceTimer = setTimeout(() => {
            // In Gemini, check if model-response has completed streaming or speech button appears
            const isGenerating = document.querySelector('.generating, [aria-label="Stop response"]');
            if (!isGenerating) {
              const turn = this.extractTurn();
              if (turn) {
                const hash = `${turn.prompt.length}_${turn.response.length}`;
                if (hash !== lastDispatchedHash) {
                  lastDispatchedHash = hash;
                  onComplete(turn);
                }
              }
            }
          }, 1500);
        });

        domObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
      } catch {
        // Defensive
      }
    }

    return () => {
      unlistenBridge();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (domObserver) domObserver.disconnect();
    };
  }

  public extractTurn(): RawTurnDTO | null {
    if (typeof document === 'undefined') return null;

    try {
      let userQueries = Array.from(document.querySelectorAll('user-query')) as HTMLElement[];
      if (userQueries.length === 0) {
        userQueries = Array.from(document.querySelectorAll('.query-text, .user-query-container')) as HTMLElement[];
      }

      let modelResponses = Array.from(document.querySelectorAll('model-response')) as HTMLElement[];
      if (modelResponses.length === 0) {
        modelResponses = Array.from(document.querySelectorAll('.response-container')) as HTMLElement[];
      }

      if (userQueries.length === 0 || modelResponses.length === 0) {
        return null;
      }

      const lastQueryEl = userQueries[userQueries.length - 1] as HTMLElement;
      const lastResponseEl = modelResponses[modelResponses.length - 1] as HTMLElement;

      const promptText = lastQueryEl.innerText?.trim() || '';
      const contentEl =
        lastResponseEl.querySelector<HTMLElement>('message-content, .markdown, .model-response-text') ||
        lastResponseEl;
      const responseText = contentEl.innerText?.trim() || '';

      if (promptText.length >= 3 && responseText.length >= 10) {
        return {
          platform: 'GEMINI',
          prompt: promptText,
          response: responseText,
          conversationId: this.getCurrentConversationId(),
          timestamp: Date.now(),
          metadata: {
            targetElement: lastResponseEl,
          },
        };
      }
    } catch {
      // Defensive
    }

    return null;
  }

  public extractAllTurns(): RawTurnDTO[] {
    if (typeof document === 'undefined') return [];
    const turns: RawTurnDTO[] = [];

    try {
      // 1. Only select top-level model-response elements to avoid duplicate nested responses
      let modelResponses = Array.from(document.querySelectorAll('model-response')) as HTMLElement[];
      if (modelResponses.length === 0) {
        modelResponses = Array.from(document.querySelectorAll('.response-container')) as HTMLElement[];
      }

      let userQueries = Array.from(document.querySelectorAll('user-query')) as HTMLElement[];
      if (userQueries.length === 0) {
        userQueries = Array.from(document.querySelectorAll('.user-query-container')) as HTMLElement[];
      }

      if (modelResponses.length === 0) return [];

      const convId = this.getCurrentConversationId();

      for (let i = 0; i < modelResponses.length; i++) {
        const respEl = modelResponses[i];
        if (!respEl) continue;

        const contentEl =
          respEl.querySelector<HTMLElement>('message-content, .markdown, .model-response-text') || respEl;
        const responseText = contentEl.innerText?.trim() || '';

        if (responseText.length < 10) continue;

        // Find closest preceding user query in document order
        let matchedQueryText = '';
        for (let j = userQueries.length - 1; j >= 0; j--) {
          const queryEl = userQueries[j];
          if (!queryEl) continue;
          const pos = queryEl.compareDocumentPosition(respEl);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
            matchedQueryText = queryEl.innerText?.trim() || '';
            break;
          }
        }

        // Fallback to 1-to-1 index matching if relative position wasn't found
        const fallbackQuery = userQueries[i];
        if (!matchedQueryText && fallbackQuery) {
          matchedQueryText = fallbackQuery.innerText?.trim() || '';
        }

        if (matchedQueryText.length >= 3 && responseText.length >= 10) {
          turns.push({
            platform: 'GEMINI',
            prompt: matchedQueryText,
            response: responseText,
            conversationId: convId,
            turnIndex: i,
            timestamp: Date.now(),
            metadata: {
              targetElement: respEl,
            },
          });
        }
      }
    } catch {
      // Defensive
    }

    return turns;
  }

  public getCurrentConversationId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : undefined;
  }

  public extractSidebarConversations(): SidebarConversationItem[] {
    if (typeof document === 'undefined') return [];
    const items: SidebarConversationItem[] = [];

    try {
      // Only search inside Gemini's side navigation drawer, NEVER in the main chat window!
      const sidebarRoot = document.querySelector(
        'bard-sidenav, mat-sidenav, aside, nav, [data-test-id="side-nav"], .side-nav-container, .side-nav'
      );

      const searchRoot = sidebarRoot || document;

      // 1. Check anchor links targeting /app/ inside side navigation
      const links = Array.from(
        searchRoot.querySelectorAll<HTMLAnchorElement>('a[href*="/app/"], a.conversation-link')
      );

      for (const link of links) {
        // Absolutely exclude links inside main chat window
        if (link.closest('#chat-history, chat-window, .chat-container, infinite-scroller, .conversation-container')) {
          continue;
        }

        const href = link.getAttribute('href') || '';
        const match = href.match(/\/app\/([a-zA-Z0-9_-]+)/);
        const conversationId = match ? match[1] : undefined;
        const title =
          link.getAttribute('aria-label')?.trim() ||
          link.querySelector('.conversation-title, .title, span')?.textContent?.trim() ||
          link.innerText?.trim() ||
          '';

        if (title && conversationId) {
          items.push({
            conversationId,
            title,
            containerElement: link,
          });
        }
      }

      // 2. Check sidebar list item containers (strictly inside sidebar)
      if (sidebarRoot) {
        const containers = Array.from(
          sidebarRoot.querySelectorAll<HTMLElement>(
            '.conversation, [data-test-id="conversation-list-item"], [data-test-id="recent-conversation-item"], mat-list-item, div[role="listitem"]'
          )
        );

        for (const container of containers) {
          if (container.closest('#chat-history, chat-window, .chat-container, infinite-scroller, .conversation-container')) {
            continue;
          }
          if (items.some((i) => i.containerElement === container || container.contains(i.containerElement))) continue;

          const titleEl = (container.querySelector('.conversation-title, .title, span') as HTMLElement) ?? container;
          const title = container.getAttribute('aria-label')?.trim() || titleEl.innerText?.trim() || '';
          const link = container.querySelector('a') as HTMLAnchorElement | null;
          const href = link?.getAttribute('href') || container.getAttribute('data-conversation-id') || '';
          const match = href.match(/([a-zA-Z0-9_-]{8,})/);
          const conversationId = match ? match[1] : undefined;

          if (title && conversationId) {
            items.push({
              conversationId,
              title,
              containerElement: container,
            });
          }
        }
      }
    } catch {
      // Defensive
    }

    return items;
  }
}
