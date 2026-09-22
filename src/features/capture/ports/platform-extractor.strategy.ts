import { SupportedPlatform } from '../domain/platform-type.vo';
import { RawTurnDTO } from '../domain/raw-turn.dto';

export interface SidebarConversationItem {
  conversationId?: string;
  title: string;
  containerElement: HTMLElement;
}

/**
 * Outbound Port: PlatformExtractorStrategy
 * Strategy pattern defining unique Network/DOM parsing heuristics per AI vendor.
 */
export interface PlatformExtractorStrategy {
  readonly platform: SupportedPlatform;

  /**
   * Evaluates if this strategy can handle the given URL.
   */
  matches(url: string): boolean;

  /**
   * Starts observing conversation turn completion via primary SSE/Network interception
   * with fallback to DOM MutationObserver. Returns an unsubscribe teardown function.
   */
  observeStreamEnd(onComplete: (rawTurn: RawTurnDTO) => void): () => void;

  /**
   * Synchronously attempts to extract the most recent visible turn from the DOM
   * (e.g. on initial script load or manual snapshot).
   */
  extractTurn(): RawTurnDTO | null;

  /**
   * Extracts all visible conversation turns from the DOM.
   * Enables badging every message across multi-turn chat sessions.
   */
  extractAllTurns(): RawTurnDTO[];

  /**
   * Extracts visible conversation items from the navigation sidebar.
   * Allows Synapse to render sync level indicators on each conversation in the history.
   */
  extractSidebarConversations(): SidebarConversationItem[];

  /**
   * Returns the current conversation identifier extracted from the URL or state, if available.
   */
  getCurrentConversationId(): string | undefined;
}
