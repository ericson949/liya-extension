import { BadgeUIPort, BadgeRenderOptions } from '../../ports/badge-ui.port';
import { getI18n } from '@shared/utils/i18n';

export interface TooltipData {
  turnHash?: string;
  savedText: string;
  notSavedText?: string;
  doNotSaveText?: string;
  redactionsText?: string;
  statusColor?: string;
  isDiscarded?: boolean;
  onDiscard?: () => void;
}

/**
 * Radix-style floating tooltip portal mounted on document.body.
 * Ensures tooltips are NEVER clipped by parent mask-image, overflow: hidden, or z-index stacking contexts.
 */
export class LiyaTooltipPortal {
  private static instance: LiyaTooltipPortal | null = null;
  private portalHost: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private tooltipEl: HTMLElement | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAnchor: HTMLElement | null = null;
  private currentData: TooltipData | null = null;

  public static getInstance(): LiyaTooltipPortal {
    if (!LiyaTooltipPortal.instance) {
      LiyaTooltipPortal.instance = new LiyaTooltipPortal();
    }
    return LiyaTooltipPortal.instance;
  }

  private ensurePortal(): void {
    if (typeof document === 'undefined' || !document.body) return;
    if (this.portalHost && this.portalHost.isConnected) return;

    this.portalHost = document.createElement('div');
    this.portalHost.id = 'liya-tooltip-portal';
    this.portalHost.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 2147483647;
      pointer-events: none;
    `;

    this.shadow = this.portalHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .tooltip {
        position: fixed;
        background: rgba(18, 24, 34, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.65), 0 4px 6px -2px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: #f3f4f6;
        padding: 8px 12px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        line-height: 1.4;
        white-space: nowrap;
        pointer-events: auto;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.15s;
        z-index: 2147483647;
      }
      .tooltip.visible {
        opacity: 1;
        visibility: visible;
      }
      .tooltip-arrow {
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
      }
      /* Arrow when tooltip is below anchor */
      .tooltip[data-placement="bottom"] .tooltip-arrow {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 0 5px 5px 5px;
        border-color: transparent transparent rgba(18, 24, 34, 0.98) transparent;
      }
      /* Arrow when tooltip is above anchor */
      .tooltip[data-placement="top"] .tooltip-arrow {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px 5px 0 5px;
        border-color: rgba(18, 24, 34, 0.98) transparent transparent transparent;
      }
      .tooltip-title {
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #e2e8f0;
      }
      .tooltip-status {
        color: #10b981;
      }
      .tooltip-redactions {
        margin-top: 3px;
        color: #fbbf24;
        font-size: 10px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .tooltip-actions {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: flex-end;
      }
      .discard-link {
        background: transparent;
        border: none;
        color: #f87171;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        padding: 2px 5px;
        border-radius: 4px;
        transition: background-color 0.15s ease, color 0.15s ease;
      }
      .discard-link:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #ffffff;
      }
    `;

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'tooltip';

    this.tooltipEl.addEventListener('mouseenter', () => {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
    });

    this.tooltipEl.addEventListener('mouseleave', () => {
      this.hide();
    });

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.tooltipEl);
    document.body.appendChild(this.portalHost);

