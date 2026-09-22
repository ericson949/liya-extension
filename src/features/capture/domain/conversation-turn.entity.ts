import { Entity } from '@shared/domain/entity';
import { TurnHash } from './turn-hash.vo';
import { PlatformType } from './platform-type.vo';
import { Prompt } from './prompt.vo';
import { Response } from './response.vo';
import { RedactedContent } from '@features/sanitization/domain/redacted-content.vo';

export interface ConversationTurnProps {
  hash: TurnHash;
  platform: PlatformType;
  prompt: Prompt;
  response: Response;
  promptRedacted: RedactedContent;
  responseRedacted: RedactedContent;
  capturedAt: Date;
  conversationId?: string;
  turnIndex?: number;
}

export class ConversationTurn extends Entity<TurnHash> {
  public readonly platform: PlatformType;
  public readonly prompt: Prompt;
  public readonly response: Response;
  public readonly promptRedacted: RedactedContent;
  public readonly responseRedacted: RedactedContent;
  public readonly capturedAt: Date;
  public readonly conversationId?: string;
  public readonly turnIndex?: number;

  constructor(props: ConversationTurnProps) {
    super(props.hash);
    this.platform = props.platform;
    this.prompt = props.prompt;
    this.response = props.response;
    this.promptRedacted = props.promptRedacted;
    this.responseRedacted = props.responseRedacted;
    this.capturedAt = props.capturedAt;
    this.conversationId = props.conversationId;
    this.turnIndex = props.turnIndex;
  }

  public get hash(): TurnHash {
    return this._id;
  }

  public toJSON() {
    return {
      hash: this.hash.getValue(),
      platform: this.platform.value,
      prompt: this.promptRedacted.content,
      response: this.responseRedacted.content,
      capturedAt: this.capturedAt.toISOString(),
      conversationId: this.conversationId,
      turnIndex: this.turnIndex,
      redactionStats: {
        promptRedactions: this.promptRedacted.redactionCount,
        responseRedactions: this.responseRedacted.redactionCount,
        originalPromptLength: this.promptRedacted.originalLength,
        originalResponseLength: this.responseRedacted.originalLength,
      },
    };
  }
}
