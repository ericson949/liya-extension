import { describe, it, expect } from 'vitest';
import { Result } from '@shared/domain/result';
import { ValueObject } from '@shared/domain/value-object';
import { Entity } from '@shared/domain/entity';
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { DomainEvent } from '@shared/domain/domain-event';
import { sha256Hash } from '@shared/utils/crypto';
import { DLP_PATTERNS } from '@shared/utils/regex-patterns';

// Dummy VO implementation for testing
class TestVO extends ValueObject<{ a: number; b: string }> {
  constructor(a: number, b: string) {
    super({ a, b });
  }
}

// Dummy Entity implementation for testing
class TestEntity extends Entity<string> {
  constructor(id: string, public name: string) {
    super(id);
  }
}

// Dummy AggregateRoot for testing
class TestAggregate extends AggregateRoot<string> {
  constructor(id: string) {
    super(id);
  }

  public triggerAction(_name: string): void {
    const event: DomainEvent = {
      eventId: 'evt-1',
      occurredAt: new Date(),
      eventType: 'TEST_TRIGGERED',
      aggregateId: this.id,
    };
    this.addDomainEvent(event);
  }
}

describe('Shared Kernel Primitives', () => {
  describe('Result<T, E>', () => {
    it('creates an ok result and retrieves value', () => {
      const res = Result.ok<number, string>(42);
      expect(res.isSuccess()).toBe(true);
      expect(res.isFailure()).toBe(false);
      expect(res.getValue()).toBe(42);
      expect(() => res.getError()).toThrow();
    });

    it('creates an error result and retrieves error', () => {
      const res = Result.err<number, string>('something went wrong');
      expect(res.isSuccess()).toBe(false);
      expect(res.isFailure()).toBe(true);
      expect(res.getError()).toBe('something went wrong');
      expect(() => res.getValue()).toThrow();
    });

    it('maps successful results', () => {
      const res = Result.ok<number, string>(10).map((v) => v * 2);
      expect(res.getValue()).toBe(20);
    });

    it('bypasses map on error results', () => {
      const res = Result.err<number, string>('err').map((v) => v * 2);
      expect(res.isFailure()).toBe(true);
      expect(res.getError()).toBe('err');
    });

    it('flatMaps correctly', () => {
      const okRes = Result.ok<number, string>(5).flatMap((v) => Result.ok(v + 5));
      expect(okRes.getValue()).toBe(10);

      const errRes = Result.ok<number, string>(5).flatMap(() => Result.err('failed inside'));
      expect(errRes.isFailure()).toBe(true);
      expect(errRes.getError()).toBe('failed inside');
    });

    it('getOrElse returns fallback on error', () => {
      const okRes = Result.ok<string, string>('actual').getOrElse('fallback');
      expect(okRes).toBe('actual');

      const errRes = Result.err<string, string>('err').getOrElse('fallback');
      expect(errRes).toBe('fallback');
    });
  });

  describe('ValueObject<T>', () => {
    it('compares equality structurally', () => {
      const vo1 = new TestVO(1, 'foo');
      const vo2 = new TestVO(1, 'foo');
      const vo3 = new TestVO(2, 'foo');

      expect(vo1.equals(vo2)).toBe(true);
      expect(vo1.equals(vo3)).toBe(false);
      expect(vo1.equals(null)).toBe(false);
      expect(vo1.equals(undefined)).toBe(false);
    });
  });

  describe('Entity<TId>', () => {
    it('compares equality by identifier', () => {
      const e1 = new TestEntity('id-1', 'First');
      const e2 = new TestEntity('id-1', 'First Changed');
      const e3 = new TestEntity('id-2', 'First');

      expect(e1.equals(e2)).toBe(true);
      expect(e1.equals(e3)).toBe(false);
    });
  });

  describe('AggregateRoot<TId>', () => {
    it('collects and clears domain events', () => {
      const agg = new TestAggregate('agg-1');
      expect(agg.domainEvents.length).toBe(0);

      agg.triggerAction('ping');
      expect(agg.domainEvents.length).toBe(1);
      expect(agg.domainEvents[0]?.eventType).toBe('TEST_TRIGGERED');

      agg.clearDomainEvents();
      expect(agg.domainEvents.length).toBe(0);
    });
  });

  describe('sha256Hash', () => {
    it('produces a 64-character hex hash', async () => {
      const hash = await sha256Hash('hello world');
      expect(hash).toHaveLength(64);
      // SHA-256 of "hello world" is b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
      expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });
  });

  describe('DLP_PATTERNS', () => {
    it('matches credit cards', () => {
      const visa = '4532-1488-1234-5678';
      expect(visa.match(DLP_PATTERNS.CREDIT_CARD)).not.toBeNull();
    });

    it('matches US SSN', () => {
      const ssn = '123-45-6789';
      expect(ssn.match(DLP_PATTERNS.US_SSN)).not.toBeNull();
    });

    it('matches AWS Access Key ID', () => {
      const key = 'AKIAIOSFODNN7EXAMPLE';
      expect(key.match(DLP_PATTERNS.AWS_ACCESS_KEY_ID)).not.toBeNull();
    });

    it('matches JWT format', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozGz_Wqsmwdfgdfg';
      expect(jwt.match(DLP_PATTERNS.JWT)).not.toBeNull();
    });
  });
});
