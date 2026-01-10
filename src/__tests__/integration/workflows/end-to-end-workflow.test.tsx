/**
 * End-to-End Workflow Integration Tests
 *
 * Tests complete workflows that span multiple features:
 * - Preset application and verification workflow
 * - Full file-to-verification journey
 * - Database round-trip
 *
 * integ-033: Test full file-to-verification journey (pending)
 * integ-034: Test database round-trip
 * integ-056: Test preset application and verification
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePresetStore } from '../../../stores/usePresetStore';
import { useBenchmarkStore } from '../../../stores/useBenchmarkStore';
import { useQuestionStore } from '../../../stores/useQuestionStore';
import { useDatasetStore } from '../../../stores/useDatasetStore';
import type { VerificationConfig } from '../../../utils/presetApi';

// Mock CSRF
vi.mock('../../../utils/csrf', () => ({
  csrf: {
    fetchWithCsrf: vi.fn(),
    getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  },
}));

describe('End-to-End Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset preset store
    usePresetStore.setState({
      presets: [],
      currentPresetId: null,
      isLoading: false,
      error: null,
    });

    // Reset benchmark store to default
    useBenchmarkStore.setState({
      answeringModels: [
        {
          id: 'answering-1',
          model_provider: 'anthropic',
          model_name: 'claude-haiku-4-5',
          temperature: 0.1,
          interface: 'langchain',
          system_prompt: 'Default answering prompt',
        },
      ],
      parsingModels: [
        {
          id: 'parsing-1',
          model_provider: 'anthropic',
          model_name: 'claude-haiku-4-5',
          temperature: 0.1,
          interface: 'langchain',
          system_prompt: 'Default parsing prompt',
        },
      ],
      replicateCount: 1,
      runName: '',
      expandedPrompts: new Set(),
      rubricEnabled: false,
      rubricEvaluationStrategy: 'batch',
      evaluationMode: 'template_only',
      correctnessEnabled: true,
      abstentionEnabled: false,
      deepJudgmentTemplateEnabled: false,
      deepJudgmentSearchEnabled: false,
      deepJudgmentRubricEnabled: false,
      deepJudgmentRubricMode: 'enable_all',
      deepJudgmentRubricExtractExcerpts: true,
      fewShotEnabled: false,
      fewShotMode: 'all',
      fewShotK: 3,
    });

    // Reset question store
    useQuestionStore.setState({
      questionData: {},
      checkpoint: {},
      selectedQuestionId: '',
      searchQuery: '',
      filterStatus: 'all',
      draftTemplates: {},
    });

    // Reset dataset store
    useDatasetStore.getState().resetMetadata();
    useDatasetStore.getState().disconnectDatabase();
  });

  describe('integ-056: Preset application and verification', () => {
    const mockPresetConfig: VerificationConfig = {
      answering_models: [
        {
          id: 'preset-answering-1',
          model_provider: 'openai',
          model_name: 'gpt-4',
          temperature: 0.3,
          interface: 'langchain',
          system_prompt: 'Preset answering prompt for GPT-4',
        },
        {
          id: 'preset-answering-2',
          model_provider: 'anthropic',
          model_name: 'claude-opus-4-5',
          temperature: 0.2,
          interface: 'langchain',
          system_prompt: 'Preset answering prompt for Claude Opus',
        },
      ],
      parsing_models: [
        {
          id: 'preset-parsing-1',
          model_provider: 'openai',
          model_name: 'gpt-4',
          temperature: 0.0,
          interface: 'langchain',
          system_prompt: 'Preset parsing prompt - extract answers precisely',
        },
      ],
      replicate_count: 5,
      parsing_only: false,
      rubric_enabled: true,
      rubric_trait_names: ['clarity', 'completeness', 'accuracy'],
      rubric_evaluation_strategy: 'sequential',
      evaluation_mode: 'template_and_rubric',
      abstention_enabled: true,
      deep_judgment_enabled: true,
      deep_judgment_search_enabled: true,
      deep_judgment_rubric_mode: 'enable_all',
      deep_judgment_rubric_global_excerpts: false,
      few_shot_config: {
        enabled: true,
        global_mode: 'k-shot',
        global_k: 7,
        question_configs: {},
        global_external_examples: [],
      },
      db_config: null,
    };

    it('should load preset and apply config to benchmark store', async () => {
      // Mock fetch for preset detail
      vi.mocked(global.fetch).mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;

        if (url.includes('/api/presets/high-quality-preset')) {
          return {
            ok: true,
            json: async () => ({
              preset: {
                id: 'high-quality-preset',
                name: 'High Quality Preset',
                description: 'Preset for high-quality verification',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                config: mockPresetConfig,
              },
            }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const presetStore = usePresetStore.getState();
      const benchmarkStore = useBenchmarkStore.getState();

      // Get preset details (simulating loading a preset)
      const preset = await presetStore.getPresetDetail('high-quality-preset');

      expect(preset).not.toBeNull();
      expect(preset?.name).toBe('High Quality Preset');

      // Apply preset config to benchmark store
      benchmarkStore.applyVerificationConfig(preset!.config);

      // Verify all benchmark settings match preset config
      const stateAfterApply = useBenchmarkStore.getState();

      // Verify answering models
      expect(stateAfterApply.answeringModels).toHaveLength(2);
      expect(stateAfterApply.answeringModels[0].model_name).toBe('gpt-4');
      expect(stateAfterApply.answeringModels[0].model_provider).toBe('openai');
      expect(stateAfterApply.answeringModels[1].model_name).toBe('claude-opus-4-5');
      expect(stateAfterApply.answeringModels[1].temperature).toBe(0.2);

      // Verify parsing models
      expect(stateAfterApply.parsingModels).toHaveLength(1);
      expect(stateAfterApply.parsingModels[0].model_name).toBe('gpt-4');
      expect(stateAfterApply.parsingModels[0].temperature).toBe(0.0);

      // Verify replicate count
      expect(stateAfterApply.replicateCount).toBe(5);

      // Verify rubric settings
      expect(stateAfterApply.rubricEnabled).toBe(true);
      expect(stateAfterApply.evaluationMode).toBe('template_and_rubric');
      expect(stateAfterApply.rubricEvaluationStrategy).toBe('sequential');

      // Verify deep judgment settings
      expect(stateAfterApply.deepJudgmentTemplateEnabled).toBe(true);
      expect(stateAfterApply.deepJudgmentSearchEnabled).toBe(true);
      expect(stateAfterApply.deepJudgmentRubricEnabled).toBe(true);
      expect(stateAfterApply.deepJudgmentRubricMode).toBe('enable_all');
      expect(stateAfterApply.deepJudgmentRubricExtractExcerpts).toBe(false);

      // Verify abstention enabled
      expect(stateAfterApply.abstentionEnabled).toBe(true);

      // Verify few-shot settings
      expect(stateAfterApply.fewShotEnabled).toBe(true);
      expect(stateAfterApply.fewShotMode).toBe('k-shot');
      expect(stateAfterApply.fewShotK).toBe(7);
    });

    it('should verify benchmark settings match preset configuration', async () => {
      // Create a complete verification config
      const testConfig: VerificationConfig = {
        answering_models: [
          {
            id: 'test-answering',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            temperature: 0.0,
            interface: 'langchain',
            system_prompt: 'Test answering prompt',
          },
        ],
        parsing_models: [
          {
            id: 'test-parsing',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            temperature: 0.1,
            interface: 'langchain',
            system_prompt: 'Test parsing prompt',
          },
        ],
        replicate_count: 3,
        rubric_enabled: true,
        evaluation_mode: 'rubric_only',
        abstention_enabled: true,
        deep_judgment_enabled: false,
        deep_judgment_search_enabled: false,
        deep_judgment_rubric_mode: 'use_checkpoint',
        deep_judgment_rubric_global_excerpts: true,
        few_shot_config: {
          enabled: false,
          global_mode: 'all',
          global_k: 5,
          question_configs: {},
          global_external_examples: [],
        },
      };

      const benchmarkStore = useBenchmarkStore.getState();

      // Apply config
      benchmarkStore.applyVerificationConfig(testConfig);

      // Verify all settings applied correctly
      const state = useBenchmarkStore.getState();

      // Models
      expect(state.answeringModels).toHaveLength(1);
      expect(state.answeringModels[0].model_name).toBe('claude-haiku-4-5');
      expect(state.answeringModels[0].temperature).toBe(0.0);

      expect(state.parsingModels).toHaveLength(1);
      expect(state.parsingModels[0].temperature).toBe(0.1);

      // Replicate count
      expect(state.replicateCount).toBe(3);

      // Evaluation mode
      expect(state.rubricEnabled).toBe(true);
      expect(state.evaluationMode).toBe('rubric_only');

      // Abstention
      expect(state.abstentionEnabled).toBe(true);

      // Deep judgment
      expect(state.deepJudgmentTemplateEnabled).toBe(false);
      expect(state.deepJudgmentSearchEnabled).toBe(false);
      expect(state.deepJudgmentRubricEnabled).toBe(true);
      expect(state.deepJudgmentRubricMode).toBe('use_checkpoint');
      expect(state.deepJudgmentRubricExtractExcerpts).toBe(true);

      // Few-shot
      expect(state.fewShotEnabled).toBe(false);
      expect(state.fewShotMode).toBe('all');
      expect(state.fewShotK).toBe(5);
    });

    it('should convert store state back to verification config', () => {
      const benchmarkStore = useBenchmarkStore.getState();

      // Apply preset config first
      benchmarkStore.applyVerificationConfig(mockPresetConfig);

      // Get the config back from store
      const retrievedConfig = benchmarkStore.getCurrentVerificationConfig();

      // Verify config matches what was applied
      expect(retrievedConfig.answering_models).toHaveLength(2);
      expect(retrievedConfig.parsing_models).toHaveLength(1);
      expect(retrievedConfig.replicate_count).toBe(5);
      expect(retrievedConfig.rubric_enabled).toBe(true);
      expect(retrievedConfig.evaluation_mode).toBe('template_and_rubric');
      expect(retrievedConfig.abstention_enabled).toBe(true);
      expect(retrievedConfig.deep_judgment_enabled).toBe(true);
      expect(retrievedConfig.deep_judgment_search_enabled).toBe(true);
      expect(retrievedConfig.deep_judgment_rubric_mode).toBe('enable_all');
      expect(retrievedConfig.few_shot_config?.enabled).toBe(true);
      expect(retrievedConfig.few_shot_config?.global_mode).toBe('k-shot');
      expect(retrievedConfig.few_shot_config?.global_k).toBe(7);
    });

    it('should handle evaluation mode normalization when applying preset', () => {
      const benchmarkStore = useBenchmarkStore.getState();

      // Test case 1: rubric_enabled=true but evaluation_mode=template_only
      // Should normalize to template_and_rubric
      const config1: VerificationConfig = {
        answering_models: [
          {
            id: 'm1',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            interface: 'langchain',
            system_prompt: 'test',
          },
        ],
        parsing_models: [
          {
            id: 'm2',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            interface: 'langchain',
            system_prompt: 'test',
          },
        ],
        replicate_count: 1,
        rubric_enabled: true,
        evaluation_mode: 'template_only', // Should be normalized
      };

      benchmarkStore.applyVerificationConfig(config1);

      let state = useBenchmarkStore.getState();
      expect(state.rubricEnabled).toBe(true);
      expect(state.evaluationMode).toBe('template_and_rubric'); // Normalized

      // Test case 2: rubric_enabled=false but evaluation_mode=template_and_rubric
      // Should normalize to template_only
      const config2: VerificationConfig = {
        answering_models: [
          {
            id: 'm1',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            interface: 'langchain',
            system_prompt: 'test',
          },
        ],
        parsing_models: [
          {
            id: 'm2',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            interface: 'langchain',
            system_prompt: 'test',
          },
        ],
        replicate_count: 1,
        rubric_enabled: false,
        evaluation_mode: 'template_and_rubric', // Should be normalized
      };

      benchmarkStore.applyVerificationConfig(config2);

      state = useBenchmarkStore.getState();
      expect(state.rubricEnabled).toBe(false);
      expect(state.evaluationMode).toBe('template_only'); // Normalized
    });

    it('should apply preset with minimal configuration', () => {
      const benchmarkStore = useBenchmarkStore.getState();

      // Minimal config with only required fields
      const minimalConfig: VerificationConfig = {
        answering_models: [
          {
            id: 'minimal-answering',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            interface: 'langchain',
            system_prompt: 'Minimal prompt',
          },
        ],
        parsing_models: [
          {
            id: 'minimal-parsing',
            model_provider: 'anthropic',
            model_name: 'claude-haiku-4-5',
            interface: 'langchain',
            system_prompt: 'Minimal parsing',
          },
        ],
        replicate_count: 1,
      };

      benchmarkStore.applyVerificationConfig(minimalConfig);

      const state = useBenchmarkStore.getState();

      // Verify defaults applied for optional fields
      expect(state.answeringModels).toHaveLength(1);
      expect(state.parsingModels).toHaveLength(1);
      expect(state.replicateCount).toBe(1);
      expect(state.rubricEnabled).toBe(false); // Default
      expect(state.evaluationMode).toBe('template_only'); // Default
      expect(state.abstentionEnabled).toBe(false); // Default
      expect(state.deepJudgmentTemplateEnabled).toBe(false); // Default
      expect(state.fewShotEnabled).toBe(false); // Default
      expect(state.fewShotK).toBe(3); // Default
    });

    it('should preserve runName when applying preset', () => {
      const benchmarkStore = useBenchmarkStore.getState();

      // Set a run name
      benchmarkStore.setRunName('my-custom-run-name');
      expect(useBenchmarkStore.getState().runName).toBe('my-custom-run-name');

      // Apply preset
      benchmarkStore.applyVerificationConfig(mockPresetConfig);

      // Verify runName is preserved (not overwritten by preset)
      const state = useBenchmarkStore.getState();
      expect(state.runName).toBe('my-custom-run-name');
    });
  });

  describe('integ-034: Database round-trip', () => {
    // Helper to create sample checkpoint (UnifiedCheckpoint format)
    const createSampleUnifiedCheckpoint = () => ({
      version: '1.0' as const,
      checkpoint: {
        q1: {
          question: 'What is the capital of France?',
          raw_answer: 'Paris',
          original_answer_template: 'class Answer(BaseAnswer):\n    capital: str',
          answer_template: 'class Answer(BaseAnswer):\n    capital: str',
          last_modified: '2024-01-10T10:00:00.000Z',
          finished: true,
          question_rubric: undefined,
        },
        q2: {
          question: 'What is 2 + 2?',
          raw_answer: '4',
          original_answer_template: 'class Answer(BaseAnswer):\n    result: int',
          answer_template: 'class Answer(BaseAnswer):\n    result: int',
          last_modified: '2024-01-10T10:05:00.000Z',
          finished: false,
          question_rubric: undefined,
        },
        q3: {
          question: 'Who wrote Romeo and Juliet?',
          raw_answer: 'William Shakespeare',
          original_answer_template: 'class Answer(BaseAnswer):\n    author: str',
          answer_template: 'class Answer(BaseAnswer):\n    author: str',
          last_modified: '2024-01-10T10:10:00.000Z',
          finished: true,
          question_rubric: undefined,
        },
      },
      global_rubric: undefined,
    });

    it('should create new benchmark with questions and templates', () => {
      const questionStore = useQuestionStore.getState();
      const datasetStore = useDatasetStore.getState();

      // Set dataset metadata
      datasetStore.setMetadata({
        name: 'Test Benchmark',
        description: 'A test benchmark for round-trip',
        creator: 'test-user',
        keywords: ['test', 'round-trip'],
      });

      // Load checkpoint (which also loads question data)
      const sampleCheckpoint = createSampleUnifiedCheckpoint();
      questionStore.loadCheckpoint(sampleCheckpoint);

      // Verify data loaded correctly
      const state = useQuestionStore.getState();
      expect(Object.keys(state.questionData)).toHaveLength(3);
      expect(state.questionData['q1']).toBeDefined();
      expect(state.questionData['q1'].question).toBe('What is the capital of France?');
      expect(state.checkpoint['q1']).toBeDefined();
      expect(state.checkpoint['q1']?.finished).toBe(true);

      // Verify dataset metadata
      const metadata = useDatasetStore.getState().metadata;
      expect(metadata?.name).toBe('Test Benchmark');
      expect(metadata?.creator).toBe('test-user');
    });

    it('should simulate save to database and preserve data', () => {
      const questionStore = useQuestionStore.getState();
      const datasetStore = useDatasetStore.getState();

      // Setup initial data
      const sampleCheckpoint = createSampleUnifiedCheckpoint();

      datasetStore.setMetadata({
        name: 'Round-Trip Test',
        description: 'Testing database save/load',
        creator: 'tester',
        keywords: ['database', 'test'],
      });

      questionStore.loadCheckpoint(sampleCheckpoint);

      // Capture state before "save"
      const questionDataBefore = { ...useQuestionStore.getState().questionData };
      const checkpointBefore = { ...useQuestionStore.getState().checkpoint };
      const metadataBefore = { ...useDatasetStore.getState().metadata };

      // Simulate save operation (in real scenario, this would call API)
      // For this test, we verify state is consistent and can be serialized
      expect(() => {
        JSON.stringify(questionDataBefore);
        JSON.stringify(checkpointBefore);
        JSON.stringify(metadataBefore);
      }).not.toThrow();

      // Connect to database (simulating successful save)
      datasetStore.connectDatabase('https://example.com/db', 'round-trip-test');
      datasetStore.setLastSaved('2024-01-10T12:00:00.000Z');

      // Verify database connection state
      const dbState = useDatasetStore.getState();
      expect(dbState.isConnectedToDatabase).toBe(true);
      expect(dbState.storageUrl).toBe('https://example.com/db');
      expect(dbState.currentBenchmarkName).toBe('round-trip-test');
      expect(dbState.lastSaved).toBe('2024-01-10T12:00:00.000Z');
    });

    it('should simulate clear local state after save', () => {
      const questionStore = useQuestionStore.getState();
      const datasetStore = useDatasetStore.getState();

      // Load data
      const sampleCheckpoint = createSampleUnifiedCheckpoint();

      datasetStore.setMetadata({
        name: 'To Be Cleared',
        description: 'This will be cleared',
        creator: 'test',
      });

      questionStore.loadCheckpoint(sampleCheckpoint);

      // Verify data exists
      expect(Object.keys(useQuestionStore.getState().questionData)).toHaveLength(3);

      // Connect to database
      datasetStore.connectDatabase('https://example.com/db', 'test-benchmark');

      // Clear local state (simulating what happens after save)
      questionStore.resetQuestionState();
      datasetStore.resetMetadata();

      // Verify state cleared
      expect(Object.keys(useQuestionStore.getState().questionData)).toHaveLength(0);
      expect(Object.keys(useQuestionStore.getState().checkpoint)).toHaveLength(0);
      expect(useDatasetStore.getState().metadata.name).toBe('');
    });

    it('should simulate load from database and restore data correctly', () => {
      const questionStore = useQuestionStore.getState();
      const datasetStore = useDatasetStore.getState();

      // Simulate loading from database
      const restoredCheckpoint = createSampleUnifiedCheckpoint();
      const restoredMetadata = {
        name: 'Restored Benchmark',
        description: 'Restored from database',
        creator: 'original-author',
        keywords: ['restored', 'database'],
      };

      // Load the "restored" data
      datasetStore.setMetadata(restoredMetadata);
      questionStore.loadCheckpoint(restoredCheckpoint);

      // Connect to database (as if loaded from there)
      datasetStore.connectDatabase('https://example.com/db', 'restored-benchmark');

      // Verify all data restored correctly
      const qState = useQuestionStore.getState();
      expect(Object.keys(qState.questionData)).toHaveLength(3);
      expect(qState.questionData['q1'].question).toBe('What is the capital of France?');
      expect(qState.checkpoint['q1']?.finished).toBe(true);
      expect(qState.checkpoint['q2']?.finished).toBe(false);
      expect(qState.checkpoint['q3']?.finished).toBe(true);

      const dState = useDatasetStore.getState();
      expect(dState.metadata.name).toBe('Restored Benchmark');
      expect(dState.metadata.creator).toBe('original-author');
      expect(dState.metadata.keywords).toEqual(['restored', 'database']);
    });

    it('should verify data integrity across save/load cycle', () => {
      const questionStore = useQuestionStore.getState();
      const datasetStore = useDatasetStore.getState();

      // Create original data
      const originalCheckpoint = createSampleUnifiedCheckpoint();
      const originalMetadata = {
        name: 'Integrity Test',
        description: 'Testing data integrity',
        creator: 'integrity-tester',
        keywords: ['integrity', 'consistency'],
      };

      // Load original data
      datasetStore.setMetadata(originalMetadata);
      questionStore.loadCheckpoint(originalCheckpoint);

      // Capture original state
      const originalQuestionData = useQuestionStore.getState().questionData;
      const originalCheckpointData = useQuestionStore.getState().checkpoint;
      const originalMetadataData = useDatasetStore.getState().metadata;

      // Simulate save-load cycle by clearing and reloading
      questionStore.resetQuestionState();
      datasetStore.resetMetadata();

      // Load same data (simulating database round-trip)
      datasetStore.setMetadata(originalMetadata);
      questionStore.loadCheckpoint(originalCheckpoint);

      // Verify integrity - data should match exactly
      const restoredQuestionData = useQuestionStore.getState().questionData;
      const restoredCheckpointData = useQuestionStore.getState().checkpoint;
      const restoredMetadataData = useDatasetStore.getState().metadata;

      // Check question data integrity
      expect(Object.keys(restoredQuestionData)).toHaveLength(Object.keys(originalQuestionData).length);
      expect(restoredQuestionData['q1'].question).toBe(originalQuestionData['q1'].question);
      expect(restoredQuestionData['q1'].raw_answer).toBe(originalQuestionData['q1'].raw_answer);
      expect(restoredQuestionData['q3'].raw_answer).toBe(originalQuestionData['q3'].raw_answer);

      // Check checkpoint integrity
      expect(restoredCheckpointData['q1']?.finished).toBe(originalCheckpointData['q1']?.finished);
      expect(restoredCheckpointData['q2']?.finished).toBe(originalCheckpointData['q2']?.finished);
      expect(restoredCheckpointData['q1']?.last_modified).toBe(originalCheckpointData['q1']?.last_modified);

      // Check metadata integrity
      expect(restoredMetadataData.name).toBe(originalMetadataData.name);
      expect(restoredMetadataData.creator).toBe(originalMetadataData.creator);
      expect(restoredMetadataData.keywords).toEqual(originalMetadataData.keywords);
    });

    it('should handle partial data restoration gracefully', () => {
      const questionStore = useQuestionStore.getState();
      const datasetStore = useDatasetStore.getState();

      // Load partial data (only some questions)
      const partialCheckpoint = {
        version: '1.0' as const,
        checkpoint: {
          q1: {
            question: 'What is the capital of France?',
            raw_answer: 'Paris',
            original_answer_template: 'class Answer(BaseAnswer):\n    capital: str',
            answer_template: 'class Answer(BaseAnswer):\n    capital: str',
            last_modified: '2024-01-10T10:00:00.000Z',
            finished: true,
            question_rubric: undefined,
          },
          q2: {
            question: 'What is 2 + 2?',
            raw_answer: '4',
            original_answer_template: 'class Answer(BaseAnswer):\n    result: int',
            answer_template: 'class Answer(BaseAnswer):\n    result: int',
            last_modified: '2024-01-10T10:05:00.000Z',
            finished: false,
            question_rubric: undefined,
          },
        },
        global_rubric: undefined,
      };

      // Load partial data
      datasetStore.setMetadata({
        name: 'Partial Benchmark',
        description: 'Only has 2 questions',
        creator: 'partial-user',
      });

      questionStore.loadCheckpoint(partialCheckpoint);

      // Verify partial load handled correctly
      const qState = useQuestionStore.getState();
      expect(Object.keys(qState.questionData)).toHaveLength(2);
      expect(qState.questionData['q1']).toBeDefined();
      expect(qState.questionData['q2']).toBeDefined();
      expect(qState.questionData['q3']).toBeUndefined();

      // Checkpoint should have q1 and q2
      expect(qState.checkpoint['q1']?.finished).toBe(true);
      expect(qState.checkpoint['q2']?.finished).toBe(false);
    });
  });
});
