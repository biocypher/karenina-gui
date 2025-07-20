import { describe, it, expect, beforeEach } from 'vitest';
import {
  v2ToJsonLd,
  jsonLdToV2,
  isJsonLdCheckpoint,
  isV2Checkpoint,
  validateJsonLdCheckpoint,
  generateQuestionId,
  convertRubricTraitToRating,
  convertRatingToRubricTrait,
  CheckpointConversionError,
} from '../checkpoint-converter';
import type { UnifiedCheckpoint, JsonLdCheckpoint, RubricTrait, SchemaOrgRating } from '../../types';

// Test data
const mockV2Checkpoint: UnifiedCheckpoint = {
  version: '2.0',
  global_rubric: {
    traits: [
      {
        name: 'Accuracy',
        description: 'Is the answer factually correct?',
        kind: 'boolean',
      },
      {
        name: 'Completeness',
        description: 'Does the answer cover all important aspects?',
        kind: 'score',
        min_score: 1,
        max_score: 5,
      },
    ],
  },
  checkpoint: {
    'test-question-1': {
      question: 'What is the capital of France?',
      raw_answer: 'The capital of France is Paris.',
      original_answer_template: 'class CapitalAnswer(BaseAnswer):\n    city: str = Field(description="Capital city")',
      answer_template:
        'class FranceCapitalAnswer(BaseAnswer):\n    city: str = Field(description="Capital city of France")\n    country: str = Field(description="The country")',
      last_modified: '2025-07-19T12:00:00Z',
      finished: true,
      question_rubric: {
        traits: [
          {
            name: 'Geographic Accuracy',
            description: 'Is the geographic information correct?',
            kind: 'boolean',
          },
        ],
      },
    },
    'test-question-2': {
      question: 'What is climate change?',
      raw_answer: 'Climate change refers to long-term shifts in global temperatures.',
      original_answer_template:
        'class ClimateAnswer(BaseAnswer):\n    definition: str = Field(description="Definition")',
      answer_template:
        'class ClimateChangeAnswer(BaseAnswer):\n    definition: str = Field(description="Definition of climate change")',
      last_modified: '2025-07-19T11:00:00Z',
      finished: false,
    },
  },
};

const mockBooleanTrait: RubricTrait = {
  name: 'Accuracy',
  description: 'Is the answer factually correct?',
  kind: 'boolean',
};

const mockScoreTrait: RubricTrait = {
  name: 'Completeness',
  description: 'Does the answer cover all aspects?',
  kind: 'score',
  min_score: 1,
  max_score: 5,
};

