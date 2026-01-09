import { create } from 'zustand';
import type { ModelConfiguration } from '../types';
import type { VerificationConfig } from '../utils/presetApi';
import { stateToVerificationConfig, verificationConfigToState } from '../utils/presetConverter';

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
    return stateToVerificationConfig(useBenchmarkStore.getState());
  },

  applyVerificationConfig: (config: VerificationConfig) => {
    const state = verificationConfigToState(config);
    set(state);
    // Don't change runName - it's job-specific, not part of preset
  },
}));
