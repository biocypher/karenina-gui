import { describe, it, expect } from 'vitest';
import { v2ToJsonLd, jsonLdToV2 } from '../checkpoint-converter';
import { UnifiedCheckpoint, ManualRubricTrait } from '../../types';

describe('Manual Rubric Traits in Checkpoint Conversion', () => {
  const sampleManualTraits: ManualRubricTrait[] = [
    {
      name: 'Contains Email',
      description: 'Check if response contains an email address',
      pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      case_sensitive: false,
    },
    {
      name: 'Starts with Hello',
      description: 'Check if response starts with a greeting',
      pattern: '^Hello',
      case_sensitive: true,
    },
  ];

  const questionManualTraits: ManualRubricTrait[] = [
    {
      name: 'Contains URL',
      description: 'Check if response contains a URL',
      pattern: 'https?://[^\\s]+',
      case_sensitive: false,
      invert_result: false,
    },
  ];

  it('should export and import global manual_traits correctly', () => {
    const checkpoint: UnifiedCheckpoint = {
      version: '2.0',
      global_rubric: {
        traits: [
          {
            name: 'Clarity',
            description: 'Measures response clarity',
            kind: 'score',
            min_score: 1,
            max_score: 5,
          },
        ],
        manual_traits: sampleManualTraits,
      },
      checkpoint: {
        q1: {
          question: 'What is your email?',
          raw_answer: 'test@example.com',
          original_answer_template: 'class Answer(BaseModel): pass',
          answer_template: 'class Answer(BaseModel): email: str',
          last_modified: new Date().toISOString(),
          finished: true,
        },
      },
    };

    // Convert to JSON-LD
    const jsonLd = v2ToJsonLd(checkpoint);

    // Verify manual_traits are in additionalProperty
    expect(jsonLd.additionalProperty).toBeDefined();
    const manualTraitsProp = jsonLd.additionalProperty?.find((prop) => prop.name === 'global_manual_rubric_traits');
    expect(manualTraitsProp).toBeDefined();
    expect(manualTraitsProp?.value).toBeDefined();

    const exportedManualTraits = JSON.parse(manualTraitsProp!.value as string);
    expect(exportedManualTraits).toEqual(sampleManualTraits);

    // Convert back to v2
    const v2 = jsonLdToV2(jsonLd);

    // Verify manual_traits are preserved
    expect(v2.global_rubric).toBeDefined();
    expect(v2.global_rubric?.manual_traits).toEqual(sampleManualTraits);
    expect(v2.global_rubric?.traits.length).toBe(1);
  });

  it('should export and import question-specific manual_traits correctly', () => {
    const checkpoint: UnifiedCheckpoint = {
      version: '2.0',
      global_rubric: null,
      checkpoint: {
        q1: {
          question: 'Provide a website URL',
          raw_answer: 'https://example.com',
          original_answer_template: 'class Answer(BaseModel): pass',
          answer_template: 'class Answer(BaseModel): url: str',
          last_modified: new Date().toISOString(),
          finished: true,
          question_rubric: {
            traits: [
              {
                name: 'Valid URL',
                description: 'URL is valid',
                kind: 'boolean',
              },
            ],
            manual_traits: questionManualTraits,
          },
        },
      },
    };

    // Convert to JSON-LD
    const jsonLd = v2ToJsonLd(checkpoint);

    // Verify question has manual_traits in additionalProperty
    const question = jsonLd.dataFeedElement[0].item;
    expect(question.additionalProperty).toBeDefined();

    const manualTraitsProp = question.additionalProperty?.find((prop) => prop.name === 'question_manual_rubric_traits');
    expect(manualTraitsProp).toBeDefined();

    const exportedManualTraits = JSON.parse(manualTraitsProp!.value as string);
    expect(exportedManualTraits).toEqual(questionManualTraits);

    // Convert back to v2
    const v2 = jsonLdToV2(jsonLd);

    // Verify question-specific manual_traits are preserved
    expect(v2.checkpoint.q1.question_rubric).toBeDefined();
    expect(v2.checkpoint.q1.question_rubric?.manual_traits).toEqual(questionManualTraits);
    expect(v2.checkpoint.q1.question_rubric?.traits.length).toBe(1);
  });

  it('should handle rubric with only manual_traits (no regular traits)', () => {
    const checkpoint: UnifiedCheckpoint = {
      version: '2.0',
      global_rubric: {
        traits: [],
        manual_traits: sampleManualTraits,
      },
      checkpoint: {
        q1: {
          question: 'Test question',
          raw_answer: 'Test answer',
          original_answer_template: 'class Answer(BaseModel): pass',
          answer_template: 'class Answer(BaseModel): response: str',
          last_modified: new Date().toISOString(),
          finished: true,
        },
      },
    };

    // Convert to JSON-LD
    const jsonLd = v2ToJsonLd(checkpoint);

    // Verify manual_traits are exported even with no regular traits
    const manualTraitsProp = jsonLd.additionalProperty?.find((prop) => prop.name === 'global_manual_rubric_traits');
    expect(manualTraitsProp).toBeDefined();

    // Convert back to v2
    const v2 = jsonLdToV2(jsonLd);

    // Verify rubric is created with manual_traits
    expect(v2.global_rubric).toBeDefined();
    expect(v2.global_rubric?.manual_traits).toEqual(sampleManualTraits);
    expect(v2.global_rubric?.traits).toEqual([]);
  });

  it('should handle checkpoint with both global and question-specific manual_traits', () => {
    const checkpoint: UnifiedCheckpoint = {
      version: '2.0',
      global_rubric: {
        traits: [{ name: 'Global Trait', kind: 'boolean' }],
        manual_traits: sampleManualTraits,
      },
      checkpoint: {
        q1: {
          question: 'Question with specific traits',
          raw_answer: 'Answer',
          original_answer_template: 'class Answer(BaseModel): pass',
          answer_template: 'class Answer(BaseModel): text: str',
          last_modified: new Date().toISOString(),
          finished: true,
          question_rubric: {
            traits: [{ name: 'Question Trait', kind: 'boolean' }],
            manual_traits: questionManualTraits,
          },
        },
        q2: {
          question: 'Question without specific traits',
          raw_answer: 'Answer 2',
          original_answer_template: 'class Answer(BaseModel): pass',
          answer_template: 'class Answer(BaseModel): text: str',
          last_modified: new Date().toISOString(),
          finished: true,
        },
      },
    };

    // Convert to JSON-LD and back
    const jsonLd = v2ToJsonLd(checkpoint);
    const v2 = jsonLdToV2(jsonLd);

    // Verify global manual_traits
    expect(v2.global_rubric?.manual_traits).toEqual(sampleManualTraits);
    expect(v2.global_rubric?.traits.length).toBe(1);

    // Verify question-specific manual_traits
    expect(v2.checkpoint.q1.question_rubric?.manual_traits).toEqual(questionManualTraits);
    expect(v2.checkpoint.q1.question_rubric?.traits.length).toBe(1);

    // Verify q2 has no question_rubric
    expect(v2.checkpoint.q2.question_rubric).toBeUndefined();
  });

  it('should handle manual_traits with callable_name instead of pattern', () => {
    const callableTraits: ManualRubricTrait[] = [
      {
        name: 'Custom Validator',
        description: 'Uses a custom validation function',
        callable_name: 'validate_custom_format',
        invert_result: false,
      },
    ];

    const checkpoint: UnifiedCheckpoint = {
      version: '2.0',
      global_rubric: {
        traits: [],
        manual_traits: callableTraits,
      },
      checkpoint: {
        q1: {
          question: 'Test',
          raw_answer: 'Answer',
          original_answer_template: 'class Answer(BaseModel): pass',
          answer_template: 'class Answer(BaseModel): text: str',
          last_modified: new Date().toISOString(),
          finished: true,
        },
      },
    };

    // Convert to JSON-LD and back
    const jsonLd = v2ToJsonLd(checkpoint);
    const v2 = jsonLdToV2(jsonLd);

    // Verify callable_name is preserved
    expect(v2.global_rubric?.manual_traits).toEqual(callableTraits);
    expect(v2.global_rubric?.manual_traits?.[0].callable_name).toBe('validate_custom_format');
    expect(v2.global_rubric?.manual_traits?.[0].pattern).toBeUndefined();
  });
});
