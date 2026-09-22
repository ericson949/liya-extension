import { PlatformExtractorStrategy } from '../ports/platform-extractor.strategy';
import { ChatGPTAdapter } from './adapters/chatgpt.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { EntityNotFoundError } from '@shared/domain/errors';

export class PlatformAdapterFactory {
  private static readonly adapters: PlatformExtractorStrategy[] = [
    new ChatGPTAdapter(),
    new ClaudeAdapter(),
    new GeminiAdapter(),
  ];

  /**
   * Instantiates the correct platform extraction strategy based on the current URL.
   */
  public static create(url: string): PlatformExtractorStrategy {
    const adapter = this.adapters.find((a) => a.matches(url));

    if (!adapter) {
      throw new EntityNotFoundError('PlatformAdapter', url);
    }

    return adapter;
  }

  /**
   * Returns all supported adapters
   */
  public static getAll(): PlatformExtractorStrategy[] {
    return [...this.adapters];
  }
}
