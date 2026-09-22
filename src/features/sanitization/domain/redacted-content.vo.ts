import { ValueObject } from '@shared/domain/value-object';
import { Result } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/errors';

interface RedactedContentProps {
  originalLength: number;
  redactedLength: number;
  content: string;
  redactionCount: number;
}

export class RedactedContent extends ValueObject<RedactedContentProps> {
  private constructor(props: RedactedContentProps) {
    super(props);
  }

  public static create(
    content: string,
    originalLength: number,
    redactionCount: number
  ): Result<RedactedContent, ValidationError> {
    if (typeof content !== 'string') {
      return Result.err(new ValidationError('content', 'Content must be a string.'));
    }

    return Result.ok(
      new RedactedContent({
        originalLength,
        redactedLength: content.length,
        content,
        redactionCount,
      })
    );
  }

  public get content(): string {
    return this.props.content;
  }

  public get originalLength(): number {
    return this.props.originalLength;
  }

  public get redactedLength(): number {
    return this.props.redactedLength;
  }

  public get redactionCount(): number {
    return this.props.redactionCount;
  }

  public wasRedacted(): boolean {
    return this.props.redactionCount > 0;
  }
}
