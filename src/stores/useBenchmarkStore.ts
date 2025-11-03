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
  evaluationMode: 'template_only' | 'template_and_rubric' | 'rubric_only';
  correctnessEnabled: boolean;
  abstentionEnabled: boolean;
  deepJudgmentEnabled: boolean;
  deepJudgmentSearchEnabled: boolean;
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
  setEvaluationMode: (mode: 'template_only' | 'template_and_rubric' | 'rubric_only') => void;
  setCorrectnessEnabled: (enabled: boolean) => void;
  setAbstentionEnabled: (enabled: boolean) => void;
  setDeepJudgmentEnabled: (enabled: boolean) => void;
  setDeepJudgmentSearchEnabled: (enabled: boolean) => void;
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
      model_provider: 'google_genai',
      model_name: 'gemini-2.5-flash',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.',
    },
  ],
  parsingModels: [
    {
      id: 'parsing-1',
      model_provider: 'google_genai',
      model_name: 'gemini-2.5-flash',
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
  evaluationMode: 'template_only',
  correctnessEnabled: true,
  abstentionEnabled: false,
  deepJudgmentEnabled: false,
  deepJudgmentSearchEnabled: false,
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
  setRubricEnabled: (enabled) => set({ rubricEnabled: enabled }),
  setEvaluationMode: (mode) => set({ evaluationMode: mode }),
  setCorrectnessEnabled: (enabled) => set({ correctnessEnabled: enabled }),
  setAbstentionEnabled: (enabled) => set({ abstentionEnabled: enabled }),
  setDeepJudgmentEnabled: (enabled) => set({ deepJudgmentEnabled: enabled }),
  setDeepJudgmentSearchEnabled: (enabled) => set({ deepJudgmentSearchEnabled: enabled }),
  setFewShotEnabled: (enabled) => set({ fewShotEnabled: enabled }),
  setFewShotMode: (mode) => set({ fewShotMode: mode }),
  setFewShotK: (k) => set({ fewShotK: k }),

  // Preset Integration Methods
  getCurrentVerificationConfig: () => {
    const state = useBenchmarkStore.getState();

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

    // Build verification config
    const config: VerificationConfig = {
      answering_models: JSON.parse(JSON.stringify(state.answeringModels)), // Deep clone
      parsing_models: JSON.parse(JSON.stringify(state.parsingModels)), // Deep clone
      replicate_count: state.replicateCount,
      parsing_only: false,
      rubric_enabled: state.rubricEnabled,
      rubric_trait_names: null,
      evaluation_mode: state.evaluationMode,
      abstention_enabled: state.abstentionEnabled,
      deep_judgment_enabled: state.deepJudgmentEnabled,
      deep_judgment_search_enabled: state.deepJudgmentSearchEnabled,
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
    const fewShotMode = config.few_shot_config?.global_mode ?? 'all';
    const fewShotK = config.few_shot_config?.global_k ?? 3;

    // Apply configuration to store
    set({
      answeringModels,
      parsingModels,
      replicateCount: config.replicate_count,
      rubricEnabled: config.rubric_enabled ?? false,
      evaluationMode: config.evaluation_mode ?? 'template_only',
      abstentionEnabled: config.abstention_enabled ?? false,
      deepJudgmentEnabled: config.deep_judgment_enabled ?? false,
      deepJudgmentSearchEnabled: config.deep_judgment_search_enabled ?? false,
      fewShotEnabled,
      fewShotMode,
      fewShotK,
      // Clear UI-only state
      expandedPrompts: new Set<string>(),
      // Don't change runName - it's job-specific, not part of preset
    });
  },
}));
