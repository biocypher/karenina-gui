import { create } from 'zustand';
import { ModelConfiguration } from '../types';
import { VerificationConfig, FewShotConfig } from '../utils/presetApi';

/**
 * Benchmark configuration and evaluation settings store
 *
 * This store manages all configuration for the Benchmark tab that persists
 * across tab switches but resets on page refresh (no persistence middleware).
 */
interface BenchmarkState {
  // Model Configurations
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];

  // Run Configuration
  replicateCount: number;
  runName: string;

  // UI State
  expandedPrompts: Set<string>;

  // Evaluation Settings
  rubricEnabled: boolean;
  rubricEvaluationStrategy: 'batch' | 'sequential';
  evaluationMode: 'template_only' | 'template_and_rubric' | 'rubric_only';
  correctnessEnabled: boolean;
  abstentionEnabled: boolean;
  deepJudgmentTemplateEnabled: boolean;
  deepJudgmentSearchEnabled: boolean;
  deepJudgmentRubricEnabled: boolean;
  deepJudgmentRubricMode: 'enable_all' | 'use_checkpoint';
  deepJudgmentRubricExtractExcerpts: boolean;
  fewShotEnabled: boolean;
  fewShotMode: 'all' | 'k-shot' | 'custom';
  fewShotK: number;

  // Model Configuration Actions
  setAnsweringModels: (models: ModelConfiguration[]) => void;
  setParsingModels: (models: ModelConfiguration[]) => void;
  addAnsweringModel: (model: ModelConfiguration) => void;
  addParsingModel: (model: ModelConfiguration) => void;
  removeAnsweringModel: (id: string) => void;
  removeParsingModel: (id: string) => void;
  updateAnsweringModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  updateParsingModel: (id: string, updates: Partial<ModelConfiguration>) => void;

  // Run Configuration Actions
  setReplicateCount: (count: number) => void;
  setRunName: (name: string) => void;

  // UI State Actions
  togglePromptExpanded: (modelId: string) => void;

  // Evaluation Settings Actions
  setRubricEnabled: (enabled: boolean) => void;
  setRubricEvaluationStrategy: (strategy: 'batch' | 'sequential') => void;
  setEvaluationMode: (mode: 'template_only' | 'template_and_rubric' | 'rubric_only') => void;
  setCorrectnessEnabled: (enabled: boolean) => void;
  setAbstentionEnabled: (enabled: boolean) => void;
  setDeepJudgmentTemplateEnabled: (enabled: boolean) => void;
  setDeepJudgmentSearchEnabled: (enabled: boolean) => void;
  setDeepJudgmentRubricEnabled: (enabled: boolean) => void;
  setDeepJudgmentRubricMode: (mode: 'enable_all' | 'use_checkpoint') => void;
  setDeepJudgmentRubricExtractExcerpts: (enabled: boolean) => void;
  setFewShotEnabled: (enabled: boolean) => void;
  setFewShotMode: (mode: 'all' | 'k-shot' | 'custom') => void;
  setFewShotK: (k: number) => void;

  // Preset Integration Methods
  getCurrentVerificationConfig: () => VerificationConfig;
  applyVerificationConfig: (config: VerificationConfig) => void;
}

