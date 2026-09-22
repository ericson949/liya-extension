import { PlatformExtractorStrategy, SidebarConversationItem } from '../../ports/platform-extractor.strategy';
import { SupportedPlatform } from '../../domain/platform-type.vo';
import { RawTurnDTO } from '../../domain/raw-turn.dto';
import { MessageBridge } from '../bridge/message-bridge';

export class ClaudeAdapter implements PlatformExtractorStrategy {
  public readonly platform: SupportedPlatform = 'CLAUDE';

  public matches(url: string): boolean {
    return url.includes('claude.ai');
  }

  public observeStreamEnd(onComplete: (rawTurn: RawTurnDTO) => void): () => void {
    let lastDispatchedHash = '';

    // 1. Primary: SSE interceptor from MAIN world
    const unlistenBridge = MessageBridge.listenInIsolatedWorld((turn) => {
      if (turn.platform === 'CLAUDE') {
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
            // In Claude, streaming stops when the stop button is hidden or data-is-streaming is false
            const isStreaming = document.querySelector('[data-is-streaming="true"], button[aria-label="Stop Response"]');
            if (!isStreaming) {
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
      // Claude messages selectors
      const messageContainers = document.querySelectorAll(
        '.font-claude-message, [data-testid="user-message"], div[class*="ChatMessage"]'
      );

      if (messageContainers.length < 2) return null;

      let promptText = '';
      let responseText = '';
      let lastAssistantEl: HTMLElement | null = null;

      for (let i = messageContainers.length - 1; i >= 0; i--) {
        const el = messageContainers[i] as HTMLElement;
        const text = el.innerText?.trim() || '';

        // Claude user prompt vs assistant heuristics
        const isUser = el.getAttribute('data-testid') === 'user-message' || el.classList.contains('font-user-message');

        if (!isUser && !responseText && text.length >= 10) {
          responseText = text;
          lastAssistantEl = el;
        } else if (isUser && responseText && !promptText && text.length >= 3) {
          promptText = text;
          break;
        }
      }

      if (promptText && responseText) {
        return {
          platform: 'CLAUDE',
          prompt: promptText,
          response: responseText,
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
      const messageContainers = Array.from(
        document.querySelectorAll(
          '.font-claude-message, [data-testid="user-message"], [data-testid="assistant-message"], div[class*="ChatMessage"]'
        )
      ) as HTMLElement[];

      let currentPrompt = '';
      let turnIndex = 0;

      for (const el of messageContainers) {
        const text = el.innerText?.trim() || '';
        const isUser =
          el.getAttribute('data-testid') === 'user-message' ||
          el.classList.contains('font-user-message');

        if (isUser) {
          currentPrompt = text;
        } else if (text.length >= 10) {
          if (currentPrompt.length >= 3) {
            turns.push({
              platform: 'CLAUDE',
              prompt: currentPrompt,
              response: text,
              conversationId: this.getCurrentConversationId(),
              turnIndex: turnIndex++,
              timestamp: Date.now(),
              metadata: {
                targetElement: el,
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
    const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : undefined;
  }

  public extractSidebarConversations(): SidebarConversationItem[] {
    if (typeof document === 'undefined') return [];
    const items: SidebarConversationItem[] = [];

    try {
      const links = Array.from(document.querySelectorAll('nav a[href^="/chat/"], a[href*="/chat/"]')) as HTMLAnchorElement[];
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/chat\/([a-zA-Z0-9_-]+)/);
        const title = link.innerText?.trim() || '';
        if (title) {
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
