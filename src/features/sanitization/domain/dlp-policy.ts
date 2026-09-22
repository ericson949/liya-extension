import { DLP_PATTERNS } from '@shared/utils/regex-patterns';
import { SanitizerRule } from './sanitizer-rule';
import { RedactedContent } from './redacted-content.vo';
import { Result } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/errors';

export class DLPPolicy {
  private readonly rules: SanitizerRule[];

  constructor(customRules?: SanitizerRule[]) {
    this.rules = customRules ?? DLPPolicy.createDefaultRules();
  }

  public static createDefaultRules(): SanitizerRule[] {
    return [
      new SanitizerRule({
        id: 'rule-private-key',
        name: 'Private Key',
        pattern: DLP_PATTERNS.PRIVATE_KEY,
        maskReplacement: '[REDACTED_PRIVATE_KEY]',
      }),
      // Bearer token before naked JWT to capture authorization header syntax
      new SanitizerRule({
        id: 'rule-bearer-token',
        name: 'Bearer Token',
        pattern: DLP_PATTERNS.BEARER_TOKEN,
        maskReplacement: 'Bearer [REDACTED_TOKEN]',
      }),
      new SanitizerRule({
        id: 'rule-jwt',
        name: 'JSON Web Token',
        pattern: DLP_PATTERNS.JWT,
        maskReplacement: '[REDACTED_JWT]',
      }),
      new SanitizerRule({
        id: 'rule-ai-key',
        name: 'AI API Key',
        pattern: DLP_PATTERNS.AI_API_KEY,
        maskReplacement: '[REDACTED_API_KEY]',
      }),
      new SanitizerRule({
        id: 'rule-aws-access-key',
        name: 'AWS Access Key ID',
        pattern: DLP_PATTERNS.AWS_ACCESS_KEY_ID,
        maskReplacement: '[REDACTED_AWS_ACCESS_KEY]',
      }),
      new SanitizerRule({
        id: 'rule-aws-secret',
        name: 'AWS Secret Key',
        pattern: DLP_PATTERNS.AWS_SECRET_KEY,
        maskReplacement: 'aws_secret: "[REDACTED_AWS_SECRET]"',
      }),
      new SanitizerRule({
        id: 'rule-credit-card',
        name: 'Credit Card',
        pattern: DLP_PATTERNS.CREDIT_CARD,
        maskReplacement: '[REDACTED_CREDIT_CARD]',
      }),
      new SanitizerRule({
        id: 'rule-us-ssn',
        name: 'US Social Security Number',
        pattern: DLP_PATTERNS.US_SSN,
        maskReplacement: '[REDACTED_SSN]',
      }),
      new SanitizerRule({
        id: 'rule-email',
        name: 'Email Address',
        pattern: DLP_PATTERNS.EMAIL,
        maskReplacement: '[REDACTED_EMAIL]',
      }),
    ];
  }

  public sanitize(text: string): Result<RedactedContent, ValidationError> {
    if (typeof text !== 'string') {
      return Result.err(new ValidationError('text', 'Expected string input for sanitization'));
    }

    const originalLength = text.length;
    let currentText = text;
    let totalRedactions = 0;

    for (const rule of this.rules) {
      const { sanitized, count } = rule.apply(currentText);
      currentText = sanitized;
      totalRedactions += count;
    }

    return RedactedContent.create(currentText, originalLength, totalRedactions);
  }
}