    window.addEventListener('scroll', () => {
      if (this.tooltipEl?.classList.contains('visible')) {
        this.updatePosition();
      }
    }, { passive: true });
  }

  public show(anchor: HTMLElement, data: TooltipData): void {
    if (typeof document === 'undefined') return;
    this.ensurePortal();
    if (!this.tooltipEl) return;

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.currentAnchor = anchor;
    this.currentData = data;

    this.renderContent();
    this.updatePosition();

    this.tooltipEl.classList.add('visible');
  }

  private renderContent(): void {
    if (!this.tooltipEl || !this.currentData) return;
    const d = this.currentData;

    if (d.isDiscarded) {
      this.tooltipEl.innerHTML = `
        <div class="tooltip-arrow"></div>
        <div class="tooltip-title">
          <span style="color: #ef4444;">✕</span>
          <span>${d.notSavedText}</span>
        </div>
      `;
      return;
    }

    const redactionsHtml = d.redactionsText
      ? `<div class="tooltip-redactions">🔒 ${d.redactionsText}</div>`
      : '';

    const actionsHtml = d.doNotSaveText
      ? `<div class="tooltip-actions"><button class="discard-link" type="button">${d.doNotSaveText}</button></div>`
      : '';

    const statusColor = d.statusColor || '#10b981';

    this.tooltipEl.innerHTML = `
      <div class="tooltip-arrow"></div>
      <div class="tooltip-title">
        <span class="tooltip-status" style="color: ${statusColor};">●</span>
        <span>${d.savedText}</span>
      </div>
      ${redactionsHtml}
      ${actionsHtml}
    `;

    const discardBtn = this.tooltipEl.querySelector('.discard-link') as HTMLButtonElement | null;
    if (discardBtn && d.onDiscard) {
      discardBtn.onclick = (e) => {
        e.stopPropagation();
        d.isDiscarded = true;
        d.onDiscard!();
        this.renderContent();
        this.updatePosition();
      };
    }
  }

  public updatePosition(): void {
    if (!this.tooltipEl || !this.currentAnchor || !this.currentAnchor.isConnected) return;

    const rect = this.currentAnchor.getBoundingClientRect();
    const viewportHeight = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 800);
    const viewportWidth = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 1200);

    let placement: 'bottom' | 'top' = 'bottom';
    let top = rect.bottom + 8;

    if (viewportHeight - rect.bottom < 90 && rect.top > 90) {
      placement = 'top';
      top = rect.top - 8;
    }

    this.tooltipEl.dataset.placement = placement;

    const anchorCenterX = rect.left + rect.width / 2;
    const tooltipWidth = this.tooltipEl.offsetWidth || 180;
    const minLeft = tooltipWidth / 2 + 12;
    const maxLeft = viewportWidth - tooltipWidth / 2 - 12;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, anchorCenterX));

    this.tooltipEl.style.top = `${Math.round(top)}px`;
    this.tooltipEl.style.left = `${Math.round(clampedLeft)}px`;
    this.tooltipEl.style.transform =
      placement === 'top'
        ? 'translateX(-50%) translateY(-100%)'
        : 'translateX(-50%) translateY(0)';

    const arrowEl = this.tooltipEl.querySelector<HTMLElement>('.tooltip-arrow');
    if (arrowEl) {
      const arrowOffset = anchorCenterX - (clampedLeft - tooltipWidth / 2);
      arrowEl.style.left = `${Math.round(Math.max(12, Math.min(tooltipWidth - 12, arrowOffset)))}px`;
    }
  }

  public hide(delayMs = 120): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.hideTimer = setTimeout(() => {
      if (this.tooltipEl) {
        this.tooltipEl.classList.remove('visible');
      }
      this.currentAnchor = null;
      this.currentData = null;
      this.hideTimer = null;
    }, delayMs);
  }

  public hideImmediately(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.tooltipEl) {
      this.tooltipEl.classList.remove('visible');
    }
    this.currentAnchor = null;
    this.currentData = null;
  }
}

export class BadgeShadowUI implements BadgeUIPort {
  private activeBadges: Map<string, HTMLElement> = new Map();