export const useBenchmarkStore = create<BenchmarkState>((set) => ({
  // Initial state - Model Configurations
  answeringModels: [
    {
      id: 'answering-1',
      model_provider: 'anthropic',
      model_name: 'claude-haiku-4-5',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.',
    },
  ],
  parsingModels: [
    {
      id: 'parsing-1',
      model_provider: 'anthropic',
      model_name: 'claude-haiku-4-5',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt:
        'You are a validation assistant. Parse and validate responses against the given Pydantic template.',
    },
  ],

  // Initial state - Run Configuration
  replicateCount: 1,
  runName: '',

  // Initial state - UI State
  expandedPrompts: new Set<string>(),

  // Initial state - Evaluation Settings
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

  // Model Configuration Actions
  setAnsweringModels: (models) => set({ answeringModels: models }),
  setParsingModels: (models) => set({ parsingModels: models }),

  addAnsweringModel: (model) => set((state) => ({ answeringModels: [...state.answeringModels, model] })),

  addParsingModel: (model) => set((state) => ({ parsingModels: [...state.parsingModels, model] })),

  removeAnsweringModel: (id) =>
    set((state) => ({
      answeringModels:
        state.answeringModels.length > 1
          ? state.answeringModels.filter((model) => model.id !== id)
          : state.answeringModels,
    })),

  removeParsingModel: (id) =>
    set((state) => ({
      parsingModels:
        state.parsingModels.length > 1 ? state.parsingModels.filter((model) => model.id !== id) : state.parsingModels,
    })),

  updateAnsweringModel: (id, updates) =>
    set((state) => ({
      answeringModels: state.answeringModels.map((model) => (model.id === id ? { ...model, ...updates } : model)),
    })),

  updateParsingModel: (id, updates) =>
    set((state) => ({
      parsingModels: state.parsingModels.map((model) => (model.id === id ? { ...model, ...updates } : model)),
    })),

  // Run Configuration Actions
  setReplicateCount: (count) => set({ replicateCount: count }),
  setRunName: (name) => set({ runName: name }),

  // UI State Actions
  togglePromptExpanded: (modelId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedPrompts);
      if (newExpanded.has(modelId)) {
        newExpanded.delete(modelId);
      } else {
        newExpanded.add(modelId);
      }
      return { expandedPrompts: newExpanded };
    }),

  // Evaluation Settings Actions
  setRubricEnabled: (enabled) =>
    set((state) => {
      // When disabling rubric, force evaluation_mode to template_only
      if (!enabled) {
        return {
          rubricEnabled: false,
          evaluationMode: 'template_only',
        };
      }
      // When enabling rubric, switch from template_only to template_and_rubric
      return {
        rubricEnabled: true,
        evaluationMode: state.evaluationMode === 'template_only' ? 'template_and_rubric' : state.evaluationMode,
      };
    }),
  setRubricEvaluationStrategy: (strategy) => set({ rubricEvaluationStrategy: strategy }),
  setEvaluationMode: (mode) => set({ evaluationMode: mode }),
  setCorrectnessEnabled: (enabled) => set({ correctnessEnabled: enabled }),
  setAbstentionEnabled: (enabled) => set({ abstentionEnabled: enabled }),
  setDeepJudgmentTemplateEnabled: (enabled) => set({ deepJudgmentTemplateEnabled: enabled }),
  setDeepJudgmentSearchEnabled: (enabled) => set({ deepJudgmentSearchEnabled: enabled }),
  setDeepJudgmentRubricEnabled: (enabled) => set({ deepJudgmentRubricEnabled: enabled }),
  setDeepJudgmentRubricMode: (mode) => set({ deepJudgmentRubricMode: mode }),
  setDeepJudgmentRubricExtractExcerpts: (enabled) => set({ deepJudgmentRubricExtractExcerpts: enabled }),
  setFewShotEnabled: (enabled) => set({ fewShotEnabled: enabled }),
  setFewShotMode: (mode) => set({ fewShotMode: mode }),
  setFewShotK: (k) => set({ fewShotK: k }),

  // Preset Integration Methods
  getCurrentVerificationConfig: () => {
    const state = useBenchmarkStore.getState();

    // Helper function to sanitize model configuration
    const sanitizeModelConfig = (model: ModelConfiguration): Record<string, unknown> => {
      const sanitized: Record<string, unknown> = {
        id: model.id,
        model_provider: model.model_provider,
        model_name: model.model_name,
        temperature: model.temperature,
        interface: model.interface,
        system_prompt: model.system_prompt,
      };

      // Only include max_retries if it's set
      if (model.max_retries !== undefined) {
        sanitized.max_retries = model.max_retries;
      }

      // Only include endpoint fields for openai_endpoint interface
      if (model.interface === 'openai_endpoint') {
        if (model.endpoint_base_url) {
          sanitized.endpoint_base_url = model.endpoint_base_url;
        }
        if (model.endpoint_api_key) {
          sanitized.endpoint_api_key = model.endpoint_api_key;
        }
      }

      // Only include MCP fields if they have values
      if (model.mcp_urls_dict && Object.keys(model.mcp_urls_dict).length > 0) {
        sanitized.mcp_urls_dict = model.mcp_urls_dict;
      }
      if (model.mcp_tool_filter && model.mcp_tool_filter.length > 0) {
        sanitized.mcp_tool_filter = model.mcp_tool_filter;
      }

      // Only include extra_kwargs if it has values
      if (model.extra_kwargs && Object.keys(model.extra_kwargs).length > 0) {
        sanitized.extra_kwargs = model.extra_kwargs;
      }

      // Include agent_middleware if present (for MCP-enabled agents)
      if (model.agent_middleware) {
        sanitized.agent_middleware = model.agent_middleware;
      }

      // Include max_context_tokens if specified
      if (model.max_context_tokens !== undefined && model.max_context_tokens !== null) {
        sanitized.max_context_tokens = model.max_context_tokens;
      }

      return sanitized;
    };

    // Build few-shot config
    const fewShotConfig: FewShotConfig | null = state.fewShotEnabled
      ? {
          enabled: true,
          global_mode: state.fewShotMode,
          global_k: state.fewShotK,
          question_configs: {},
          global_external_examples: [],
        }
      : null;

    // Build verification config with sanitized models
    const config: VerificationConfig = {
      answering_models: state.answeringModels.map(sanitizeModelConfig),
      parsing_models: state.parsingModels.map(sanitizeModelConfig),
      replicate_count: state.replicateCount,
      parsing_only: false,
      rubric_enabled: state.rubricEnabled,
      rubric_trait_names: null,
      rubric_evaluation_strategy: state.rubricEvaluationStrategy,
      evaluation_mode: state.evaluationMode,
      abstention_enabled: state.abstentionEnabled,
      deep_judgment_enabled: state.deepJudgmentTemplateEnabled,
      deep_judgment_search_enabled: state.deepJudgmentSearchEnabled,
      deep_judgment_rubric_mode: state.deepJudgmentRubricEnabled ? state.deepJudgmentRubricMode : 'disabled',
      deep_judgment_rubric_global_excerpts: state.deepJudgmentRubricExtractExcerpts,
      few_shot_config: fewShotConfig,
      db_config: null, // Presets don't include DB config
    };

    return config;
  },

  applyVerificationConfig: (config: VerificationConfig) => {
    // Deep clone model arrays to prevent reference sharing
    const answeringModels = JSON.parse(JSON.stringify(config.answering_models));
    const parsingModels = JSON.parse(JSON.stringify(config.parsing_models));

    // Extract few-shot settings
    const fewShotEnabled = config.few_shot_config?.enabled ?? false;
    // Convert 'none' to 'all' since our UI doesn't support 'none' mode
    const rawMode = config.few_shot_config?.global_mode ?? 'all';
    const fewShotMode: 'all' | 'k-shot' | 'custom' = rawMode === 'none' ? 'all' : rawMode;
    const fewShotK = config.few_shot_config?.global_k ?? 3;

    // Ensure evaluation_mode is consistent with rubric_enabled
    const rubricEnabled = config.rubric_enabled ?? false;
    let evaluationMode = config.evaluation_mode ?? 'template_only';

    // If rubric is disabled, force evaluation_mode to template_only
    if (!rubricEnabled && evaluationMode !== 'template_only') {
      evaluationMode = 'template_only';
    }
    // If rubric is enabled and mode is template_only, default to template_and_rubric
    if (rubricEnabled && evaluationMode === 'template_only') {
      evaluationMode = 'template_and_rubric';
    }

    // Parse deep judgment rubric configuration
    const deepJudgmentRubricMode = (config.deep_judgment_rubric_mode ?? 'disabled') as
      | 'disabled'
      | 'enable_all'
      | 'use_checkpoint';
    const deepJudgmentRubricEnabled = deepJudgmentRubricMode !== 'disabled';

    // Apply configuration to store
    set({
      answeringModels,
      parsingModels,
      replicateCount: config.replicate_count,
      rubricEnabled,
      rubricEvaluationStrategy: config.rubric_evaluation_strategy ?? 'batch',
      evaluationMode,
      abstentionEnabled: config.abstention_enabled ?? false,
      deepJudgmentTemplateEnabled: config.deep_judgment_enabled ?? false,
      deepJudgmentSearchEnabled: config.deep_judgment_search_enabled ?? false,
      deepJudgmentRubricEnabled,
      deepJudgmentRubricMode: deepJudgmentRubricEnabled ? deepJudgmentRubricMode : 'enable_all',
      deepJudgmentRubricExtractExcerpts: config.deep_judgment_rubric_global_excerpts ?? true,
      fewShotEnabled,
      fewShotMode,
      fewShotK,
      // Clear UI-only state
      expandedPrompts: new Set<string>(),
      // Don't change runName - it's job-specific, not part of preset
    });
  },
}));
