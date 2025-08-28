/**
 * Tests for global rubric export functionality
 * Specifically addresses the issue reported by user: "i think this version is not exporting correctly the global rubrics in the dump of the checkpoint"
 */
import { v2ToJsonLd, jsonLdToV2, DEFAULT_CONVERSION_OPTIONS } from '../checkpoint-converter';
import { UnifiedCheckpoint, RubricTrait } from '../../types';

describe('Global Rubric Export', () => {
  const createSampleV2Checkpoint = (globalRubricTraits: RubricTrait[]): UnifiedCheckpoint => {
    return {
      version: '2.0',
      global_rubric: {
        traits: globalRubricTraits,
      },
      checkpoint: {
        question_1: {
          question: 'What is artificial intelligence?',
          raw_answer: 'AI is the simulation of human intelligence by machines.',
          original_answer_template: '',
          answer_template: 'class AIAnswer(BaseModel): definition: str',
          last_modified: '2024-07-22T10:00:00Z',
          finished: true,
        },
      },
    };
  };

  describe('Boolean trait export', () => {
    it('should export boolean global rubric traits correctly', () => {
      const booleanTrait: RubricTrait = {
        name: 'Accuracy',
        description: 'Is the answer factually correct?',
        kind: 'boolean',
      };

      const v2Checkpoint = createSampleV2Checkpoint([booleanTrait]);
      const jsonLdResult = v2ToJsonLd(v2Checkpoint, DEFAULT_CONVERSION_OPTIONS);

      // Check that global rubric is stored at Dataset level
      expect(jsonLdResult.rating).toBeDefined();
      expect(jsonLdResult.rating).toHaveLength(1);

      const exportedRating = jsonLdResult.rating![0];
      expect(exportedRating).toEqual({
        '@type': 'Rating',
        '@id': 'urn:uuid:rating-accuracy',
        name: 'Accuracy',
        description: 'Is the answer factually correct?',
        bestRating: 1,
        worstRating: 0,
        additionalType: 'GlobalRubricTrait',
      });
    });
  });

  describe('Score trait export', () => {
    it('should export score global rubric traits correctly', () => {
      const scoreTrait: RubricTrait = {
        name: 'Completeness',
        description: 'How complete is the answer?',
        kind: 'score',
        min_score: 1,
        max_score: 5,
      };

      const v2Checkpoint = createSampleV2Checkpoint([scoreTrait]);
      const jsonLdResult = v2ToJsonLd(v2Checkpoint, DEFAULT_CONVERSION_OPTIONS);

      // Check that global rubric is stored at Dataset level
      expect(jsonLdResult.rating).toBeDefined();
      expect(jsonLdResult.rating).toHaveLength(1);

      const exportedRating = jsonLdResult.rating![0];
      expect(exportedRating).toEqual({
        '@type': 'Rating',
        '@id': 'urn:uuid:rating-completeness',
        name: 'Completeness',
        description: 'How complete is the answer?',
        bestRating: 5,
        worstRating: 1,
        additionalType: 'GlobalRubricTrait',
      });
    });
  });

  describe('Multiple traits export', () => {
    it('should export multiple global rubric traits correctly', () => {
      const traits: RubricTrait[] = [
        {
          name: 'Accuracy',
          description: 'Is the answer factually correct?',
          kind: 'boolean',
        },
        {
          name: 'Completeness',
          description: 'How complete is the answer?',
          kind: 'score',
          min_score: 1,
          max_score: 5,
        },
        {
          name: 'Clarity',
          description: 'How clear is the answer?',
          kind: 'score',
          min_score: 1,
          max_score: 3,
        },
      ];

      const v2Checkpoint = createSampleV2Checkpoint(traits);
      const jsonLdResult = v2ToJsonLd(v2Checkpoint, DEFAULT_CONVERSION_OPTIONS);

      // Check that all global rubrics are stored at Dataset level
      expect(jsonLdResult.rating).toBeDefined();
      expect(jsonLdResult.rating).toHaveLength(3);

      const ratingNames = jsonLdResult.rating!.map((r) => r.name);
      expect(ratingNames).toContain('Accuracy');
      expect(ratingNames).toContain('Completeness');
      expect(ratingNames).toContain('Clarity');

      // Verify all have GlobalRubricTrait type
      jsonLdResult.rating!.forEach((rating) => {
        expect(rating.additionalType).toBe('GlobalRubricTrait');
      });
    });
  });

  describe('Round-trip conversion preserves global rubrics', () => {
    it('should preserve global rubrics through round-trip conversion', () => {
      const originalTraits: RubricTrait[] = [
        {
          name: 'Accuracy',
          description: 'Is the answer factually correct?',
          kind: 'boolean',
        },
        {
          name: 'Detail Level',
          description: 'How detailed is the answer?',
          kind: 'score',
          min_score: 2,
          max_score: 8,
        },
      ];

      const originalV2 = createSampleV2Checkpoint(originalTraits);

      // Convert v2 -> JSON-LD -> v2
      const jsonLd = v2ToJsonLd(originalV2, DEFAULT_CONVERSION_OPTIONS);
      const convertedV2 = jsonLdToV2(jsonLd);

      // Check that global rubric is preserved
      expect(convertedV2.global_rubric).toBeDefined();
      expect(convertedV2.global_rubric!.traits).toHaveLength(2);

      // Verify traits are preserved
      const convertedTraitNames = convertedV2.global_rubric!.traits.map((t) => t.name);
      expect(convertedTraitNames).toContain('Accuracy');
      expect(convertedTraitNames).toContain('Detail Level');

      // Verify specific trait details
      const accuracyTrait = convertedV2.global_rubric!.traits.find((t) => t.name === 'Accuracy');
      expect(accuracyTrait).toEqual({
        name: 'Accuracy',
        description: 'Is the answer factually correct?',
        kind: 'boolean',
        min_score: undefined,
        max_score: undefined,
      });

      const detailTrait = convertedV2.global_rubric!.traits.find((t) => t.name === 'Detail Level');
      expect(detailTrait).toEqual({
        name: 'Detail Level',
        description: 'How detailed is the answer?',
        kind: 'score',
        min_score: 2,
        max_score: 8,
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle checkpoint with no global rubric', () => {
      const v2Checkpoint: UnifiedCheckpoint = {
        version: '2.0',
        global_rubric: null,
        checkpoint: {
          question_1: {
            question: 'Test question',
            raw_answer: 'Test answer',
            original_answer_template: '',
            answer_template: 'class TestAnswer(BaseModel): pass',
            last_modified: '2024-07-22T10:00:00Z',
            finished: true,
          },
        },
      };

      const jsonLdResult = v2ToJsonLd(v2Checkpoint, DEFAULT_CONVERSION_OPTIONS);

      // Should not have rating array if no global rubric
      expect(jsonLdResult.rating).toBeUndefined();
    });

    it('should handle checkpoint with empty global rubric traits', () => {
      const v2Checkpoint: UnifiedCheckpoint = {
        version: '2.0',
        global_rubric: {
          traits: [],
        },
        checkpoint: {
          question_1: {
            question: 'Test question',
            raw_answer: 'Test answer',
            original_answer_template: '',
            answer_template: 'class TestAnswer(BaseModel): pass',
            last_modified: '2024-07-22T10:00:00Z',
            finished: true,
          },
        },
      };

      const jsonLdResult = v2ToJsonLd(v2Checkpoint, DEFAULT_CONVERSION_OPTIONS);

      // Should have empty rating array
      expect(jsonLdResult.rating).toEqual([]);
    });
  });

  describe('Global vs Question-specific separation', () => {
    it('should not include global rubrics in question ratings', () => {
      const globalTraits: RubricTrait[] = [
        {
          name: 'Global Accuracy',
          description: 'Global accuracy trait',
          kind: 'boolean',
        },
      ];

      const questionSpecificTrait: RubricTrait = {
        name: 'Question Depth',
        description: 'Question-specific depth',
        kind: 'score',
        min_score: 1,
        max_score: 3,
      };

      const v2Checkpoint: UnifiedCheckpoint = {
        version: '2.0',
        global_rubric: {
          traits: globalTraits,
        },
        checkpoint: {
          question_1: {
            question: 'Test question',
            raw_answer: 'Test answer',
            original_answer_template: '',
            answer_template: 'class TestAnswer(BaseModel): pass',
            last_modified: '2024-07-22T10:00:00Z',
            finished: true,
            question_rubric: {
              traits: [questionSpecificTrait],
            },
          },
        },
      };

      const jsonLdResult = v2ToJsonLd(v2Checkpoint, DEFAULT_CONVERSION_OPTIONS);

      // Check global rubric is at Dataset level
      expect(jsonLdResult.rating).toBeDefined();
      expect(jsonLdResult.rating).toHaveLength(1);
      expect(jsonLdResult.rating![0].name).toBe('Global Accuracy');
      expect(jsonLdResult.rating![0].additionalType).toBe('GlobalRubricTrait');

      // Check question-specific rubric is at Question level
      const questionItem = jsonLdResult.dataFeedElement[0];
      expect(questionItem.item.rating).toBeDefined();
      expect(questionItem.item.rating).toHaveLength(1);
      expect(questionItem.item.rating![0].name).toBe('Question Depth');
      expect(questionItem.item.rating![0].additionalType).toBe('QuestionSpecificRubricTrait');
    });
  });
});
