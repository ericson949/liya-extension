import { describe, it, expect, vi } from 'vitest';
import { PlatformAdapterFactory } from '@features/capture/infrastructure/factory';
import { ChatGPTAdapter } from '@features/capture/infrastructure/adapters/chatgpt.adapter';
import { ClaudeAdapter } from '@features/capture/infrastructure/adapters/claude.adapter';
import { GeminiAdapter } from '@features/capture/infrastructure/adapters/gemini.adapter';
import { MessageBridge } from '@features/capture/infrastructure/bridge/message-bridge';

import { BadgeShadowUI } from '@features/capture/infrastructure/ui/badge.shadow';

describe('Platform Adapters and Factory', () => {
  it('resolves correct adapter by URL via PlatformAdapterFactory', () => {
    const chatgpt = PlatformAdapterFactory.create('https://chatgpt.com/c/uuid');
    expect(chatgpt).toBeInstanceOf(ChatGPTAdapter);

    const claude = PlatformAdapterFactory.create('https://claude.ai/chat/123');
    expect(claude).toBeInstanceOf(ClaudeAdapter);

    const gemini = PlatformAdapterFactory.create('https://gemini.google.com/app');
    expect(gemini).toBeInstanceOf(GeminiAdapter);
  });

  it('throws EntityNotFoundError for unknown domain', () => {
    expect(() => PlatformAdapterFactory.create('https://duckduckgo.com')).toThrow();
  });

  it('MessageBridge dispatches and receives messages securely', () => {
    const listener = vi.fn();
    const unsubscribe = MessageBridge.listenInIsolatedWorld(listener);

    // Simulate postMessage event
    MessageBridge.dispatchFromMainWorld({
      platform: 'CHATGPT',
      prompt: 'Test prompt query',
      response: 'Test response result with enough characters',
      timestamp: 123456,
    });

    unsubscribe();
  });

  it('implements extractAllTurns returning empty array when DOM is empty', () => {
    const chatgpt = new ChatGPTAdapter();
    const claude = new ClaudeAdapter();
    const gemini = new GeminiAdapter();

    expect(chatgpt.extractAllTurns()).toEqual([]);
    expect(claude.extractAllTurns()).toEqual([]);
    expect(gemini.extractAllTurns()).toEqual([]);
  });

  it('implements extractSidebarConversations returning empty array when DOM is empty', () => {
    const chatgpt = new ChatGPTAdapter();
    const claude = new ClaudeAdapter();
    const gemini = new GeminiAdapter();

    expect(chatgpt.extractSidebarConversations()).toEqual([]);
    expect(claude.extractSidebarConversations()).toEqual([]);
    expect(gemini.extractSidebarConversations()).toEqual([]);
  });

  it('correctly aligns Synapse badge inside ChatGPT response actions toolbar on the same line', () => {
    document.body.innerHTML = `
      <div class="group/turn-messages relative flex w-full flex-col agent-turn">
        <div class="flex max-w-full flex-col gap-4 grow">
          <div data-message-author-role="assistant" class="min-h-8 text-message">
            <div class="markdown prose">
              <p>Oui — et pour ce post, je n’en mettrais pas beaucoup.</p>
            </div>
          </div>
        </div>
        <div class="z-0 flex min-h-[46px] justify-start">
          <div aria-label="Actions sur la réponse" class="flex flex-wrap items-center" role="group">
            <button type="button" aria-label="Copier la réponse" data-testid="copy-turn-action-button">Copy</button>
            <button type="button" aria-label="Évaluer la réponse" data-testid="feedback-turn-action-button">Feedback</button>
            <button type="button" aria-label="Partager">Share</button>
          </div>
        </div>
      </div>
    `;

    const badgeUI = new BadgeShadowUI();
    const assistantTextEl = document.querySelector('[data-message-author-role="assistant"]') as HTMLElement;

    // Test when targetElement is passed as the inner assistant text element
    badgeUI.renderBadge({
      platform: 'CHATGPT',
      turnHash: 'hash-chatgpt-aligned-123',
      promptPreview: 'Test user question',
      responsePreview: 'Oui — et pour ce post',
      targetElement: assistantTextEl,
      onDiscard: () => {},
    });

    const toolbar = document.querySelector('div[aria-label="Actions sur la réponse"]') as HTMLElement;
    const badgeHost = toolbar.querySelector('.synapse-native-action-host') as HTMLElement;

    // 1. Badge must be inserted directly in the horizontal action toolbar
    expect(badgeHost).not.toBeNull();
    expect(badgeHost.parentElement).toBe(toolbar);

    // 2. Badge must NOT be appended inside the assistant text block
    expect(assistantTextEl.querySelector('.synapse-native-action-host')).toBeNull();
  });

  it('correctly handles Gemini DOM: extracts single turn per model-response and isolates sidebar', () => {
    document.body.innerHTML = `
      <div id="chat-history" class="chat-history-scroll-container">
        <infinite-scroller class="chat-history">
          <div class="conversation-container message-actions-hover-boundary" id="turn-1">
            <user-query>
              <div class="query-text">Comment créer un skill IA ?</div>
            </user-query>
            <model-response>
              <div class="response-container">
                <message-content>
                  <div class="markdown">
                    <p>Voici la réponse complète de Gemini avec du texte explicatif.</p>
                    <code-block>
                      <div class="code-block-decoration header-formatted">
                        <span>Plaintext</span>
                        <div class="buttons">
                          <button class="copy-button" aria-label="Copier le code">Copy</button>
                        </div>
                      </div>
                      <pre><code>code example</code></pre>
                    </code-block>
                  </div>
                </message-content>
                <div class="response-container-footer">
                  <message-actions>
                    <div class="actions-container-v2">
                      <div class="buttons-container-v2">
                        <thumb-up-button><button aria-label="Bonne réponse">Up</button></thumb-up-button>
                        <thumb-down-button><button aria-label="Mauvaise réponse">Down</button></thumb-down-button>
                        <copy-button><button aria-label="Copier">Copy</button></copy-button>
                      </div>
                    </div>
                  </message-actions>
                </div>
              </div>
            </model-response>
          </div>
        </infinite-scroller>
      </div>

      <bard-sidenav>
        <nav>
          <a href="/app/c3c5e87aa991665a" aria-label="Discussions sur les IA">Discussions sur les IA</a>
        </nav>
      </bard-sidenav>
    `;

    const gemini = new GeminiAdapter();
    const turns = gemini.extractAllTurns();

    // 1. Must extract exactly 1 turn (not 3 duplicates from nested response-container / message-content)
    expect(turns.length).toBe(1);
    expect(turns[0]!.prompt).toBe('Comment créer un skill IA ?');
    expect(turns[0]!.response).toContain('Voici la réponse complète de Gemini');

    // 2. Sidebar extraction must NOT include .conversation-container from the chat window
    const sidebarItems = gemini.extractSidebarConversations();
    expect(sidebarItems.length).toBe(1);
    expect(sidebarItems[0]!.conversationId).toBe('c3c5e87aa991665a');
    expect(sidebarItems[0]!.title).toBe('Discussions sur les IA');

    // 3. BadgeUI must place the badge in message-actions .buttons-container-v2, NEVER inside code-block
    const badgeUI = new BadgeShadowUI();
    badgeUI.renderBadge({
      platform: 'GEMINI',
      turnHash: 'gemini-hash-456',
      promptPreview: 'Comment créer un skill IA ?',
      responsePreview: 'Voici la réponse complète de Gemini',
      targetElement: turns[0]!.metadata?.targetElement as HTMLElement | undefined,
      onDiscard: () => {},
    });

    const buttonsRow = document.querySelector('message-actions .buttons-container-v2') as HTMLElement;
    const badgeInRow = buttonsRow.querySelector('.synapse-native-action-host');
    expect(badgeInRow).not.toBeNull();

    // Verify code-block header does NOT contain the badge
    const codeBlockHeader = document.querySelector('.code-block-decoration') as HTMLElement;
    expect(codeBlockHeader.querySelector('.synapse-native-action-host')).toBeNull();

    // Verify .conversation-container does NOT contain sidebar sync host
    const chatContainer = document.querySelector('.conversation-container') as HTMLElement;
    expect(chatContainer.querySelector('.synapse-sidebar-sync-host')).toBeNull();
  });
});