describe('checkpoint-converter', () => {
  describe('generateQuestionId', () => {
    it('should generate consistent IDs for the same question', () => {
      const question = 'What is the capital of France?';
      const id1 = generateQuestionId(question);
      const id2 = generateQuestionId(question);

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^urn:uuid:question-/);
    });

    it('should generate different IDs for different questions', () => {
      const question1 = 'What is the capital of France?';
      const question2 = 'What is the capital of Germany?';

      const id1 = generateQuestionId(question1);
      const id2 = generateQuestionId(question2);

      expect(id1).not.toBe(id2);
    });

    it('should handle special characters and normalize text', () => {
      const question = 'What is "machine learning" & AI?!';
      const id = generateQuestionId(question);

      expect(id).toMatch(/^urn:uuid:question-what-is-machine-learning-ai/);
    });
  });

  describe('convertRubricTraitToRating', () => {
    it('should convert boolean trait to rating', () => {
      const rating = convertRubricTraitToRating(mockBooleanTrait, 'global');

      expect(rating).toEqual({
        '@type': 'Rating',
        '@id': 'urn:uuid:rating-accuracy',
        name: 'Accuracy',
        description: 'Is the answer factually correct?',
        bestRating: 1,
        worstRating: 0,
        additionalType: 'GlobalRubricTrait',
      });
    });

    it('should convert score trait to rating', () => {
      const rating = convertRubricTraitToRating(mockScoreTrait, 'question-specific');

      expect(rating).toEqual({
        '@type': 'Rating',
        '@id': 'urn:uuid:rating-completeness',
        name: 'Completeness',
        description: 'Does the answer cover all aspects?',
        bestRating: 5,
        worstRating: 1,
        additionalType: 'QuestionSpecificRubricTrait',
      });
    });

    it('should handle global vs question-specific rubric types', () => {
      const globalRating = convertRubricTraitToRating(mockBooleanTrait, 'global');
      const questionRating = convertRubricTraitToRating(mockBooleanTrait, 'question-specific');

      expect(globalRating.additionalType).toBe('GlobalRubricTrait');
      expect(questionRating.additionalType).toBe('QuestionSpecificRubricTrait');
    });

    describe('custom score ranges', () => {
      it('should handle 0-10 score range', () => {
        const trait: RubricTrait = {
          name: 'Quality',
          description: 'Overall quality',
          kind: 'score',
          min_score: 0,
          max_score: 10,
        };

        const rating = convertRubricTraitToRating(trait, 'global');

        expect(rating.bestRating).toBe(10);
        expect(rating.worstRating).toBe(0);
      });

      it('should handle 1-3 score range', () => {
        const trait: RubricTrait = {
          name: 'Conciseness',
          description: 'How concise is the answer',
          kind: 'score',
          min_score: 1,
          max_score: 3,
        };

        const rating = convertRubricTraitToRating(trait, 'global');

        expect(rating.bestRating).toBe(3);
        expect(rating.worstRating).toBe(1);
      });

      it('should handle 0-100 score range', () => {
        const trait: RubricTrait = {
          name: 'Percentage Score',
          description: 'Score as percentage',
          kind: 'score',
          min_score: 0,
          max_score: 100,
        };

        const rating = convertRubricTraitToRating(trait, 'global');

        expect(rating.bestRating).toBe(100);
        expect(rating.worstRating).toBe(0);
      });

      it('should handle negative score ranges', () => {
        const trait: RubricTrait = {
          name: 'Deviation',
          description: 'Score with negative values',
          kind: 'score',
          min_score: -10,
          max_score: 10,
        };

        const rating = convertRubricTraitToRating(trait, 'global');

        expect(rating.bestRating).toBe(10);
        expect(rating.worstRating).toBe(-10);
      });

      it('should use defaults for null/undefined score values', () => {
        const trait: RubricTrait = {
          name: 'Default Range',
          description: 'Trait with default score range',
          kind: 'score',
          min_score: null,
          max_score: undefined,
        };

        const rating = convertRubricTraitToRating(trait, 'global');

        expect(rating.bestRating).toBe(5); // Default max
        expect(rating.worstRating).toBe(1); // Default min
      });

      it('should use mixed defaults (one null, one specified)', () => {
        const trait: RubricTrait = {
          name: 'Mixed Range',
          description: 'Trait with mixed score range',
          kind: 'score',
          min_score: 0,
          max_score: null,
        };

        const rating = convertRubricTraitToRating(trait, 'global');

        expect(rating.bestRating).toBe(5); // Default max
        expect(rating.worstRating).toBe(0); // Specified min
      });
    });

    describe('validation and error handling', () => {
      it('should throw error for invalid min >= max', () => {
        const trait: RubricTrait = {
          name: 'Invalid Range',
          description: 'Trait with invalid range',
          kind: 'score',
          min_score: 5,
          max_score: 3,
        };

        expect(() => convertRubricTraitToRating(trait, 'global')).toThrow(
          'Invalid score range for trait "Invalid Range": min_score (5) must be less than max_score (3)'
        );
      });

      it('should throw error for equal min and max', () => {
        const trait: RubricTrait = {
          name: 'Equal Range',
          description: 'Trait with equal min/max',
          kind: 'score',
          min_score: 5,
          max_score: 5,
        };

        expect(() => convertRubricTraitToRating(trait, 'global')).toThrow(
          'Invalid score range for trait "Equal Range": min_score (5) must be less than max_score (5)'
        );
      });

      it('should throw error for non-finite score values', () => {
        const trait: RubricTrait = {
          name: 'Infinite Range',
          description: 'Trait with infinite score',
          kind: 'score',
          min_score: 1,
          max_score: Number.POSITIVE_INFINITY,
        };

        expect(() => convertRubricTraitToRating(trait, 'global')).toThrow(
          'Invalid max_score for trait "Infinite Range": value must be finite, got Infinity'
        );
      });

      it('should throw error for NaN score values', () => {
        const trait: RubricTrait = {
          name: 'NaN Range',
          description: 'Trait with NaN score',
          kind: 'score',
          min_score: NaN,
          max_score: 5,
        };

        expect(() => convertRubricTraitToRating(trait, 'global')).toThrow(
          'Invalid min_score for trait "NaN Range": expected number, got number'
        );
      });
    });
  });

  describe('convertRatingToRubricTrait', () => {
    it('should convert boolean rating back to trait', () => {
      const rating: SchemaOrgRating = {
        '@type': 'Rating',
        name: 'Accuracy',
        description: 'Is the answer correct?',
        bestRating: 1,
        worstRating: 0,
        additionalType: 'GlobalRubricTrait',
      };

      const trait = convertRatingToRubricTrait(rating);

      expect(trait).toEqual({
        name: 'Accuracy',
        description: 'Is the answer correct?',
        kind: 'boolean',
      });
    });

    it('should convert score rating back to trait', () => {
      const rating: SchemaOrgRating = {
        '@type': 'Rating',
        name: 'Quality',
        description: 'Quality of the answer',
        bestRating: 5,
        worstRating: 1,
        additionalType: 'QuestionSpecificRubricTrait',
      };

      const trait = convertRatingToRubricTrait(rating);

      expect(trait).toEqual({
        name: 'Quality',
        description: 'Quality of the answer',
        kind: 'score',
        min_score: 1,
        max_score: 5,
      });
    });

    describe('custom score range conversions', () => {
      it('should convert 0-10 rating back to trait', () => {
        const rating: SchemaOrgRating = {
          '@type': 'Rating',
          name: 'Quality',
          description: 'Overall quality',
          bestRating: 10,
          worstRating: 0,
          additionalType: 'GlobalRubricTrait',
        };

        const trait = convertRatingToRubricTrait(rating);

        expect(trait).toEqual({
          name: 'Quality',
          description: 'Overall quality',
          kind: 'score',
          min_score: 0,
          max_score: 10,
        });
      });

      it('should convert 1-3 rating back to trait', () => {
        const rating: SchemaOrgRating = {
          '@type': 'Rating',
          name: 'Conciseness',
          description: 'How concise is the answer',
          bestRating: 3,
          worstRating: 1,
          additionalType: 'GlobalRubricTrait',
        };

        const trait = convertRatingToRubricTrait(rating);

        expect(trait).toEqual({
          name: 'Conciseness',
          description: 'How concise is the answer',
          kind: 'score',
          min_score: 1,
          max_score: 3,
        });
      });

      it('should convert negative range rating back to trait', () => {
        const rating: SchemaOrgRating = {
          '@type': 'Rating',
          name: 'Deviation',
          description: 'Score with negative values',
          bestRating: 10,
          worstRating: -10,
          additionalType: 'GlobalRubricTrait',
        };

        const trait = convertRatingToRubricTrait(rating);

        expect(trait).toEqual({
          name: 'Deviation',
          description: 'Score with negative values',
          kind: 'score',
          min_score: -10,
          max_score: 10,
        });
      });
    });

    describe('validation and error handling', () => {
      it('should throw error for invalid rating object', () => {
        expect(() => convertRatingToRubricTrait(null as unknown as SchemaOrgRating)).toThrow(
          'Invalid rating object: rating must be a valid object'
        );
      });

      it('should throw error for missing name', () => {
        const rating = {
          '@type': 'Rating',
          name: '',
          bestRating: 5,
          worstRating: 1,
          additionalType: 'GlobalRubricTrait',
        } as SchemaOrgRating;

        expect(() => convertRatingToRubricTrait(rating)).toThrow(
          'Invalid rating object: name is required and must be a non-empty string'
        );
      });

      it('should throw error for non-numeric ratings', () => {
        const rating = {
          '@type': 'Rating',
          name: 'Test',
          bestRating: 'five' as unknown as number,
          worstRating: 1,
          additionalType: 'GlobalRubricTrait',
        } as SchemaOrgRating;

        expect(() => convertRatingToRubricTrait(rating)).toThrow(
          'Invalid rating object "Test": bestRating and worstRating must be numbers'
        );
      });

      it('should throw error for invalid range (worst >= best)', () => {
        const rating: SchemaOrgRating = {
          '@type': 'Rating',
          name: 'Invalid Range',
          bestRating: 3,
          worstRating: 5,
          additionalType: 'GlobalRubricTrait',
        };

        expect(() => convertRatingToRubricTrait(rating)).toThrow(
          'Invalid rating object "Invalid Range": worstRating (5) must be less than bestRating (3)'
        );
      });

      it('should throw error for equal range (worst = best)', () => {
        const rating: SchemaOrgRating = {
          '@type': 'Rating',
          name: 'Equal Range',
          bestRating: 5,
          worstRating: 5,
          additionalType: 'GlobalRubricTrait',
        };

        expect(() => convertRatingToRubricTrait(rating)).toThrow(
          'Invalid rating object "Equal Range": worstRating (5) must be less than bestRating (5)'
        );
      });
    });
  });

  describe('isV2Checkpoint', () => {
    it('should identify valid v2.0 checkpoints', () => {
      expect(isV2Checkpoint(mockV2Checkpoint)).toBe(true);
    });

    it('should reject invalid objects', () => {
      expect(isV2Checkpoint(null)).toBe(false);
      expect(isV2Checkpoint({})).toBe(false);
      expect(isV2Checkpoint({ version: '3.0' })).toBe(false);
      expect(isV2Checkpoint({ version: '2.0' })).toBe(false);
      expect(isV2Checkpoint({ version: '2.0', checkpoint: null })).toBe(false);
    });
  });

  describe('v2ToJsonLd', () => {
    let jsonLdResult: JsonLdCheckpoint;

    beforeEach(() => {
      jsonLdResult = v2ToJsonLd(mockV2Checkpoint);
    });

    it('should convert basic structure correctly', () => {
      expect(jsonLdResult['@type']).toBe('Dataset');
      expect(jsonLdResult.version).toBe('3.0.0-jsonld');
      expect(jsonLdResult['@context']).toBeDefined();
      expect(jsonLdResult.hasPart).toHaveLength(2);
    });

    it('should preserve question data', () => {
      const firstItem = jsonLdResult.hasPart[0];
      const question = firstItem.item;

      expect(question['@type']).toBe('Question');
      expect(question.text).toBe('What is the capital of France?');
      expect(question.acceptedAnswer.text).toBe('The capital of France is Paris.');
    });

    it('should convert Pydantic templates to SoftwareSourceCode', () => {
      const question = jsonLdResult.hasPart[0].item;

      expect(question.hasPart['@type']).toBe('SoftwareSourceCode');
      expect(question.hasPart.programmingLanguage).toBe('Python');
      expect(question.hasPart.text).toContain('class FranceCapitalAnswer');
    });

    it('should convert rubric traits to Rating objects', () => {
      const question = jsonLdResult.hasPart[0].item;

      expect(question.rating).toBeDefined();
      expect(question.rating).toHaveLength(3); // 2 global + 1 question-specific

      const accuracyRating = question.rating?.find((r) => r.name === 'Accuracy');
      expect(accuracyRating).toBeDefined();
      expect(accuracyRating?.['@type']).toBe('Rating');
      expect(accuracyRating?.bestRating).toBe(1);
      expect(accuracyRating?.worstRating).toBe(0);
      expect(accuracyRating?.additionalType).toBe('GlobalRubricTrait');
    });

    it('should preserve metadata in additionalProperty', () => {
      const question = jsonLdResult.hasPart[0].item;
      const finishedProp = question.additionalProperty?.find((p) => p.name === 'finished');

      expect(finishedProp).toBeDefined();
      expect(finishedProp?.value).toBe(true);
    });

    it('should include global rubric in dataset properties', () => {
      const globalRubricProp = jsonLdResult.additionalProperty?.find((p) => p.name === 'global_rubric_traits');

      expect(globalRubricProp).toBeDefined();
      expect(typeof globalRubricProp?.value).toBe('string');

      const traits = JSON.parse(globalRubricProp?.value as string);
      expect(traits).toHaveLength(2);
    });

    it('should handle checkpoints without global rubric', () => {
      const checkpointWithoutRubric = {
        ...mockV2Checkpoint,
        global_rubric: null,
      };

      const result = v2ToJsonLd(checkpointWithoutRubric);
      expect(result.additionalProperty?.find((p) => p.name === 'global_rubric_traits')).toBeUndefined();
    });

    it('should validate output by default', () => {
      expect(() => v2ToJsonLd(mockV2Checkpoint, { validateOutput: true })).not.toThrow();
    });
  });

  describe('isJsonLdCheckpoint', () => {
    it('should identify valid JSON-LD checkpoints', () => {
      const jsonLdCheckpoint = v2ToJsonLd(mockV2Checkpoint);
      expect(isJsonLdCheckpoint(jsonLdCheckpoint)).toBe(true);
    });

    it('should reject invalid objects', () => {
      expect(isJsonLdCheckpoint(null)).toBe(false);
      expect(isJsonLdCheckpoint({})).toBe(false);
      expect(isJsonLdCheckpoint({ '@type': 'Question' })).toBe(false);
      expect(isJsonLdCheckpoint({ '@type': 'Dataset' })).toBe(false);
      expect(isJsonLdCheckpoint({ '@type': 'Dataset', version: '2.0' })).toBe(false);
      expect(isJsonLdCheckpoint({ '@type': 'Dataset', '@context': {}, hasPart: [], version: '2.0' })).toBe(false);
    });
  });

  describe('jsonLdToV2', () => {
    let originalCheckpoint: JsonLdCheckpoint;
    let convertedBack: UnifiedCheckpoint;

    beforeEach(() => {
      originalCheckpoint = v2ToJsonLd(mockV2Checkpoint);
      convertedBack = jsonLdToV2(originalCheckpoint);
    });

    it('should restore basic structure', () => {
      expect(convertedBack.version).toBe('2.0');
      expect(Object.keys(convertedBack.checkpoint)).toHaveLength(2);
    });

    it('should restore question data correctly', () => {
      const questionIds = Object.keys(convertedBack.checkpoint);
      const firstQuestion = convertedBack.checkpoint[questionIds[0]];

      expect(firstQuestion.question).toBeTruthy();
      expect(firstQuestion.raw_answer).toBeTruthy();
      expect(firstQuestion.answer_template).toBeTruthy();
      expect(firstQuestion.original_answer_template).toBeTruthy();
      expect(typeof firstQuestion.finished).toBe('boolean');
    });

    it('should restore global rubric', () => {
      expect(convertedBack.global_rubric).toBeDefined();
      expect(convertedBack.global_rubric?.traits).toHaveLength(2);

      const accuracyTrait = convertedBack.global_rubric?.traits.find((t) => t.name === 'Accuracy');
      expect(accuracyTrait?.kind).toBe('boolean');
    });

    it('should restore question-specific rubrics', () => {
      const questionWithRubric = Object.values(convertedBack.checkpoint).find((item) => item.question_rubric);

      expect(questionWithRubric).toBeDefined();
      expect(questionWithRubric?.question_rubric?.traits).toHaveLength(1);
    });

    it('should maintain data integrity through round-trip conversion', () => {
      const originalQuestionCount = Object.keys(mockV2Checkpoint.checkpoint).length;
      const convertedQuestionCount = Object.keys(convertedBack.checkpoint).length;

      expect(convertedQuestionCount).toBe(originalQuestionCount);

      // Check specific question data preservation
      const originalFirst = Object.values(mockV2Checkpoint.checkpoint)[0];
      const convertedFirst = Object.values(convertedBack.checkpoint)[0];

      expect(convertedFirst.question).toBe(originalFirst.question);
      expect(convertedFirst.raw_answer).toBe(originalFirst.raw_answer);
      expect(convertedFirst.finished).toBe(originalFirst.finished);
    });
  });

  describe('validateJsonLdCheckpoint', () => {
    it('should validate correct JSON-LD checkpoints', () => {
      const validCheckpoint = v2ToJsonLd(mockV2Checkpoint);
      expect(() => validateJsonLdCheckpoint(validCheckpoint)).not.toThrow();
    });

    it('should reject checkpoints with wrong type', () => {
      const invalidCheckpoint = {
        ...v2ToJsonLd(mockV2Checkpoint),
        '@type': 'Question' as 'Dataset',
      };

      expect(() => validateJsonLdCheckpoint(invalidCheckpoint)).toThrow(CheckpointConversionError);
    });

    it('should reject checkpoints without proper version', () => {
      const invalidCheckpoint = {
        ...v2ToJsonLd(mockV2Checkpoint),
        version: '2.0',
      };

      expect(() => validateJsonLdCheckpoint(invalidCheckpoint)).toThrow(CheckpointConversionError);
    });

    it('should validate rating additionalType', () => {
      const checkpoint = v2ToJsonLd(mockV2Checkpoint);
      // Manually corrupt a rating additionalType
      if (checkpoint.hasPart[0].item.rating) {
        checkpoint.hasPart[0].item.rating[0].additionalType = 'InvalidType' as 'GlobalRubricTrait';
      }

      expect(() => validateJsonLdCheckpoint(checkpoint)).toThrow(CheckpointConversionError);
    });
  });

  describe('error handling', () => {
    it('should throw CheckpointConversionError for invalid input', () => {
      const invalidCheckpoint = { invalid: 'data' } as unknown as UnifiedCheckpoint;

      expect(() => v2ToJsonLd(invalidCheckpoint)).toThrow(CheckpointConversionError);
    });

    it('should handle conversion errors gracefully', () => {
      const corruptedCheckpoint = {
        ...mockV2Checkpoint,
        checkpoint: null as unknown as Record<string, CheckpointItem>,
      };

      expect(() => v2ToJsonLd(corruptedCheckpoint)).toThrow(CheckpointConversionError);
    });
  });

  describe('performance', () => {
    it('should handle large checkpoints efficiently', () => {
      // Create a large checkpoint with many questions
      const largeCheckpoint: UnifiedCheckpoint = {
        ...mockV2Checkpoint,
        checkpoint: {},
      };

      // Generate 1000 questions
      for (let i = 0; i < 1000; i++) {
        largeCheckpoint.checkpoint[`question-${i}`] = {
          question: `Test question ${i}?`,
          raw_answer: `Test answer ${i}`,
          original_answer_template: `class Answer${i}(BaseAnswer): pass`,
          answer_template: `class Answer${i}(BaseAnswer): answer: str = Field()`,
          last_modified: new Date().toISOString(),
          finished: i % 2 === 0,
        };
      }

      const startTime = performance.now();
      const jsonLd = v2ToJsonLd(largeCheckpoint);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Should complete in <200ms
      expect(jsonLd.hasPart).toHaveLength(1000);
    });
  });
});
