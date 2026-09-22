import { browserAPI } from '@shared/utils/browser-api';
import { Result } from '@shared/domain/result';
import { DomainError } from '@shared/domain/errors';
import { TurnHash } from '../domain/turn-hash.vo';

export class DiscardTurnUseCase {
  public async execute(turnHash: TurnHash): Promise<Result<void, DomainError>> {
    try {
      if (typeof browserAPI?.runtime?.sendMessage === 'function') {
        await browserAPI.runtime.sendMessage({
          type: 'TURN_DISCARDED',
          payload: { turnHash: turnHash.getValue() },
        });
      }
      return Result.ok(undefined);
    } catch (err) {
      return Result.err(err as DomainError);
    }
  }
}
