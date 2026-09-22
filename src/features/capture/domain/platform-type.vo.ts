import { ValueObject } from '@shared/domain/value-object';
import { Result } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/errors';

export type SupportedPlatform = 'CHATGPT' | 'CLAUDE' | 'GEMINI';

interface PlatformTypeProps {
  value: SupportedPlatform;
}

export class PlatformType extends ValueObject<PlatformTypeProps> {
  private constructor(props: PlatformTypeProps) {
    super(props);
  }

  public static create(raw: string): Result<PlatformType, ValidationError> {
    const upper = raw.toUpperCase();
    if (upper === 'CHATGPT' || upper === 'CLAUDE' || upper === 'GEMINI') {
      return Result.ok(new PlatformType({ value: upper as SupportedPlatform }));
    }

    return Result.err(
      new ValidationError('platform', `Unsupported platform: '${raw}'. Allowed: CHATGPT, CLAUDE, GEMINI`)
    );
  }

  public get value(): SupportedPlatform {
    return this.props.value;
  }

  public static fromUrl(url: string): Result<PlatformType, ValidationError> {
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
      return PlatformType.create('CHATGPT');
    }
    if (url.includes('claude.ai')) {
      return PlatformType.create('CLAUDE');
    }
    if (url.includes('gemini.google.com')) {
      return PlatformType.create('GEMINI');
    }

    return Result.err(new ValidationError('url', `URL does not match any supported AI platform: ${url}`));
  }
}