  /**
   * Injects a subtle, native-matching icon button directly on the SAME LINE as the native
   * action buttons (Copy, Thumbs up, More...), with a Radix-style floating body portal tooltip.
   */
  public renderBadge(options: BadgeRenderOptions): void {
    if (typeof document === 'undefined') return;

    // Check if target element or enclosing turn is already badged
    if (options.targetElement) {
      const target = options.targetElement;
      const turnContainer =
        (target.closest(
          'article, .agent-turn, [data-testid^="conversation-turn"], .group\\/turn-messages, [data-conversation-screenshot-content]'
        ) as HTMLElement) || target;

      if (
        target.querySelector('.liya-native-action-host, .synapse-native-action-host') ||
        turnContainer.querySelector(`.liya-native-action-host[data-turn-hash="${options.turnHash}"], .liya-native-action-host[data-liya-hash="${options.turnHash}"], .synapse-native-action-host[data-synapse-hash="${options.turnHash}"]`) ||
        turnContainer.querySelector('.liya-native-action-host, .synapse-native-action-host')
      ) {
        return;
      }
    }

    // Prevent duplicate badge on the same turn
    this.removeBadge(options.turnHash);

    // 1. Create the host element for the isolated Closed Shadow DOM
    const iconHost = document.createElement('span');
    iconHost.className = 'liya-native-action-host synapse-native-action-host';
    iconHost.setAttribute('data-turn-hash', options.turnHash);
    iconHost.setAttribute('data-liya-hash', options.turnHash);
    iconHost.setAttribute('data-synapse-hash', options.turnHash);
    iconHost.style.display = 'inline-flex';
    iconHost.style.alignItems = 'center';
    iconHost.style.justifyContent = 'center';
    iconHost.style.verticalAlign = 'middle';
    iconHost.style.alignSelf = 'center';
    iconHost.style.flexShrink = '0';
    iconHost.style.width = '32px';
    iconHost.style.height = '32px';
    iconHost.style.margin = '0 0 0 2px';
    iconHost.style.padding = '0';
    iconHost.style.position = 'relative';
    iconHost.style.lineHeight = '0';
    iconHost.style.pointerEvents = 'auto';

    const shadow = iconHost.attachShadow({ mode: 'closed' });

    // 2. Native-matching styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        position: relative;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        vertical-align: middle;
        pointer-events: auto;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: transparent;
        border: none;
        cursor: pointer;
        color: #9ca3af;
        position: relative;
        transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
        padding: 0;
        margin: 0;
        line-height: 0;
        pointer-events: auto;
      }
      .action-btn:hover {
        background: rgba(125, 125, 125, 0.15);
        color: #60a5fa;
      }
      .action-btn:active {
        transform: scale(0.92);
      }
      .action-btn.discarded {
        color: #ef4444;
        opacity: 0.6;
      }
      .active-dot {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background-color: #10b981;
        box-shadow: 0 0 5px #10b981;
      }
      .action-btn.discarded .active-dot {
        background-color: #ef4444;
        box-shadow: 0 0 5px #ef4444;
      }
      .icon-svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `;

    const i18n = getI18n();

    const button = document.createElement('button');
    button.className = 'action-btn';
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', i18n.savedInLiya || i18n.savedInSynapse);
    button.title = i18n.savedInLiya || i18n.savedInSynapse;
    button.innerHTML = `
      <svg class="icon-svg" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 11 14 15 10"></polyline>
      </svg>
      <span class="active-dot"></span>
    `;

    let isDiscarded = false;
    const portal = LiyaTooltipPortal.getInstance();

    button.addEventListener('mouseenter', () => {
      portal.show(button, {
        turnHash: options.turnHash,
        savedText: i18n.savedInLiya || i18n.savedInSynapse,
        notSavedText: i18n.notSaved,
        doNotSaveText: i18n.doNotSave,
        redactionsText:
          options.redactionsCount && options.redactionsCount > 0
            ? i18n.secretsRedacted(options.redactionsCount)
            : undefined,
        isDiscarded,
        onDiscard: () => {
          isDiscarded = true;
          options.onDiscard(options.turnHash);
          button.className = 'action-btn discarded';
          button.title = i18n.notSaved;
          button.setAttribute('aria-label', i18n.notSaved);
          button.innerHTML = `
            <svg class="icon-svg" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <line x1="4" y1="4" x2="20" y2="20"></line>
            </svg>
            <span class="active-dot"></span>
          `;
        },
      });
    });

    button.addEventListener('mouseleave', () => {
      portal.hide(150);
    });

    shadow.appendChild(style);
    shadow.appendChild(button);

    // 3. Resolve target response element for this specific turn
    const targetEl = this.resolveTargetResponseElement(options);
    let inserted = false;

    if (targetEl) {
      inserted = this.insertIntoResponseToolbar(targetEl, iconHost);
    }

    if (!inserted) {
      const fallbackEl = this.findAssistantResponseElement(options.platform);
      if (fallbackEl) {
        fallbackEl.appendChild(iconHost);
        inserted = true;
      }
    }

    if (targetEl) {
      targetEl.setAttribute('data-liya-badged', 'true');
      targetEl.setAttribute('data-synapse-badged', 'true');
      const turnContainer = targetEl.closest(
        'article, .agent-turn, [data-testid^="conversation-turn"], .group\\/turn-messages'
      );
      if (turnContainer) {
        turnContainer.setAttribute('data-liya-badged', 'true');
        turnContainer.setAttribute('data-synapse-badged', 'true');
      }
    }

    this.activeBadges.set(options.turnHash, iconHost);
  }

  /**
   * Resolves the specific assistant response element that matches this turn.
   */
  private resolveTargetResponseElement(options: BadgeRenderOptions): HTMLElement | null {
    if (options.targetElement && options.targetElement.isConnected) {
      return options.targetElement;
    }

    const platform = options.platform;
    let candidates: HTMLElement[] = [];

    if (platform === 'GEMINI') {
      candidates = Array.from(
        document.querySelectorAll('model-response, message-content, .response-container')
      ) as HTMLElement[];
    } else if (platform === 'CHATGPT') {
      candidates = Array.from(
        document.querySelectorAll(
          'article[data-testid^="conversation-turn"], .agent-turn, [data-conversation-screenshot-content], div[data-message-author-role="assistant"]'
        )
      ) as HTMLElement[];
    } else if (platform === 'CLAUDE') {
      candidates = Array.from(
        document.querySelectorAll('.font-claude-message, [data-testid="assistant-message"], div[class*="ChatMessage"]')
      ) as HTMLElement[];
    }

    if (candidates.length === 0) return null;

    // 1. Try to match by response text snippet
    if (options.responsePreview && options.responsePreview.length >= 10) {
      const snippet = options.responsePreview.slice(0, 50).trim();
      const matched = candidates.find((el) => el.innerText?.includes(snippet));
      if (matched) return matched;
    }

    // 2. Try to find the latest candidate that does NOT have a badge yet
    for (let i = candidates.length - 1; i >= 0; i--) {
      const el = candidates[i];
      if (
        el &&
        !el.querySelector('.liya-native-action-host, .synapse-native-action-host') &&
        !el.hasAttribute('data-liya-badged') &&
        !el.hasAttribute('data-synapse-badged')
      ) {
        return el;
      }
    }

    // 3. Fallback to last candidate
    return candidates[candidates.length - 1] ?? null;
  }

  /**
   * Given any button in a toolbar, traverses up the DOM to identify the actual horizontal
   * flex container (the toolbar row) and returns both the flex container and the top-level
   * child in that row, so our icon becomes a sibling in the flex row rather than getting
   * trapped inside an individual button's wrapper (such as a dropdown menu wrapper).
   */
  private findFlexRowAndLastItem(anchorBtn: HTMLElement): { flexRow: HTMLElement; lastItem: HTMLElement } | null {
    let current: HTMLElement | null = anchorBtn;

    while (current && current.parentElement && current.parentElement !== document.body) {
      const parentEl: HTMLElement = current.parentElement;
      const style = window.getComputedStyle ? window.getComputedStyle(parentEl) : null;
      const isFlex =
        (style && (style.display === 'flex' || style.display === 'inline-flex')) ||
        parentEl.classList.contains('flex') ||
        parentEl.classList.contains('inline-flex') ||
        parentEl.getAttribute('role') === 'group';
      const isRow = !style?.flexDirection?.includes('column');

      // Check if parent has horizontal flex layout and contains multiple action items
      if (isFlex && isRow && parentEl.children.length >= 2) {
        const lastChildInRow = (parentEl.lastElementChild as HTMLElement) ?? current;
        return { flexRow: parentEl, lastItem: lastChildInRow };
      }

      current = parentEl;
    }

    return null;
  }

  /**
   * Finds the native toolbar in a specific assistant response and inserts our icon host
   * directly into the horizontal flex row so it is on the EXACT same line as Copy, Thumbs, More...
   */
  private insertIntoResponseToolbar(targetEl: HTMLElement, iconHost: HTMLElement): boolean {
    try {
      // Clean up any misplaced action buttons in code blocks or user queries
      const misplacedBadges = document.querySelectorAll(
        'code-block .liya-native-action-host, code-block .synapse-native-action-host, .code-block-decoration .liya-native-action-host, .code-block-decoration .synapse-native-action-host, user-query .liya-native-action-host, user-query .synapse-native-action-host, .user-query-container .liya-native-action-host, pre .liya-native-action-host'
      );
      misplacedBadges.forEach((el) => el.remove());

      // 1. Identify enclosing turn container if targetEl is an inner message text container
      const turnContainer =
        (targetEl.closest(
          'article, .agent-turn, [data-testid^="conversation-turn"], .group\\/turn-messages, [data-conversation-screenshot-content], model-response, .conversation-container'
        ) as HTMLElement) || targetEl.parentElement?.parentElement || targetEl.parentElement || targetEl;

      // 2. Google Gemini: specifically target message-actions button container
      const geminiButtonRow = (turnContainer || targetEl).querySelector<HTMLElement>(
        'message-actions .buttons-container-v2, message-actions .actions-container-v2, message-actions [class*="buttons-container"], message-actions [class*="actions-container"]'
      );
      if (geminiButtonRow) {
        if (!geminiButtonRow.querySelector('.liya-native-action-host, .synapse-native-action-host')) {
          geminiButtonRow.appendChild(iconHost);
          return true;
        }
      }

      // 3. Search for explicit native action bar / button group in turnContainer or targetEl
      const candidateGroups = Array.from(
        (turnContainer || targetEl).querySelectorAll<HTMLElement>(
          'div[aria-label*="action" i], div[aria-label*="Action" i], div[role="group"], message-actions, [data-test-id="action-wrapper"], .actions-container'
        )
      ).filter(
        (g) => !g.closest('code-block, .code-block, .code-block-decoration, user-query, .user-query-container')
      );

      // Prioritize the action group that contains response action buttons (e.g. Copy, Thumbs, More)
      const actionGroup =
        candidateGroups.find((g) => g.querySelectorAll('button, [role="button"]').length > 0) ||
        candidateGroups[0];

      if (actionGroup) {
        const groupButtons = Array.from(
          actionGroup.querySelectorAll<HTMLElement>('button, [role="button"]')
        );
        if (groupButtons.length > 0) {
          const lastBtn = groupButtons[groupButtons.length - 1];
          if (lastBtn) {
            const rowInfo = this.findFlexRowAndLastItem(lastBtn);
            if (rowInfo) {
              rowInfo.flexRow.appendChild(iconHost);
              return true;
            }
          }
        }
        actionGroup.appendChild(iconHost);
        return true;
      }

      // 4. If no explicit action group, look for buttons across turnContainer or targetEl
      const allButtons = Array.from(
        (turnContainer || targetEl).querySelectorAll<HTMLElement>(
          'button[data-testid*="turn-action"], button[data-testid="copy-turn-action-button"], button[aria-label*="Copier"], button[aria-label*="Copy"], mat-icon-button, button, [role="button"]'
        )
      ).filter(
        (btn) =>
          !btn.closest(
            'pre, code, textarea, input, code-block, .code-block, .code-block-decoration, .formatted-code-block-internal-container, user-query, .user-query-container'
          )
      );

      if (allButtons.length > 0) {
        const anchor = allButtons[allButtons.length - 1];
        if (anchor) {
          const rowInfo = this.findFlexRowAndLastItem(anchor);
          if (rowInfo) {
            rowInfo.flexRow.appendChild(iconHost);
            return true;
          }
        }
      }

      // 5. Fallback: append to message footer or targetEl (never inside code block)
      const safeContainer =
        (turnContainer || targetEl).querySelector<HTMLElement>(
          'message-actions, .response-footer, .response-container-footer'
        ) || targetEl;
      safeContainer.appendChild(iconHost);
      return true;
    } catch {
      return false;
    }
  }

  private findAssistantResponseElement(platform: string): HTMLElement | null {
    try {
      if (platform === 'GEMINI') {
        const responses = document.querySelectorAll('model-response, message-content, .response-container');
        if (responses.length > 0) {
          return responses[responses.length - 1] as HTMLElement;
        }
      } else if (platform === 'CLAUDE') {
        const responses = document.querySelectorAll('.font-claude-message, [data-testid="assistant-message"], div[class*="ChatMessage"]');
        if (responses.length > 0) {
          return responses[responses.length - 1] as HTMLElement;
        }
      } else if (platform === 'CHATGPT') {
        const responses = document.querySelectorAll(
          'article[data-testid^="conversation-turn"], .agent-turn, [data-conversation-screenshot-content], div[data-message-author-role="assistant"]'
        );
        if (responses.length > 0) {
          return responses[responses.length - 1] as HTMLElement;
        }
      }
    } catch {
      // Defensive
    }
    return null;
  }

  public removeBadge(turnHash: string): void {
    const el = this.activeBadges.get(turnHash);
    if (el) {
      el.remove();
      this.activeBadges.delete(turnHash);
      LiyaTooltipPortal.getInstance().hideImmediately();
    }
  }

  public clearAllBadges(): void {
    this.activeBadges.forEach((el) => el.remove());
    this.activeBadges.clear();
    LiyaTooltipPortal.getInstance().hideImmediately();
  }
}

export { LiyaTooltipPortal as SynapseTooltipPortal };
