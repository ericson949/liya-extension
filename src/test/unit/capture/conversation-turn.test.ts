import { describe, it, expect } from 'vitest';
import { Prompt } from '@features/capture/domain/prompt.vo';
import { Response } from '@features/capture/domain/response.vo';
import { PlatformType } from '@features/capture/domain/platform-type.vo';
import { TurnHash } from '@features/capture/domain/turn-hash.vo';
import { ConversationTurn } from '@features/capture/domain/conversation-turn.entity';
import { RedactedContent } from '@features/sanitization/domain/redacted-content.vo';

describe('Capture Domain Models', () => {
  describe('Prompt VO', () => {
    it('creates a valid Prompt VO', () => {
      const prompt = Prompt.create('What is Clean Architecture?');
      expect(prompt.isSuccess()).toBe(true);
      expect(prompt.getValue().value).toBe('What is Clean Architecture?');
    });

    it('rejects empty or whitespace prompt', () => {
      const prompt = Prompt.create('   ');
      expect(prompt.isFailure()).toBe(true);
    });
  });

  describe('Response VO', () => {
    it('creates a valid Response VO', () => {
      const res = Response.create('Clean Architecture separates domain rules from infrastructure.');
      expect(res.isSuccess()).toBe(true);
    });

    it('rejects short response', () => {
      const res = Response.create('Too short');
      expect(res.isFailure()).toBe(true);
    });
  });

  describe('PlatformType VO', () => {
    it('detects platform from URLs', () => {
      expect(PlatformType.fromUrl('https://chatgpt.com/c/123').getValue().value).toBe('CHATGPT');
      expect(PlatformType.fromUrl('https://chat.openai.com/').getValue().value).toBe('CHATGPT');
      expect(PlatformType.fromUrl('https://claude.ai/chat/abc').getValue().value).toBe('CLAUDE');
      expect(PlatformType.fromUrl('https://gemini.google.com/app').getValue().value).toBe('GEMINI');
    });

    it('returns error for unsupported URL', () => {
      const res = PlatformType.fromUrl('https://bing.com');
      expect(res.isFailure()).toBe(true);
    });
  });

  describe('TurnHash VO', () => {
    it('computes hash and verifies equality', async () => {
      const hash1 = await TurnHash.create('hello', 'world response message');
      const hash2 = await TurnHash.create('hello', 'world response message');
      const hash3 = await TurnHash.create('hello 2', 'world response message');

      expect(hash1.equals(hash2)).toBe(true);
      expect(hash1.equals(hash3)).toBe(false);
      expect(hash1.getValue()).toHaveLength(64);
    });
  });

  describe('ConversationTurn Entity', () => {
    it('creates an entity with full props and serializes to JSON', async () => {
      const promptVo = Prompt.create('Tell me a joke').getValue();
      const responseVo = Response.create('Why did the chicken cross the road?').getValue();
      const platformVo = PlatformType.create('CHATGPT').getValue();
      const hashVo = await TurnHash.create(promptVo.value, responseVo.value);
      const promptRedacted = RedactedContent.create(promptVo.value, promptVo.value.length, 0).getValue();
      const responseRedacted = RedactedContent.create(responseVo.value, responseVo.value.length, 0).getValue();

      const turn1 = new ConversationTurn({
        hash: hashVo,
        platform: platformVo,
        prompt: promptVo,
        response: responseVo,
        promptRedacted,
        responseRedacted,
        capturedAt: new Date('2026-09-20T12:00:00Z'),
        conversationId: 'conv-101',
        turnIndex: 1,
      });

      const turn2 = new ConversationTurn({
        hash: hashVo,
        platform: platformVo,
        prompt: promptVo,
        response: responseVo,
        promptRedacted,
        responseRedacted,
        capturedAt: new Date('2026-09-20T12:05:00Z'),
      });

      // Entities with the same hash (ID) are equal
      expect(turn1.equals(turn2)).toBe(true);

      const json = turn1.toJSON();
      expect(json.hash).toBe(hashVo.getValue());
      expect(json.platform).toBe('CHATGPT');
      expect(json.conversationId).toBe('conv-101');
      expect(json.turnIndex).toBe(1);
    });
  });
});
