/**
 * Rubric Management Integration Tests
 *
 * Tests the rubric trait management workflow including:
 * - Adding rubric traits to questions
 * - Multiple trait types (LLM, Regex, Callable, Metric)
 * - Global rubric inheritance
 *
 * integ-025: Test add rubric trait to question
 * integ-026: Test multiple trait types
 * integ-027: Test global rubric inheritance
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useQuestionStore } from '../../../src/stores/useQuestionStore';
import { useDatasetStore } from '../../../src/stores/useDatasetStore';
import { useRubricStore } from '../../../src/stores/useRubricStore';
import type { UnifiedCheckpoint } from '../../../src/types';
import type { LLMRubricTrait, RegexTrait, Rubric } from '../../../src/types';
import sampleTraitsFixture from '../../../src/test-utils/fixtures/rubric/sample-traits.json';

// Helper to create a mock checkpoint with questions
const createMockCheckpoint = (): UnifiedCheckpoint => {
  return {
    version: '2.0',
    global_rubric: null,
    checkpoint: {
      q1: {
        question: 'What is the capital of France?',
        raw_answer: 'Paris',
        original_answer_template: 'class Answer(BaseModel):\n    capital: str = Field(description="The capital city")',
        answer_template: 'class Answer(BaseModel):\n    capital: str = Field(description="The capital city")',
        last_modified: new Date().toISOString(),
        finished: false,
        question_rubric: undefined,
      },
      q2: {
        question: 'What is 2 + 2?',
        raw_answer: '4',
        original_answer_template:
          'class Answer(BaseModel):\n    result: int = Field(description="The result of 2 + 2")',
        answer_template: 'class Answer(BaseModel):\n    result: int = Field(description="The result of 2 + 2")',
        last_modified: new Date().toISOString(),
        finished: false,
        question_rubric: undefined,
      },
      q3: {
        question: 'Who wrote Romeo and Juliet?',
        raw_answer: 'William Shakespeare',
        original_answer_template:
          'class Answer(BaseModel):\n    author: str = Field(description="The author of the play")',
        answer_template: 'class Answer(BaseModel):\n    author: str = Field(description="The author of the play")',
        last_modified: new Date().toISOString(),
        finished: false,
        question_rubric: undefined,
      },
    },
  };
};

describe('Rubric Management Integration Tests', () => {
  beforeEach(() => {
    // Reset stores before each test
    useQuestionStore.getState().resetQuestionState();
    useDatasetStore.getState().resetBenchmarkState();
    useDatasetStore.getState().resetMetadata();
    useRubricStore.getState().reset();
  });

  describe('integ-025: Add rubric trait to question', () => {
    it('should add an LLM rubric trait to a question', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // Create an LLM rubric trait
      const llmTrait: LLMRubricTrait = {
        name: 'clarity',
        description: 'Is the response clear and easy to understand?',
        kind: 'score',
        min_score: 1,
        max_score: 5,
        higher_is_better: true,
      };

      // Create a rubric with the trait
      const rubric: Rubric = {
        llm_traits: [llmTrait],
      };

      // Set the rubric for q1
      useQuestionStore.getState().setQuestionRubric('q1', rubric);

      // Verify the rubric is stored
      const storedRubric = useQuestionStore.getState().getQuestionRubric('q1');
      expect(storedRubric).toBeDefined();
      expect(storedRubric?.llm_traits).toHaveLength(1);
      expect(storedRubric?.llm_traits[0].name).toBe('clarity');
      expect(storedRubric?.llm_traits[0].kind).toBe('score');
      expect(storedRubric?.llm_traits[0].min_score).toBe(1);
      expect(storedRubric?.llm_traits[0].max_score).toBe(5);
    });

    it('should verify rubric trait persisted in checkpoint', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // Create and set a rubric
      const rubric: Rubric = {
        llm_traits: [
          {
            name: 'conciseness',
            description: 'Is the response concise without unnecessary verbosity?',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().setQuestionRubric('q2', rubric);

      // Verify it's in the checkpoint
      const currentCheckpoint = useQuestionStore.getState().checkpoint;
      expect(currentCheckpoint['q2']?.question_rubric).toBeDefined();
      expect(currentCheckpoint['q2']?.question_rubric?.llm_traits[0].name).toBe('conciseness');
    });

    it('should verify last_modified updates when rubric is added', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      const beforeTimestamp = useQuestionStore.getState().checkpoint['q1']?.last_modified || '';

      // Wait a bit to ensure timestamp difference
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // empty loop for small delay
      }

      const rubric: Rubric = {
        llm_traits: [
          {
            name: 'has_sources',
            description: 'Does the response cite sources?',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().setQuestionRubric('q1', rubric);

      const afterTimestamp = useQuestionStore.getState().checkpoint['q1']?.last_modified || '';

      expect(afterTimestamp).not.toBe(beforeTimestamp);
    });

    it('should support multiple traits on a single question', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      const rubric: Rubric = {
        llm_traits: [
          {
            name: 'clarity',
            kind: 'score',
            min_score: 1,
            max_score: 5,
            higher_is_better: true,
          },
          {
            name: 'has_citations',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
        regex_traits: [
          {
            name: 'has_brackets',
            pattern: '\\[.*\\]',
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().setQuestionRubric('q3', rubric);

      const storedRubric = useQuestionStore.getState().getQuestionRubric('q3');
      expect(storedRubric?.llm_traits).toHaveLength(2);
      expect(storedRubric?.regex_traits).toHaveLength(1);
      expect(storedRubric?.llm_traits[0].name).toBe('clarity');
      expect(storedRubric?.llm_traits[1].name).toBe('has_citations');
      expect(storedRubric?.regex_traits?.[0].name).toBe('has_brackets');
    });

    it('should load sample traits from fixture and apply to question', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // Load traits from fixture
      const fixtureRubric = sampleTraitsFixture as unknown as Rubric;

      useQuestionStore.getState().setQuestionRubric('q1', fixtureRubric);

      const storedRubric = useQuestionStore.getState().getQuestionRubric('q1');
      expect(storedRubric).toBeDefined();
      expect(storedRubric?.llm_traits).toHaveLength(2);
      expect(storedRubric?.regex_traits).toHaveLength(1);
      expect(storedRubric?.metric_traits).toHaveLength(1);

      // Verify LLM trait properties
      const clarityTrait = storedRubric?.llm_traits?.find((t) => t.name === 'clarity');
      expect(clarityTrait).toBeDefined();
      expect(clarityTrait?.kind).toBe('score');
      expect(clarityTrait?.min_score).toBe(1);
      expect(clarityTrait?.max_score).toBe(5);

      // Verify regex trait properties
      const bracketTrait = storedRubric?.regex_traits?.find((t) => t.name === 'contains_bracketed_answer');
      expect(bracketTrait).toBeDefined();
      expect(bracketTrait?.pattern).toBeDefined();
    });

    it('should replace existing rubric when setting new one', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // Set initial rubric
      const initialRubric: Rubric = {
        llm_traits: [
          {
            name: 'trait1',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
      };
      useQuestionStore.getState().setQuestionRubric('q1', initialRubric);

      expect(useQuestionStore.getState().getQuestionRubric('q1')?.llm_traits).toHaveLength(1);

      // Replace with new rubric
      const newRubric: Rubric = {
        llm_traits: [
          {
            name: 'trait2',
            kind: 'score',
            min_score: 1,
            max_score: 10,
            higher_is_better: true,
          },
        ],
      };
      useQuestionStore.getState().setQuestionRubric('q1', newRubric);

      const storedRubric = useQuestionStore.getState().getQuestionRubric('q1');
      expect(storedRubric?.llm_traits).toHaveLength(1);
      expect(storedRubric?.llm_traits[0].name).toBe('trait2');
    });
  });

  describe('integ-026: Multiple trait types', () => {
    it('should store LLM rubric trait with correct configuration', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      const llmTrait: LLMRubricTrait = {
        name: 'completeness',
        description: 'Does the answer fully address the question?',
        kind: 'score',
        min_score: 1,
        max_score: 10,
        higher_is_better: true,
        deep_judgment_enabled: true,
        deep_judgment_excerpt_enabled: true,
        deep_judgment_max_excerpts: 5,
        deep_judgment_fuzzy_match_threshold: 0.8,
        deep_judgment_excerpt_retry_attempts: 3,
        deep_judgment_search_enabled: false,
      };

      const rubric: Rubric = { llm_traits: [llmTrait] };
      useQuestionStore.getState().setQuestionRubric('q1', rubric);

      const stored = useQuestionStore.getState().getQuestionRubric('q1');
      const storedTrait = stored?.llm_traits[0];

      expect(storedTrait?.name).toBe('completeness');
      expect(storedTrait?.deep_judgment_enabled).toBe(true);
      expect(storedTrait?.deep_judgment_max_excerpts).toBe(5);
      expect(storedTrait?.deep_judgment_fuzzy_match_threshold).toBe(0.8);
    });

    it('should store regex trait with pattern configuration', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      const regexTrait: RegexTrait = {
        name: 'has_date_format',
        description: 'Response contains a date in YYYY-MM-DD format',
        pattern: '\\d{4}-\\d{2}-\\d{2}',
        case_sensitive: false,
        invert_result: false,
        higher_is_better: true,
      };

      const rubric: Rubric = { regex_traits: [regexTrait] };
      useQuestionStore.getState().setQuestionRubric('q1', rubric);

      const stored = useQuestionStore.getState().getQuestionRubric('q1');
      const storedTrait = stored?.regex_traits?.[0];

      expect(storedTrait?.name).toBe('has_date_format');
      expect(storedTrait?.pattern).toBe('\\d{4}-\\d{2}-\\d{2}');
      expect(storedTrait?.case_sensitive).toBe(false);
      expect(storedTrait?.invert_result).toBe(false);
    });

    it('should store metric trait with evaluation mode', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      const rubric: Rubric = {
        metric_traits: [
          {
            name: 'gene_extraction',
            description: 'Extract gene names from biomedical text',
            evaluation_mode: 'full_matrix',
            metrics: ['precision', 'recall', 'f1'],
            tp_instructions: ['Standard HGNC gene symbols', 'All capital letters'],
            tn_instructions: ['Common English words', 'Non-gene abbreviations'],
            repeated_extraction: true,
          },
        ],
      };

      useQuestionStore.getState().setQuestionRubric('q1', rubric);

      const stored = useQuestionStore.getState().getQuestionRubric('q1');
      const storedTrait = stored?.metric_traits?.[0];

      expect(storedTrait?.name).toBe('gene_extraction');
      expect(storedTrait?.evaluation_mode).toBe('full_matrix');
      expect(storedTrait?.metrics).toEqual(['precision', 'recall', 'f1']);
      expect(storedTrait?.tp_instructions).toHaveLength(2);
      expect(storedTrait?.tn_instructions).toHaveLength(2);
    });

    it('should verify all trait types coexist in same rubric', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      const rubric: Rubric = {
        llm_traits: [
          {
            name: 'quality',
            kind: 'score',
            min_score: 1,
            max_score: 5,
            higher_is_better: true,
          },
        ],
        regex_traits: [
          {
            name: 'has_keywords',
            pattern: '(important|critical)',
            higher_is_better: true,
          },
        ],
        metric_traits: [
          {
            name: 'entity_extraction',
            evaluation_mode: 'tp_only',
            metrics: ['f1'],
            tp_instructions: ['Named entities'],
            repeated_extraction: false,
          },
        ],
      };

      useQuestionStore.getState().setQuestionRubric('q1', rubric);

      const stored = useQuestionStore.getState().getQuestionRubric('q1');
      expect(stored?.llm_traits).toHaveLength(1);
      expect(stored?.regex_traits).toHaveLength(1);
      expect(stored?.metric_traits).toHaveLength(1);
    });
  });

  describe('integ-027: Global rubric inheritance', () => {
    it('should verify global rubric is stored in checkpoint', () => {
      const checkpoint = createMockCheckpoint();
      checkpoint.global_rubric = {
        llm_traits: [
          {
            name: 'global_safety',
            description: 'Response is safe and appropriate',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // Verify global rubric is loaded into useRubricStore
      const globalRubric = useRubricStore.getState().currentRubric;
      expect(globalRubric).toBeDefined();
      expect(globalRubric?.llm_traits).toHaveLength(1);
      expect(globalRubric?.llm_traits[0].name).toBe('global_safety');
    });

    it('should verify question-specific rubric overrides global', () => {
      const checkpoint = createMockCheckpoint();
      checkpoint.global_rubric = {
        llm_traits: [
          {
            name: 'global_clarity',
            kind: 'score',
            min_score: 1,
            max_score: 5,
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // Set question-specific rubric
      const questionRubric: Rubric = {
        llm_traits: [
          {
            name: 'question_specific_clarity',
            kind: 'score',
            min_score: 1,
            max_score: 10,
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().setQuestionRubric('q1', questionRubric);

      // Question rubric should be independent
      const questionStored = useQuestionStore.getState().getQuestionRubric('q1');
      expect(questionStored?.llm_traits[0].name).toBe('question_specific_clarity');
      expect(questionStored?.llm_traits[0].max_score).toBe(10);

      // Global rubric should remain unchanged
      const globalStored = useRubricStore.getState().currentRubric;
      expect(globalStored?.llm_traits[0].name).toBe('global_clarity');
      expect(globalStored?.llm_traits[0].max_score).toBe(5);
    });

    it('should verify questions without specific rubric inherit from global', () => {
      const checkpoint = createMockCheckpoint();
      checkpoint.global_rubric = {
        llm_traits: [
          {
            name: 'global_quality',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // q1 has no question-specific rubric
      const q1Rubric = useQuestionStore.getState().getQuestionRubric('q1');
      expect(q1Rubric).toBeNull();

      // Global rubric should be available in useRubricStore
      const globalRubric = useRubricStore.getState().currentRubric;
      expect(globalRubric?.llm_traits[0].name).toBe('global_quality');
    });

    it('should support setting global rubric in useRubricStore', () => {
      const checkpoint = createMockCheckpoint();
      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      const globalRubric: Rubric = {
        llm_traits: [
          {
            name: 'has_references',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
        regex_traits: [
          {
            name: 'no_hallucinations',
            pattern: 'TODO|FIXME|placeholder',
            invert_result: true,
            higher_is_better: true,
          },
        ],
      };

      useRubricStore.getState().setCurrentRubric(globalRubric);

      const stored = useRubricStore.getState().currentRubric;
      expect(stored?.llm_traits).toHaveLength(1);
      expect(stored?.regex_traits).toHaveLength(1);
      expect(stored?.llm_traits[0].name).toBe('has_references');
      expect(stored?.regex_traits?.[0].invert_result).toBe(true);
    });

    it('should verify removing question rubric exposes global inheritance', () => {
      const checkpoint = createMockCheckpoint();
      checkpoint.global_rubric = {
        llm_traits: [
          {
            name: 'global_trait',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // Set question-specific rubric
      const questionRubric: Rubric = {
        llm_traits: [
          {
            name: 'question_trait',
            kind: 'boolean',
            higher_is_better: true,
          },
        ],
      };
      useQuestionStore.getState().setQuestionRubric('q1', questionRubric);

      expect(useQuestionStore.getState().getQuestionRubric('q1')?.llm_traits[0].name).toBe('question_trait');

      // Remove question rubric
      useQuestionStore.getState().clearQuestionRubric('q1');

      // Now question should have no specific rubric (inherits from global)
      expect(useQuestionStore.getState().getQuestionRubric('q1')).toBeNull();

      // Global should still exist in useRubricStore
      expect(useRubricStore.getState().currentRubric?.llm_traits[0].name).toBe('global_trait');
    });

    it('should verify multiple questions can inherit same global rubric', () => {
      const checkpoint = createMockCheckpoint();
      checkpoint.global_rubric = {
        llm_traits: [
          {
            name: 'standard_quality',
            kind: 'score',
            min_score: 1,
            max_score: 5,
            higher_is_better: true,
          },
        ],
      };

      useQuestionStore.getState().loadCheckpoint(checkpoint);
      useDatasetStore.getState().markBenchmarkAsInitialized();

      // All questions should have no question-specific rubric
      expect(useQuestionStore.getState().getQuestionRubric('q1')).toBeNull();
      expect(useQuestionStore.getState().getQuestionRubric('q2')).toBeNull();
      expect(useQuestionStore.getState().getQuestionRubric('q3')).toBeNull();

      // All can access the same global rubric via useRubricStore
      const global = useRubricStore.getState().currentRubric;
      expect(global?.llm_traits[0].name).toBe('standard_quality');
    });
  });
});
