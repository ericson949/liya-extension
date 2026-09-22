/**
 * Sanitizer rule definition for masking sensitive data.
 */

export interface SanitizerRuleProps {
  id: string;
  name: string;
  pattern: RegExp;
  maskReplacement: string | ((match: string) => string);
}

export class SanitizerRule {
  public readonly id: string;
  public readonly name: string;
  private readonly pattern: RegExp;
  private readonly maskReplacement: string | ((match: string) => string);

  constructor(props: SanitizerRuleProps) {
    this.id = props.id;
    this.name = props.name;
    // Ensure the regex has the global flag to replace all occurrences
    this.pattern = new RegExp(props.pattern.source, props.pattern.flags.includes('g') ? props.pattern.flags : `${props.pattern.flags}g`);
    this.maskReplacement = props.maskReplacement;
  }

  public apply(text: string): { sanitized: string; count: number } {
    let count = 0;
    // Reset regex lastIndex
    this.pattern.lastIndex = 0;

    const matches = text.match(this.pattern);
    if (!matches) {
      return { sanitized: text, count: 0 };
    }
    count = matches.length;

    const sanitized = text.replace(this.pattern, (match) => {
      if (typeof this.maskReplacement === 'function') {
        return this.maskReplacement(match);
      }
      return this.maskReplacement;
    });

    return { sanitized, count };
  }
}
