import { getI18n } from '@shared/utils/i18n';
import { SidebarConversationItem } from '../../ports/platform-extractor.strategy';
import { LiyaTooltipPortal } from './badge.shadow';

export type SyncLevel = 'NONE' | 'PARTIAL' | 'FULL';

export interface ConversationSyncInfo {
  level: SyncLevel;
  syncedTurns: number;
  totalTurns: number;
}

export class SidebarSyncUI {
  /**
   * Injects or updates a subtle, non-intrusive 3-level sync indicator icon
   * into a sidebar conversation item.
   */
  public renderSyncIndicator(item: SidebarConversationItem, info: ConversationSyncInfo): void {
    if (typeof document === 'undefined' || !item.containerElement) return;

    // Strict guard: NEVER inject sidebar sync indicator into the main chat window or message containers!
    if (
      item.containerElement.closest(
        '#chat-history, chat-window, .chat-container, infinite-scroller, .conversation-container, main, [role="main"]'
      )
    ) {
      const misplaced = item.containerElement.querySelector('.liya-sidebar-sync-host, .synapse-sidebar-sync-host');
      if (misplaced) misplaced.remove();
      return;
    }

    // Proactively clean up any misplaced sidebar icons that leaked into chat window
    const leaked = document.querySelectorAll(
      '#chat-history .liya-sidebar-sync-host, #chat-history .synapse-sidebar-sync-host, chat-window .liya-sidebar-sync-host, chat-window .synapse-sidebar-sync-host, .conversation-container > .liya-sidebar-sync-host, .conversation-container > .synapse-sidebar-sync-host, infinite-scroller .liya-sidebar-sync-host, infinite-scroller .synapse-sidebar-sync-host'
    );
    leaked.forEach((el) => el.remove());

    const container = item.containerElement;
    let host = container.querySelector('.liya-sidebar-sync-host, .synapse-sidebar-sync-host') as HTMLElement | null;

    if (!host) {
      host = document.createElement('span');
      host.className = 'liya-sidebar-sync-host synapse-sidebar-sync-host';
      host.style.display = 'inline-flex';
      host.style.alignItems = 'center';
      host.style.justifyContent = 'center';
      host.style.alignSelf = 'center';
      host.style.flexShrink = '0';
      host.style.width = '18px';
      host.style.height = '18px';
      host.style.margin = '0 2px';
      host.style.padding = '0';
      host.style.position = 'relative';
      host.style.verticalAlign = 'middle';
      host.style.cursor = 'default';

      // Attach Closed Shadow DOM for isolated styling
      const shadow = host.attachShadow({ mode: 'closed' });
      (host as any)._liyaShadow = shadow;
      (host as any)._synapseShadow = shadow;

      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          vertical-align: middle;
        }
        .icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          position: relative;
          cursor: pointer;
        }
        .shield-svg {
          width: 14px;
          height: 14px;
          transition: stroke 0.2s ease, opacity 0.2s ease;
        }
        .status-dot {
          position: absolute;
          top: 1px;
          right: 1px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }

        /* 3 Levels of Visibility */
        /* Level 1: NONE (No messages synced) */
        .level-none .shield-svg {
          stroke: #6b7280;
          opacity: 0.38;
          fill: none;
        }
        .level-none .status-dot {
          display: none;
        }

        /* Level 2: PARTIAL (At least 1 message synced) */
        .level-partial .shield-svg {
          stroke: #f59e0b;
          opacity: 0.9;
          fill: rgba(245, 158, 11, 0.08);
        }
        .level-partial .status-dot {
          display: block;
          background-color: #f59e0b;
          box-shadow: 0 0 5px #f59e0b;
        }

