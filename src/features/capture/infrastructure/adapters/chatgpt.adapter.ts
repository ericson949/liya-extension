import { PlatformExtractorStrategy, SidebarConversationItem } from '../../ports/platform-extractor.strategy';
import { SupportedPlatform } from '../../domain/platform-type.vo';
import { RawTurnDTO } from '../../domain/raw-turn.dto';
import { MessageBridge } from '../bridge/message-bridge';

export class ChatGPTAdapter implements PlatformExtractorStrategy {
  public readonly platform: SupportedPlatform = 'CHATGPT';

  public matches(url: string): boolean {
    return url.includes('chatgpt.com') || url.includes('chat.openai.com');
  }

  public observeStreamEnd(onComplete: (rawTurn: RawTurnDTO) => void): () => void {
    // 1. Primary: listen to SSE stream interceptor events from MAIN world
    let lastDispatchedHash = '';
    const unlistenBridge = MessageBridge.listenInIsolatedWorld((turn) => {
      if (turn.platform === 'CHATGPT') {
        const hash = `${turn.prompt.length}_${turn.response.length}`;
        if (hash !== lastDispatchedHash) {
          lastDispatchedHash = hash;
          onComplete(turn);
        }
      }
    });

    // 2. Fallback: DOM MutationObserver monitoring stream termination heuristics
    let domObserver: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    if (typeof document !== 'undefined') {
      try {
        domObserver = new MutationObserver(() => {
          if (debounceTimer) clearTimeout(debounceTimer);

          // Heuristic: check if stop button disappeared or generation stopped
          debounceTimer = setTimeout(() => {
            const stopButton = document.querySelector('button[data-testid="stop-button"], button[aria-label="Stop generating"]');
            if (!stopButton) {
              const turn = this.extractTurn();
              if (turn) {
                const hash = `${turn.prompt.length}_${turn.response.length}`;
                if (hash !== lastDispatchedHash) {
                  lastDispatchedHash = hash;
                  onComplete(turn);
                }
              }
            }
          }, 1200);
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
      // ChatGPT DOM selectors (with multiple fallbacks)
      const articles = document.querySelectorAll(
        'article[data-testid^="conversation-turn"], div[data-message-author-role]'
      );

      if (articles.length < 2) return null;

      // Extract last user prompt and assistant response
      let promptText = '';
      let responseText = '';
      let lastAssistantEl: HTMLElement | null = null;

      for (let i = articles.length - 1; i >= 0; i--) {
        const el = articles[i] as HTMLElement;
        const role = el.getAttribute('data-message-author-role') ||
          (el.querySelector('[data-message-author-role="user"]') ? 'user' : 'assistant');

        if (role === 'assistant' && !responseText) {
          responseText = el.innerText?.trim() || '';
          const turnContainer =
            (el.closest(
              'article[data-testid^="conversation-turn"], .agent-turn, .group\\/turn-messages'
            ) as HTMLElement) || el;
          lastAssistantEl = turnContainer;
        } else if (role === 'user' && responseText && !promptText) {
          promptText = el.innerText?.trim() || '';
          break;
        }
      }

      if (promptText.length >= 3 && responseText.length >= 10) {
        return {
          platform: 'CHATGPT',
          prompt: promptText,
          response: responseText,
          conversationId: this.getCurrentConversationId(),
          timestamp: Date.now(),
          metadata: {
            targetElement: lastAssistantEl,
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
      const articles = Array.from(
        document.querySelectorAll('article[data-testid^="conversation-turn"], div[data-message-author-role]')
      ) as HTMLElement[];

      let currentPrompt = '';
      let turnIndex = 0;

      for (const article of articles) {
        const role =
          article.getAttribute('data-message-author-role') ||
          (article.querySelector('[data-message-author-role="user"]')
            ? 'user'
            : article.querySelector('[data-message-author-role="assistant"]')
            ? 'assistant'
            : null);

        if (role === 'user') {
          currentPrompt = article.innerText?.trim() || '';
        } else if (role === 'assistant') {
          const responseText = article.innerText?.trim() || '';
          if (currentPrompt.length >= 3 && responseText.length >= 10) {
            const turnContainer =
              (article.closest(
                'article[data-testid^="conversation-turn"], .agent-turn, .group\\/turn-messages'
              ) as HTMLElement) || article;

            turns.push({
              platform: 'CHATGPT',
              prompt: currentPrompt,
              response: responseText,
              conversationId: this.getCurrentConversationId(),
              turnIndex: turnIndex++,
              timestamp: Date.now(),
              metadata: {
                targetElement: turnContainer,
              },
            });
          }
        }
      }
    } catch {
      // Defensive
    }

    return turns;
  }

  public getCurrentConversationId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : undefined;
  }

  public extractSidebarConversations(): SidebarConversationItem[] {
    if (typeof document === 'undefined') return [];
    const items: SidebarConversationItem[] = [];

    try {
      const links = Array.from(
        document.querySelectorAll('nav a[href*="/c/"], a[data-sidebar-item="true"], a[href^="/c/"]')
      ) as HTMLAnchorElement[];

      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/c\/([a-zA-Z0-9_-]+)/);
        const title =
          link.getAttribute('aria-label')?.trim() ||
          link.querySelector('.truncate, [class*="truncate"]')?.textContent?.trim() ||
          link.innerText?.trim() ||
          '';

        if (match || title) {
          items.push({
            conversationId: match ? match[1] : undefined,
            title,
            containerElement: link,
          });
        }
      }
    } catch {
      // Defensive
    }

    return items;
  }
}
