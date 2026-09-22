import { RawTurnDTO } from '../domain/raw-turn.dto';
import { SanitizeTurnUseCase } from '@features/sanitization/application/sanitize-turn.usecase';
import { BadgeUIPort } from '../ports/badge-ui.port';
import { browserAPI } from '@shared/utils/browser-api';
import { Result } from '@shared/domain/result';
import { DomainError } from '@shared/domain/errors';

export class CaptureTurnUseCase {
  constructor(
    private readonly sanitizeUseCase: SanitizeTurnUseCase = new SanitizeTurnUseCase(),
    private readonly badgeUI?: BadgeUIPort
  ) {}

  public async execute(rawTurn: RawTurnDTO): Promise<Result<string, DomainError>> {
    // 1. Sanitize turn and validate invariants
    const sanitizeResult = await this.sanitizeUseCase.execute(rawTurn);
    if (sanitizeResult.isFailure()) {
      return Result.err(sanitizeResult.getError());
    }

    const sanitized = sanitizeResult.getValue();

    // 2. Dispatch turn to Service Worker for session aggregation & debounced sync
    try {
      if (typeof browserAPI?.runtime?.sendMessage === 'function') {
        const { targetElement, ...serializableMetadata } = (sanitized.metadata as Record<string, unknown>) || {};
        await browserAPI.runtime.sendMessage({
          type: 'TURN_CAPTURED',
          payload: {
            ...sanitized,
            metadata: serializableMetadata,
          },
        });
      }
    } catch {
      // SW might be temporarily sleeping or reloading
    }

    if (this.badgeUI) {
      const promptRedactions = sanitized.metadata?.promptRedactions ?? 0;
      const responseRedactions = sanitized.metadata?.responseRedactions ?? 0;
      const targetElement = (sanitized.metadata as any)?.targetElement as HTMLElement | undefined;

      this.badgeUI.renderBadge({
        turnHash: sanitized.turnHash,
        platform: sanitized.platform,
        promptPreview: sanitized.prompt.slice(0, 40),
        responsePreview: sanitized.response.slice(0, 100),
        targetElement,
        redactionsCount: promptRedactions + responseRedactions,
        onDiscard: async (hashToDiscard) => {
          try {
            if (typeof browserAPI?.runtime?.sendMessage === 'function') {
              await browserAPI.runtime.sendMessage({
                type: 'TURN_DISCARDED',
                payload: { turnHash: hashToDiscard },
              });
            }
          } catch {
            // Defensive
          }
        },
      });
    }

    return Result.ok(sanitized.turnHash);
  }
}