        /* Level 3: FULL (All messages synced) */
        .level-full .shield-svg {
          stroke: #10b981;
          opacity: 1;
          fill: rgba(16, 185, 129, 0.12);
        }
        .level-full .status-dot {
          display: block;
          background-color: #10b981;
          box-shadow: 0 0 6px #10b981;
        }
      `;

      const content = document.createElement('div');
      content.className = 'icon-wrapper';

      shadow.appendChild(style);
      shadow.appendChild(content);

      // Connect to floating tooltip portal
      const portal = LiyaTooltipPortal.getInstance();
      host.addEventListener('mouseenter', () => {
        const text = host!.getAttribute('data-tooltip-text') || '';
        const currentInfo = (host as any)._syncInfo as ConversationSyncInfo | undefined;
        const statusColor =
          currentInfo?.level === 'FULL'
            ? '#10b981'
            : currentInfo?.level === 'PARTIAL'
            ? '#f59e0b'
            : '#6b7280';

        portal.show(host!, {
          savedText: text,
          statusColor,
        });
      });

      host.addEventListener('mouseleave', () => {
        portal.hide(100);
      });

      // Insert into container
      this.insertHostIntoContainer(container, host);
    }

    // Update content and status level
    this.updateHostContent(host, info);
  }

  private insertHostIntoContainer(container: HTMLElement, host: HTMLElement): void {
    // 1. ChatGPT sidebar: target the primary flex title row (e.g. .flex.min-w-0.grow.items-center)
    const flexTitleRow = container.querySelector<HTMLElement>(
      'div.flex.grow.items-center, div.flex.items-center.grow, div.grow.flex.items-center, div.flex.min-w-0.grow.items-center, div[class*="grow"][class*="items-center"], .flex.min-w-0.grow'
    );
    if (flexTitleRow) {
      flexTitleRow.appendChild(host);
      return;
    }

    // 2. Target the outer text block (.truncate, [class*="truncate"], .conversation-title, .title)
    // and place host AFTER it as a sibling in its parent row, NEVER inside the text block!
    const textBlock = container.querySelector<HTMLElement>(
      '.truncate, [class*="truncate"], .conversation-title, .title'
    );
    if (textBlock && textBlock.parentElement) {
      textBlock.insertAdjacentElement('afterend', host);
      return;
    }

    // 3. If container has a trailing actions container (.trailing, .actions, [data-trailing-button]), insert before it
    const trailingContainer = container.querySelector<HTMLElement>(
      '.trailing, [data-trailing-button], .conversation-actions'
    );
    if (trailingContainer) {
      let current: HTMLElement | null = trailingContainer;
      while (current && current.parentElement && current.parentElement !== container) {
        current = current.parentElement;
      }
      if (current && current.parentElement === container) {
        container.insertBefore(host, current);
        return;
      }
    }

    // 4. Options button fallback
    const optionsBtn = container.querySelector<HTMLElement>('button, [role="button"], mat-icon, .actions');
    if (optionsBtn) {
      let current: HTMLElement | null = optionsBtn;
      while (current && current.parentElement && current.parentElement !== container) {
        current = current.parentElement;
      }
      if (current && current.parentElement === container) {
        container.insertBefore(host, current);
        return;
      }
    }

    // 5. Fallback
    container.appendChild(host);
  }

  private updateHostContent(host: HTMLElement, info: ConversationSyncInfo): void {
    (host as any)._syncInfo = info;
    const shadow = (host as any)._liyaShadow || (host as any)._synapseShadow || host.shadowRoot;
    const content = shadow?.querySelector('.icon-wrapper') as HTMLElement | null;
    if (!content) return;

    const i18n = getI18n();

    let levelClass = 'level-none';
    let tooltipText = i18n.sidebarSyncNone;

    if (info.level === 'FULL') {
      levelClass = 'level-full';
      tooltipText = i18n.sidebarSyncFull;
    } else if (info.level === 'PARTIAL') {
      levelClass = 'level-partial';
      tooltipText = i18n.sidebarSyncPartial(info.syncedTurns, info.totalTurns);
    }

    host.setAttribute('data-tooltip-text', tooltipText);
    host.title = tooltipText;

    content.className = `icon-wrapper ${levelClass}`;
    content.innerHTML = `
      <svg class="shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 11 14 15 10"></polyline>
      </svg>
      <span class="status-dot"></span>
      <div class="tooltip" style="display: none;">${tooltipText}</div>
    `;
  }
}
