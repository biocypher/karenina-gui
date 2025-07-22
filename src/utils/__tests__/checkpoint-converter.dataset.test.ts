import { describe, it, expect } from 'vitest';
import { v2ToJsonLd, jsonLdToV2 } from '../checkpoint-converter';
import type { UnifiedCheckpoint, JsonLdCheckpoint, DatasetMetadata } from '../../types';

describe('checkpoint-converter dataset metadata', () => {
  const mockCheckpoint: UnifiedCheckpoint = {
    version: '2.0',
    global_rubric: null,
    checkpoint: {
      'question-1': {
        question: 'What is the capital of France?',
        raw_answer: 'Paris',
        original_answer_template: 'class Answer(BaseModel): capital: str',
        answer_template: 'class Answer(BaseModel): capital: str',
        last_modified: '2025-01-20T10:00:00Z',
        finished: false,
      },
    },
  };

  describe('v2ToJsonLd with dataset metadata', () => {
    it('uses default dataset metadata when none is provided', () => {
      const result = v2ToJsonLd(mockCheckpoint);

      expect(result.name).toBe('Karenina LLM Benchmark Checkpoint');
      expect(result.description).toContain('Checkpoint containing 1 benchmark questions');
      expect(result.creator).toBe('Karenina Benchmarking System');
      expect(result.version).toBe('0.1.0');
      expect(result.dateCreated).toBeDefined();
      expect(result.dateModified).toBeDefined();
    });

    it('uses custom dataset metadata when provided', () => {
      const datasetMetadata: DatasetMetadata = {
        name: 'My Custom Dataset',
        description: 'A custom benchmark dataset',
        version: '2.1.0-jsonld',
        creator: {
          '@type': 'Person',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
        dateCreated: '2025-01-01T00:00:00Z',
        dateModified: '2025-01-02T00:00:00Z',
      };

      const checkpointWithMetadata: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: datasetMetadata,
      };

      const result = v2ToJsonLd(checkpointWithMetadata);

      expect(result.name).toBe('My Custom Dataset');
      expect(result.description).toBe('A custom benchmark dataset');
      expect(result.version).toBe('2.1.0-jsonld');
      expect(result.creator).toBe('Jane Doe');
      expect(result.dateCreated).toBe('2025-01-01T00:00:00Z');
      expect(result.dateModified).toBe('2025-01-02T00:00:00Z');
    });

    it('falls back to defaults for missing metadata fields', () => {
      const partialMetadata: DatasetMetadata = {
        name: 'Partial Dataset',
        // description, version, creator, dates missing
      };

      const checkpointWithPartialMetadata: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: partialMetadata,
      };

      const result = v2ToJsonLd(checkpointWithPartialMetadata);

      expect(result.name).toBe('Partial Dataset');
      expect(result.description).toContain('Checkpoint containing 1 benchmark questions'); // fallback
      expect(result.version).toBe('0.1.0'); // fallback
      expect(result.creator).toBe('Karenina Benchmarking System'); // fallback
      expect(result.dateCreated).toBeDefined(); // fallback to timestamp
      expect(result.dateModified).toBeDefined(); // fallback to timestamp
    });

    it('handles organization creator correctly', () => {
      const datasetMetadata: DatasetMetadata = {
        name: 'Organization Dataset',
        creator: {
          '@type': 'Organization',
          name: 'Example Corp',
          description: 'A technology company',
        },
      };

      const checkpointWithOrgCreator: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: datasetMetadata,
      };

      const result = v2ToJsonLd(checkpointWithOrgCreator);

      expect(result.creator).toBe('Example Corp');
    });
  });

  describe('jsonLdToV2 with dataset metadata', () => {
    it('extracts dataset metadata from JSON-LD', () => {
      const jsonLdCheckpoint: JsonLdCheckpoint = {
        '@context': { '@vocab': 'http://schema.org/' },
        '@type': 'Dataset',
        name: 'Extracted Dataset',
        description: 'A dataset extracted from JSON-LD',
        version: '1.5.0',
        creator: 'John Smith',
        dateCreated: '2025-01-15T00:00:00Z',
        dateModified: '2025-01-16T00:00:00Z',
        hasPart: [
          {
            '@type': 'DataFeedItem',
            dateModified: '2025-01-20T10:00:00Z',
            item: {
              '@type': 'Question',
              text: 'What is the capital of France?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Paris',
              },
              hasPart: {
                '@type': 'SoftwareSourceCode',
                text: 'class Answer(BaseModel): capital: str',
                programmingLanguage: 'Python',
              },
            },
          },
        ],
      };

      const result = jsonLdToV2(jsonLdCheckpoint);

      expect(result.dataset_metadata).toBeDefined();
      expect(result.dataset_metadata?.name).toBe('Extracted Dataset');
      expect(result.dataset_metadata?.description).toBe('A dataset extracted from JSON-LD');
      expect(result.dataset_metadata?.version).toBe('1.5.0');
      expect(result.dataset_metadata?.creator).toEqual({
        '@type': 'Person',
        name: 'John Smith',
      });
      expect(result.dataset_metadata?.dateCreated).toBe('2025-01-15T00:00:00Z');
      expect(result.dataset_metadata?.dateModified).toBe('2025-01-16T00:00:00Z');
    });

    it('preserves dataset metadata values even when they look like defaults', () => {
      const jsonLdCheckpoint: JsonLdCheckpoint = {
        '@context': { '@vocab': 'http://schema.org/' },
        '@type': 'Dataset',
        name: 'Karenina LLM Benchmark Checkpoint', // default-looking name
        description: 'Checkpoint containing 1 benchmark questions with answer templates and rubric evaluations',
        version: '3.0.0-jsonld', // default-looking version
        creator: 'Karenina Benchmarking System', // default-looking creator
        dateCreated: '2025-01-15T00:00:00Z',
        dateModified: '2025-01-16T00:00:00Z',
        hasPart: [
          {
            '@type': 'DataFeedItem',
            dateModified: '2025-01-20T10:00:00Z',
            item: {
              '@type': 'Question',
              text: 'What is the capital of France?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Paris',
              },
              hasPart: {
                '@type': 'SoftwareSourceCode',
                text: 'class Answer(BaseModel): capital: str',
                programmingLanguage: 'Python',
              },
            },
          },
        ],
      };

      const result = jsonLdToV2(jsonLdCheckpoint);

      // All metadata values should be preserved, even if they look like defaults
      expect(result.dataset_metadata).toBeDefined();
      expect(result.dataset_metadata?.name).toBe('Karenina LLM Benchmark Checkpoint');
      expect(result.dataset_metadata?.description).toBe(
        'Checkpoint containing 1 benchmark questions with answer templates and rubric evaluations'
      );
      expect(result.dataset_metadata?.version).toBe('3.0.0-jsonld');
      expect(result.dataset_metadata?.creator).toEqual({
        '@type': 'Person',
        name: 'Karenina Benchmarking System',
      });
      expect(result.dataset_metadata?.dateCreated).toBe('2025-01-15T00:00:00Z');
      expect(result.dataset_metadata?.dateModified).toBe('2025-01-16T00:00:00Z');
    });

    it('returns undefined dataset_metadata when no metadata fields are present', () => {
      const jsonLdCheckpoint: JsonLdCheckpoint = {
        '@context': { '@vocab': 'http://schema.org/' },
        '@type': 'Dataset',
        // No name, description, version, creator, or date fields
        hasPart: [
          {
            '@type': 'DataFeedItem',
            dateModified: '2025-01-20T10:00:00Z',
            item: {
              '@type': 'Question',
              text: 'What is the capital of France?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Paris',
              },
              hasPart: {
                '@type': 'SoftwareSourceCode',
                text: 'class Answer(BaseModel): capital: str',
                programmingLanguage: 'Python',
              },
            },
          },
        ],
      };

      const result = jsonLdToV2(jsonLdCheckpoint);

      expect(result.dataset_metadata).toBeUndefined();
    });

    it('preserves all metadata values regardless of content', () => {
      const jsonLdCheckpoint: JsonLdCheckpoint = {
        '@context': { '@vocab': 'http://schema.org/' },
        '@type': 'Dataset',
        name: 'Custom Name', // custom
        description: 'Checkpoint containing 1 benchmark questions with answer templates and rubric evaluations', // default
        version: '3.0.0-jsonld', // default
        creator: 'Custom Creator', // custom
        dateCreated: '2025-01-15T00:00:00Z',
        dateModified: '2025-01-16T00:00:00Z',
        hasPart: [
          {
            '@type': 'DataFeedItem',
            dateModified: '2025-01-20T10:00:00Z',
            item: {
              '@type': 'Question',
              text: 'What is the capital of France?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Paris',
              },
              hasPart: {
                '@type': 'SoftwareSourceCode',
                text: 'class Answer(BaseModel): capital: str',
                programmingLanguage: 'Python',
              },
            },
          },
        ],
      };

      const result = jsonLdToV2(jsonLdCheckpoint);

      expect(result.dataset_metadata).toBeDefined();
      expect(result.dataset_metadata?.name).toBe('Custom Name'); // custom value preserved
      expect(result.dataset_metadata?.description).toBe(
        'Checkpoint containing 1 benchmark questions with answer templates and rubric evaluations'
      ); // all values preserved
      expect(result.dataset_metadata?.version).toBe('3.0.0-jsonld'); // all values preserved
      expect(result.dataset_metadata?.creator).toEqual({
        '@type': 'Person',
        name: 'Custom Creator',
      }); // custom value preserved as Person
      expect(result.dataset_metadata?.dateCreated).toBe('2025-01-15T00:00:00Z');
      expect(result.dataset_metadata?.dateModified).toBe('2025-01-16T00:00:00Z');
    });
  });

  describe('round-trip conversion with dataset metadata', () => {
    it('preserves dataset metadata through v2ToJsonLd -> jsonLdToV2 conversion', () => {
      const originalMetadata: DatasetMetadata = {
        name: 'Roundtrip Dataset',
        description: 'Testing roundtrip conversion',
        version: '1.2.3-jsonld',
        license: 'Apache-2.0',
        keywords: ['test', 'roundtrip'],
        creator: {
          '@type': 'Person',
          name: 'Test Author',
          email: 'test@example.com',
          affiliation: 'Test University',
        },
        custom_properties: {
          test_prop: 'test_value',
        },
      };

      const checkpointWithMetadata: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: originalMetadata,
      };

      // Convert to JSON-LD and back
      const jsonLd = v2ToJsonLd(checkpointWithMetadata);
      const converted = jsonLdToV2(jsonLd);

      // Check that key metadata survived the conversion
      expect(converted.dataset_metadata?.name).toBe(originalMetadata.name);
      expect(converted.dataset_metadata?.description).toBe(originalMetadata.description);
      expect(converted.dataset_metadata?.version).toBe('1.2.3-jsonld');
      expect(converted.dataset_metadata?.creator?.name).toBe('Test Author');
      expect(converted.dataset_metadata?.dateCreated).toBeDefined();
      expect(converted.dataset_metadata?.dateModified).toBeDefined();

      // Note: keywords, license, and custom_properties are not part of the basic schema.org Dataset
      // so they won't survive the roundtrip unless we add them as additionalProperty
    });
  });

  describe('timestamp behavior', () => {
    it('new checkpoints without metadata can have equal timestamps initially', () => {
      const checkpointWithoutMetadata = { ...mockCheckpoint, dataset_metadata: undefined };

      const result = v2ToJsonLd(checkpointWithoutMetadata);

      // For brand new checkpoints, equal timestamps are acceptable
      expect(result.dateCreated).toBeDefined();
      expect(result.dateModified).toBeDefined();
      // They could be equal for new checkpoints - this is not necessarily wrong
    });

    it('preserves dateCreated from existing metadata', () => {
      const originalDateCreated = '2025-01-01T00:00:00Z';
      const checkpointWithExistingDate: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: {
          dateCreated: originalDateCreated,
          dateModified: '2025-01-10T12:00:00Z',
        },
      };

      const result = v2ToJsonLd(checkpointWithExistingDate);

      // dateCreated should never change once set
      expect(result.dateCreated).toBe(originalDateCreated);
      expect(result.dateModified).toBe('2025-01-10T12:00:00Z');
    });

    it('preserves existing dateModified for pure conversions', () => {
      const originalDateCreated = '2025-01-01T00:00:00Z';
      const originalDateModified = '2025-01-10T12:00:00Z';
      const checkpointWithBothDates: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: {
          dateCreated: originalDateCreated,
          dateModified: originalDateModified,
        },
      };

      const result = v2ToJsonLd(checkpointWithBothDates, { isCreation: false });

      // Both dates should be preserved for pure conversions
      expect(result.dateCreated).toBe(originalDateCreated);
      expect(result.dateModified).toBe(originalDateModified);
    });

    it('updates dateModified when isCreation flag is set', () => {
      const originalDateCreated = '2025-01-01T00:00:00Z';
      const originalDateModified = '2025-01-10T12:00:00Z';
      const checkpointWithBothDates: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: {
          dateCreated: originalDateCreated,
          dateModified: originalDateModified,
        },
      };

      const beforeConversion = new Date().toISOString();
      const result = v2ToJsonLd(checkpointWithBothDates, { isCreation: true });
      const afterConversion = new Date().toISOString();

      // dateCreated should be preserved
      expect(result.dateCreated).toBe(originalDateCreated);
      // dateModified should be updated to current time
      expect(result.dateModified).not.toBe(originalDateModified);
      expect(result.dateModified >= beforeConversion).toBe(true);
      expect(result.dateModified <= afterConversion).toBe(true);
    });

    it('handles partial metadata with missing dateCreated', () => {
      const checkpointWithPartialMetadata: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: {
          name: 'Test Dataset',
          dateModified: '2025-01-10T12:00:00Z',
          // dateCreated is missing
        },
      };

      const result = v2ToJsonLd(checkpointWithPartialMetadata);

      // Should generate new dateCreated
      expect(result.dateCreated).toBeDefined();
      expect(result.dateCreated).not.toBe('2025-01-10T12:00:00Z');
      // Should preserve existing dateModified
      expect(result.dateModified).toBe('2025-01-10T12:00:00Z');
    });

    it('handles partial metadata with missing dateModified', () => {
      const checkpointWithPartialMetadata: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: {
          name: 'Test Dataset',
          dateCreated: '2025-01-01T00:00:00Z',
          // dateModified is missing
        },
      };

      const result = v2ToJsonLd(checkpointWithPartialMetadata);

      // Should preserve existing dateCreated
      expect(result.dateCreated).toBe('2025-01-01T00:00:00Z');
      // Should generate new dateModified
      expect(result.dateModified).toBeDefined();
      expect(result.dateModified).not.toBe('2025-01-01T00:00:00Z');
    });

    it('ensures timestamps are properly preserved through round-trip conversion', () => {
      const originalDateCreated = '2025-01-01T00:00:00Z';
      const originalDateModified = '2025-01-15T10:30:00Z';

      const checkpointWithTimestamps: UnifiedCheckpoint = {
        ...mockCheckpoint,
        dataset_metadata: {
          name: 'Timestamp Test Dataset',
          dateCreated: originalDateCreated,
          dateModified: originalDateModified,
        },
      };

      // Convert to JSON-LD and back
      const jsonLd = v2ToJsonLd(checkpointWithTimestamps, { isCreation: false });
      const converted = jsonLdToV2(jsonLd);

      // Timestamps should survive round-trip conversion
      expect(converted.dataset_metadata?.dateCreated).toBe(originalDateCreated);
      expect(converted.dataset_metadata?.dateModified).toBe(originalDateModified);
    });

    it('generates different timestamps when creating multiple new checkpoints', () => {
      const checkpointWithoutMetadata = { ...mockCheckpoint, dataset_metadata: undefined };

      const result1 = v2ToJsonLd(checkpointWithoutMetadata, { isCreation: true });
      // Small delay to ensure different timestamps
      const delay = new Promise((resolve) => setTimeout(resolve, 10));

      return delay.then(() => {
        const result2 = v2ToJsonLd(checkpointWithoutMetadata, { isCreation: true });

        // Different conversion calls should generate different dateModified values
        expect(result1.dateModified).not.toBe(result2.dateModified);
        expect(result1.dateCreated).not.toBe(result2.dateCreated);
      });
    });
  });

  describe('DataFeedItem dateCreated field', () => {
    it('uses date_created field from CheckpointItem when available', () => {
      const checkpointWithDateCreated: UnifiedCheckpoint = {
        ...mockCheckpoint,
        checkpoint: {
          'question-1': {
            question: 'Test question?',
            raw_answer: 'Test answer',
            original_answer_template: 'class Answer(BaseModel): text: str',
            answer_template: 'class Answer(BaseModel): text: str',
            date_created: '2025-01-01T10:00:00Z',
            last_modified: '2025-01-15T14:30:00Z',
            finished: true,
          },
        },
      };

      const result = v2ToJsonLd(checkpointWithDateCreated);

      expect(result.hasPart).toHaveLength(1);
      const dataFeedItem = result.hasPart[0];

      expect(dataFeedItem.dateCreated).toBe('2025-01-01T10:00:00Z');
      expect(dataFeedItem.dateModified).toBe('2025-01-15T14:30:00Z');
    });

    it('falls back to last_modified when date_created is not available', () => {
      const checkpointWithoutDateCreated: UnifiedCheckpoint = {
        ...mockCheckpoint,
        checkpoint: {
          'question-1': {
            question: 'Test question?',
            raw_answer: 'Test answer',
            original_answer_template: 'class Answer(BaseModel): text: str',
            answer_template: 'class Answer(BaseModel): text: str',
            // No date_created field
            last_modified: '2025-01-15T14:30:00Z',
            finished: true,
          },
        },
      };

      const result = v2ToJsonLd(checkpointWithoutDateCreated);

      expect(result.hasPart).toHaveLength(1);
      const dataFeedItem = result.hasPart[0];

      // Both should be the same when falling back
      expect(dataFeedItem.dateCreated).toBe('2025-01-15T14:30:00Z');
      expect(dataFeedItem.dateModified).toBe('2025-01-15T14:30:00Z');
    });

    it('preserves DataFeedItem dateCreated during round-trip conversion', () => {
      const originalDateCreated = '2025-01-01T10:00:00Z';
      const originalDateModified = '2025-01-15T14:30:00Z';

      const checkpointWithDates: UnifiedCheckpoint = {
        ...mockCheckpoint,
        checkpoint: {
          'question-1': {
            question: 'Test question?',
            raw_answer: 'Test answer',
            original_answer_template: 'class Answer(BaseModel): text: str',
            answer_template: 'class Answer(BaseModel): text: str',
            date_created: originalDateCreated,
            last_modified: originalDateModified,
            finished: true,
          },
        },
      };

      // Convert to JSON-LD and back
      const jsonLd = v2ToJsonLd(checkpointWithDates);
      const converted = jsonLdToV2(jsonLd);

      // Verify the DataFeedItem dates survived the round-trip
      const convertedItem = Object.values(converted.checkpoint)[0];
      expect(convertedItem.date_created).toBe(originalDateCreated);
      expect(convertedItem.last_modified).toBe(originalDateModified);
    });
  });
});
