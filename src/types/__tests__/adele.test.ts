import { describe, it, expect } from 'vitest';
import { getAdeleClassification, hasAdeleClassification } from '../adele';
import type { AdeleClassificationMetadata } from '../adele';

describe('Adele classification utilities', () => {
  const sampleClassification: AdeleClassificationMetadata = {
    scores: { reasoning: 3, factuality: 4 },
    labels: { reasoning: 'moderate', factuality: 'high' },
    classifiedAt: '2024-01-15T10:00:00Z',
    model: 'gpt-4',
  };

  describe('hasAdeleClassification', () => {
    it('returns false for undefined metadata', () => {
      expect(hasAdeleClassification(undefined)).toBe(false);
    });

    it('returns false for empty metadata', () => {
      expect(hasAdeleClassification({})).toBe(false);
    });

    it('returns false for null classification', () => {
      expect(hasAdeleClassification({ adele_classification: null })).toBe(false);
    });

    it('returns true for object classification', () => {
      expect(hasAdeleClassification({ adele_classification: sampleClassification })).toBe(true);
    });

    it('returns true for JSON string classification', () => {
      expect(hasAdeleClassification({ adele_classification: JSON.stringify(sampleClassification) })).toBe(true);
    });
  });

  describe('getAdeleClassification', () => {
    it('returns null for undefined metadata', () => {
      expect(getAdeleClassification(undefined)).toBeNull();
    });

    it('returns null for empty metadata', () => {
      expect(getAdeleClassification({})).toBeNull();
    });

    it('returns null for null classification', () => {
      expect(getAdeleClassification({ adele_classification: null })).toBeNull();
    });

    it('returns classification from object format', () => {
      const result = getAdeleClassification({ adele_classification: sampleClassification });
      expect(result).toEqual(sampleClassification);
    });

    it('parses classification from JSON string format', () => {
      const result = getAdeleClassification({
        adele_classification: JSON.stringify(sampleClassification),
      });
      expect(result).toEqual(sampleClassification);
    });

    it('returns null for invalid JSON string', () => {
      const result = getAdeleClassification({ adele_classification: 'not valid json' });
      expect(result).toBeNull();
    });

    it('preserves all classification fields when parsing JSON', () => {
      const result = getAdeleClassification({
        adele_classification: JSON.stringify(sampleClassification),
      });

      expect(result?.scores).toEqual({ reasoning: 3, factuality: 4 });
      expect(result?.labels).toEqual({ reasoning: 'moderate', factuality: 'high' });
      expect(result?.classifiedAt).toBe('2024-01-15T10:00:00Z');
      expect(result?.model).toBe('gpt-4');
    });

    it('handles metadata with other fields alongside classification', () => {
      const result = getAdeleClassification({
        adele_classification: sampleClassification,
        other_field: 'some value',
        another_field: 123,
      });
      expect(result).toEqual(sampleClassification);
    });
  });

  describe('round-trip persistence scenario', () => {
    it('classification survives JSON.stringify -> storage -> JSON.parse -> getAdeleClassification', () => {
      // Simulate saving to checkpoint (what CuratorTab does)
      const savedMetadata = {
        adele_classification: JSON.stringify(sampleClassification),
      };

      // Simulate loading from checkpoint and retrieving classification
      const result = getAdeleClassification(savedMetadata);

      expect(result).toEqual(sampleClassification);
      expect(result?.scores.reasoning).toBe(3);
      expect(result?.model).toBe('gpt-4');
    });
  });
});
