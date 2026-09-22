import { RawTurnDTO, SanitizedTurnDTO } from '@features/capture/domain/raw-turn.dto';
import { DLPPolicy } from '../domain/dlp-policy';
import { Result } from '@shared/domain/result';
import { DomainError } from '@shared/domain/errors';
import { Prompt } from '@features/capture/domain/prompt.vo';
import { Response } from '@features/capture/domain/response.vo';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';

export class SanitizeTurnUseCase {
  constructor(private readonly dlpPolicy: DLPPolicy = new DLPPolicy()) {}

  public async execute(rawTurn: RawTurnDTO): Promise<Result<SanitizedTurnDTO, DomainError>> {
    // 1. Invariant validation for Prompt
    const promptValidation = Prompt.create(rawTurn.prompt);
    if (promptValidation.isFailure()) {
      return Result.err(promptValidation.getError());
    }

    // 2. Invariant validation for Response
    const responseValidation = Response.create(rawTurn.response);
    if (responseValidation.isFailure()) {
      return Result.err(responseValidation.getError());
    }

    // 3. Apply DLP redactions to prompt
    const promptSanitization = this.dlpPolicy.sanitize(rawTurn.prompt);
    if (promptSanitization.isFailure()) {
      return Result.err(promptSanitization.getError());
    }
    const redactedPrompt = promptSanitization.getValue();

    // 4. Apply DLP redactions to response
    const responseSanitization = this.dlpPolicy.sanitize(rawTurn.response);
    if (responseSanitization.isFailure()) {
      return Result.err(responseSanitization.getError());
    }
    const redactedResponse = responseSanitization.getValue();

    // 5. Generate immutable turn hash from sanitized contents
    const turnHashVo = await TurnHash.create(redactedPrompt.content, redactedResponse.content);

    const sanitizedDto: SanitizedTurnDTO = {
      platform: rawTurn.platform,
      prompt: redactedPrompt.content,
      response: redactedResponse.content,
      conversationId: rawTurn.conversationId,
      turnIndex: rawTurn.turnIndex,
      timestamp: rawTurn.timestamp,
      turnHash: turnHashVo.getValue(),
      metadata: {
        promptRedactions: redactedPrompt.redactionCount,
        responseRedactions: redactedResponse.redactionCount,
        originalPromptLength: redactedPrompt.originalLength,
        originalResponseLength: redactedResponse.originalLength,
        ...rawTurn.metadata,
      },
    };

    return Result.ok(sanitizedDto);
  }
}
