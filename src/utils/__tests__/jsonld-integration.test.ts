import { describe, it, expect } from 'vitest';
import { v2ToJsonLd, jsonLdToV2, isJsonLdCheckpoint, isV2Checkpoint } from '../checkpoint-converter';
import type { UnifiedCheckpoint } from '../../types';

describe('JSON-LD Integration Tests', () => {
  const sampleV2Checkpoint: UnifiedCheckpoint = {
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
      'test-question': {
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
    },
  };

  describe('Round-trip conversion integrity', () => {
    it('should maintain all data through v2 -> JSON-LD -> v2 conversion', () => {
      // Convert v2 to JSON-LD
      const jsonLdCheckpoint = v2ToJsonLd(sampleV2Checkpoint, {
        preserveIds: true,
        includeMetadata: true,
        validateOutput: true,
      });

      // Verify JSON-LD structure
      expect(jsonLdCheckpoint['@type']).toBe('DataFeed');
      expect(jsonLdCheckpoint.version).toBe('0.1.0');
      expect(jsonLdCheckpoint.dataFeedElement).toHaveLength(1);

      // Convert back to v2
      const reconvertedV2 = jsonLdToV2(jsonLdCheckpoint);

      // Verify structural integrity
      expect(reconvertedV2.version).toBe('2.0');
      expect(Object.keys(reconvertedV2.checkpoint)).toHaveLength(1);

      // Verify question data preservation
      const originalQuestion = sampleV2Checkpoint.checkpoint['test-question'];
      const reconvertedQuestion = Object.values(reconvertedV2.checkpoint)[0];

      expect(reconvertedQuestion.question).toBe(originalQuestion.question);
      expect(reconvertedQuestion.raw_answer).toBe(originalQuestion.raw_answer);
      expect(reconvertedQuestion.finished).toBe(originalQuestion.finished);

      // Verify global rubric preservation
      expect(reconvertedV2.global_rubric).toBeDefined();
      expect(reconvertedV2.global_rubric?.traits).toHaveLength(2);

      const accuracyTrait = reconvertedV2.global_rubric?.traits.find((t) => t.name === 'Accuracy');
      expect(accuracyTrait?.kind).toBe('boolean');
      expect(accuracyTrait?.description).toBe('Is the answer factually correct?');

      // Verify question-specific rubric preservation
      expect(reconvertedQuestion.question_rubric).toBeDefined();
      expect(reconvertedQuestion.question_rubric?.traits).toHaveLength(1);
      expect(reconvertedQuestion.question_rubric?.traits[0].name).toBe('Geographic Accuracy');
    });

    it('should handle checkpoints without global rubrics', () => {
      const checkpointWithoutRubric = {
        ...sampleV2Checkpoint,
        global_rubric: null,
      };

      const jsonLd = v2ToJsonLd(checkpointWithoutRubric);
      const reconverted = jsonLdToV2(jsonLd);

      expect(reconverted.global_rubric).toBeNull();
    });

    it('should handle empty checkpoints', () => {
      const emptyCheckpoint: UnifiedCheckpoint = {
        version: '2.0',
        global_rubric: null,
        checkpoint: {},
      };

      const jsonLd = v2ToJsonLd(emptyCheckpoint);
      expect(jsonLd.dataFeedElement).toHaveLength(0);

      const reconverted = jsonLdToV2(jsonLd);
      expect(Object.keys(reconverted.checkpoint)).toHaveLength(0);
    });
  });

  describe('Schema.org compliance', () => {
    it('should produce valid schema.org vocabulary', () => {
      const jsonLd = v2ToJsonLd(sampleV2Checkpoint);

      // Check root Dataset
      expect(jsonLd['@type']).toBe('DataFeed');
      expect(jsonLd['@context']).toBeDefined();
      expect(jsonLd['@context']['@vocab']).toBe('http://schema.org/');

      // Check DataFeedItem structure
      const feedItem = jsonLd.dataFeedElement[0];
      expect(feedItem['@type']).toBe('DataFeedItem');
      expect(feedItem.item['@type']).toBe('Question');

      // Check Question structure
      const question = feedItem.item;
      expect(question.acceptedAnswer['@type']).toBe('Answer');
      expect(question.hasPart['@type']).toBe('SoftwareSourceCode');

      // Check Rating objects (rubric traits)
      expect(question.rating).toBeDefined();
      expect(question.rating?.length).toBeGreaterThan(0);

      question.rating?.forEach((rating) => {
        expect(rating['@type']).toBe('Rating');
        expect(typeof rating.bestRating).toBe('number');
        expect(typeof rating.worstRating).toBe('number');
        expect(rating.additionalType).toMatch(/^(GlobalRubricTrait|QuestionSpecificRubricTrait)$/);
      });

      // Check PropertyValue objects (metadata)
      expect(question.additionalProperty).toBeDefined();
      question.additionalProperty?.forEach((prop) => {
        expect(prop['@type']).toBe('PropertyValue');
        expect(typeof prop.name).toBe('string');
      });
    });

    it('should include required schema.org properties', () => {
      const jsonLd = v2ToJsonLd(sampleV2Checkpoint);

      // Dataset requirements
      expect(jsonLd.name).toBeTruthy();
      expect(jsonLd.description).toBeTruthy();
      expect(jsonLd.version).toBeTruthy();

      // Question requirements
      const question = jsonLd.dataFeedElement[0].item;
      expect(question.text).toBeTruthy();
      expect(question.acceptedAnswer.text).toBeTruthy();

      // SoftwareSourceCode requirements
      expect(question.hasPart.text).toBeTruthy();
      expect(question.hasPart.programmingLanguage).toBe('Python');
    });
  });

  describe('Type detection functions', () => {
    it('should correctly identify JSON-LD checkpoints', () => {
      const jsonLd = v2ToJsonLd(sampleV2Checkpoint);

      expect(isJsonLdCheckpoint(jsonLd)).toBe(true);
      expect(isV2Checkpoint(jsonLd)).toBe(false);
    });

    it('should correctly identify v2.0 checkpoints', () => {
      expect(isV2Checkpoint(sampleV2Checkpoint)).toBe(true);
      expect(isJsonLdCheckpoint(sampleV2Checkpoint)).toBe(false);
    });

    it('should reject invalid data', () => {
      expect(isJsonLdCheckpoint(null)).toBe(false);
      expect(isV2Checkpoint(null)).toBe(false);

      expect(isJsonLdCheckpoint({})).toBe(false);
      expect(isV2Checkpoint({})).toBe(false);

      expect(isJsonLdCheckpoint({ '@type': 'Question' })).toBe(false);
      expect(isV2Checkpoint({ version: '3.0' })).toBe(false);
    });
  });

  describe('Performance characteristics', () => {
    it('should handle large datasets efficiently', () => {
      // Create a checkpoint with many questions
      const largeCheckpoint: UnifiedCheckpoint = {
        version: '2.0',
        global_rubric: sampleV2Checkpoint.global_rubric,
        checkpoint: {},
      };

      // Generate 100 questions
      for (let i = 0; i < 100; i++) {
        largeCheckpoint.checkpoint[`question-${i}`] = {
          question: `Test question ${i}?`,
          raw_answer: `Test answer ${i}`,
          original_answer_template: `class Answer${i}(BaseAnswer): pass`,
          answer_template: `class ModifiedAnswer${i}(BaseAnswer): answer: str`,
          last_modified: new Date().toISOString(),
          finished: i % 2 === 0,
        };
      }

      const startTime = performance.now();

      const jsonLd = v2ToJsonLd(largeCheckpoint);
      const reconverted = jsonLdToV2(jsonLd);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete round-trip in reasonable time
      expect(duration).toBeLessThan(200); // 200ms threshold

      // Verify data integrity
      expect(jsonLd.dataFeedElement).toHaveLength(100);
      expect(Object.keys(reconverted.checkpoint)).toHaveLength(100);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed v2 checkpoints gracefully', () => {
      const malformedCheckpoint = {
        version: '2.0',
        global_rubric: null,
        checkpoint: null, // This should cause an error
      } as unknown as UnifiedCheckpoint;

      expect(() => v2ToJsonLd(malformedCheckpoint)).toThrow();
    });

    it('should validate JSON-LD output structure', () => {
      // This should not throw with validation enabled
      expect(() => {
        v2ToJsonLd(sampleV2Checkpoint, { validateOutput: true });
      }).not.toThrow();

      // The jsonLdToV2 function currently doesn't validate input structure,
      // but it should gracefully handle malformed input by attempting conversion
      // and potentially producing empty results rather than throwing
      const invalidJsonLd = {
        '@type': 'InvalidType',
        dataFeedElement: [],
        version: 'invalid',
      } as unknown as JsonLdCheckpoint;

      // This should either throw or produce an empty checkpoint
      const result = jsonLdToV2(invalidJsonLd);
      expect(result.version).toBe('2.0'); // Should still produce valid v2 structure
      expect(Object.keys(result.checkpoint)).toHaveLength(0); // But with no questions
    });
  });

  describe('Metadata preservation', () => {
    it('should preserve conversion metadata', () => {
      const jsonLd = v2ToJsonLd(sampleV2Checkpoint, {
        includeMetadata: true,
      });

      const metadataProp = jsonLd.additionalProperty?.find((p) => p.name === 'conversion_metadata');

      expect(metadataProp).toBeDefined();
      expect(typeof metadataProp?.value).toBe('string');

      const metadata = JSON.parse(metadataProp?.value as string);
      expect(metadata.originalVersion).toBe('2.0');
      expect(metadata.totalQuestions).toBe(1);
      expect(metadata.convertedAt).toBeTruthy();
    });

    it('should preserve finished state and timestamps', () => {
      const jsonLd = v2ToJsonLd(sampleV2Checkpoint);
      const question = jsonLd.dataFeedElement[0].item;

      const finishedProp = question.additionalProperty?.find((p) => p.name === 'finished');
      expect(finishedProp?.value).toBe(true);

      expect(jsonLd.dataFeedElement[0].dateModified).toBe('2025-07-19T12:00:00Z');
    });

    it('should preserve Pydantic template code', () => {
      const jsonLd = v2ToJsonLd(sampleV2Checkpoint);
      const softwareCode = jsonLd.dataFeedElement[0].item.hasPart;

      expect(softwareCode.text).toContain('class FranceCapitalAnswer');
      expect(softwareCode.programmingLanguage).toBe('Python');
      expect(softwareCode.codeRepository).toBe('karenina-benchmarks');

      // Verify original template is preserved in metadata
      const originalTemplateProp = jsonLd.dataFeedElement[0].item.additionalProperty?.find(
        (p) => p.name === 'original_answer_template'
      );
      expect(originalTemplateProp?.value).toContain('class CapitalAnswer');
    });
  });
});
