import { describe, it, expect } from 'vitest';
import { SanitizeTurnUseCase } from '@features/sanitization/application/sanitize-turn.usecase';
import { RawTurnDTO } from '@features/capture/domain/raw-turn.dto';

describe('SanitizeTurnUseCase & DLP Engine', () => {
  const useCase = new SanitizeTurnUseCase();

  it('redacts credit card numbers in prompt and response', async () => {
    const raw: RawTurnDTO = {
      platform: 'CHATGPT',
      prompt: 'Can you check this visa card 4532-1488-1234-5678 for fraud?',
      response: 'Sure, but never share 4532 1488 1234 5678 in plain text.',
      timestamp: Date.now(),
    };

    const result = await useCase.execute(raw);
    expect(result.isSuccess()).toBe(true);

    const sanitized = result.getValue();
    expect(sanitized.prompt).toContain('[REDACTED_CREDIT_CARD]');
    expect(sanitized.prompt).not.toContain('4532-1488-1234-5678');
    expect(sanitized.response).toContain('[REDACTED_CREDIT_CARD]');
    expect(sanitized.metadata?.promptRedactions).toBe(1);
    expect(sanitized.metadata?.responseRedactions).toBe(1);
  });

  it('redacts AWS keys and secrets', async () => {
    const raw: RawTurnDTO = {
      platform: 'CLAUDE',
      prompt: 'Here is my key: AKIAIOSFODNN7EXAMPLE and aws_secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
      response: 'Please revoke these credentials immediately for security.',
      timestamp: Date.now(),
    };

    const result = await useCase.execute(raw);
    expect(result.isSuccess()).toBe(true);

    const sanitized = result.getValue();
    expect(sanitized.prompt).toContain('[REDACTED_AWS_ACCESS_KEY]');
    expect(sanitized.prompt).toContain('[REDACTED_AWS_SECRET]');
    expect(sanitized.prompt).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  it('redacts JWT tokens and Bearer headers', async () => {
    const raw: RawTurnDTO = {
      platform: 'GEMINI',
      prompt: 'Use Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozGz_Wqsmwdfgdfg to auth',
      response: 'Authenticated request was successfully received and processed.',
      timestamp: Date.now(),
    };

    const result = await useCase.execute(raw);
    expect(result.isSuccess()).toBe(true);

    const sanitized = result.getValue();
    expect(sanitized.prompt).toContain('Bearer [REDACTED_TOKEN]');
    expect(sanitized.prompt).not.toContain('eyJhbGciOi');
  });

  it('redacts private keys', async () => {
    const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1+examplekeydata1234567890abcdef
-----END RSA PRIVATE KEY-----`;

    const raw: RawTurnDTO = {
      platform: 'CHATGPT',
      prompt: `Why does this key fail?\n${privateKey}`,
      response: 'Your RSA private key seems to have invalid padding in base64.',
      timestamp: Date.now(),
    };

    const result = await useCase.execute(raw);
    expect(result.isSuccess()).toBe(true);

    const sanitized = result.getValue();
    expect(sanitized.prompt).toContain('[REDACTED_PRIVATE_KEY]');
    expect(sanitized.prompt).not.toContain('MIIEowIBAAKCAQEA0Y1+');
  });

  it('rejects prompts that are too short (< 3 characters)', async () => {
    const raw: RawTurnDTO = {
      platform: 'CHATGPT',
      prompt: 'hi',
      response: 'Hello! How can I assist you today with your coding tasks?',
      timestamp: Date.now(),
    };

    const result = await useCase.execute(raw);
    expect(result.isFailure()).toBe(true);
    expect(result.getError().message).toContain('Prompt must be at least 3 characters');
  });

  it('rejects responses that are too short (< 10 characters)', async () => {
    const raw: RawTurnDTO = {
      platform: 'CHATGPT',
      prompt: 'Is this working properly?',
      response: 'Yes!',
      timestamp: Date.now(),
    };

    const result = await useCase.execute(raw);
    expect(result.isFailure()).toBe(true);
    expect(result.getError().message).toContain('Response must be at least 10 characters');
  });

  it('generates consistent TurnHash for identical sanitized content', async () => {
    const raw1: RawTurnDTO = {
      platform: 'CHATGPT',
      prompt: 'Explain what memoization means in computer science.',
      response: 'Memoization is an optimization technique that caches results.',
      timestamp: 1000,
    };

    const raw2: RawTurnDTO = {
      platform: 'CHATGPT',
      prompt: '  Explain what memoization means in computer science.  ',
      response: 'Memoization is an optimization technique that caches results. ',
      timestamp: 2000,
    };

    const res1 = await useCase.execute(raw1);
    const res2 = await useCase.execute(raw2);

    expect(res1.getValue().turnHash).toBe(res2.getValue().turnHash);
  });
});
