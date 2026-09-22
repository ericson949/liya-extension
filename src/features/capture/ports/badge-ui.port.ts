/**
 * Outbound Port: BadgeUIPort
 * Manages the isolated Shadow DOM visual feedback badges on AI chat interfaces.
 */
export interface BadgeRenderOptions {
  turnHash: string;
  platform: string;
  promptPreview: string;
  responsePreview?: string;
  targetElement?: HTMLElement;
  redactionsCount?: number;
  onDiscard: (turnHash: string) => void;
}

export interface BadgeUIPort {
  renderBadge(options: BadgeRenderOptions): void;
  removeBadge(turnHash: string): void;
  clearAllBadges(): void;
}
