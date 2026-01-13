/**
 * Preset Converter Utilities
 * Conversion functions between benchmark store state and preset configuration
 */

import type { ModelConfiguration } from '../types';
import type { VerificationConfig, FewShotConfig } from './presetApi';
import { sanitizeModelConfig, expandModelConfig } from './modelConfig';

/**
 * Benchmark store state slice used for preset conversion
 */
export interface BenchmarkPresetState {
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];
  replicateCount: number;
  rubricEnabled: boolean;
  rubricEvaluationStrategy: 'batch' | 'sequential';
  evaluationMode: 'template_only' | 'template_and_rubric' | 'rubric_only';
  abstentionEnabled: boolean;
  sufficiencyEnabled: boolean;
  deepJudgmentTemplateEnabled: boolean;
  deepJudgmentSearchEnabled: boolean;
  deepJudgmentRubricEnabled: boolean;
  deepJudgmentRubricMode: 'enable_all' | 'use_checkpoint';
  deepJudgmentRubricExtractExcerpts: boolean;
  fewShotEnabled: boolean;
  fewShotMode: 'all' | 'k-shot' | 'custom';
  fewShotK: number;
}

/**
 * Result of applying a preset - contains all store updates
 */
export interface PresetApplyResult {
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];
  replicateCount: number;
  rubricEnabled: boolean;
  rubricEvaluationStrategy: 'batch' | 'sequential';
  evaluationMode: 'template_only' | 'template_and_rubric' | 'rubric_only';
  abstentionEnabled: boolean;
  sufficiencyEnabled: boolean;
  deepJudgmentTemplateEnabled: boolean;
  deepJudgmentSearchEnabled: boolean;
  deepJudgmentRubricEnabled: boolean;
  deepJudgmentRubricMode: 'enable_all' | 'use_checkpoint';
  deepJudgmentRubricExtractExcerpts: boolean;
  fewShotEnabled: boolean;
  fewShotMode: 'all' | 'k-shot' | 'custom';
  fewShotK: number;
  expandedPrompts: Set<string>;
}

/**
 * Converts benchmark store state to VerificationConfig for preset export
 */
export function stateToVerificationConfig(state: BenchmarkPresetState): VerificationConfig {
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
    sufficiency_enabled: state.sufficiencyEnabled,
    deep_judgment_enabled: state.deepJudgmentTemplateEnabled,
    deep_judgment_search_enabled: state.deepJudgmentSearchEnabled,
    deep_judgment_rubric_mode: state.deepJudgmentRubricEnabled ? state.deepJudgmentRubricMode : 'disabled',
    deep_judgment_rubric_global_excerpts: state.deepJudgmentRubricExtractExcerpts,
    few_shot_config: fewShotConfig,
    db_config: null, // Presets don't include DB config
  };

  return config;
}

/**
 * Normalizes evaluation mode based on rubric enabled state
 * Ensures consistency between rubric_enabled and evaluation_mode
 */
function normalizeEvaluationMode(
  rubricEnabled: boolean,
  evaluationMode: 'template_only' | 'template_and_rubric' | 'rubric_only'
): 'template_only' | 'template_and_rubric' | 'rubric_only' {
  // If rubric is disabled, force evaluation_mode to template_only
  if (!rubricEnabled && evaluationMode !== 'template_only') {
    return 'template_only';
  }
  // If rubric is enabled and mode is template_only, default to template_and_rubric
  if (rubricEnabled && evaluationMode === 'template_only') {
    return 'template_and_rubric';
  }
  return evaluationMode;
}

/**
 * Converts VerificationConfig to store state for preset application
 */
export function verificationConfigToState(config: VerificationConfig): PresetApplyResult {
  // Deep clone model arrays to prevent reference sharing
  const answeringModels = config.answering_models.map((model) => expandModelConfig(model));
  const parsingModels = config.parsing_models.map((model) => expandModelConfig(model));

  // Extract few-shot settings
  const fewShotEnabled = config.few_shot_config?.enabled ?? false;
  // Convert 'none' to 'all' since our UI doesn't support 'none' mode
  const rawMode = config.few_shot_config?.global_mode ?? 'all';
  const fewShotMode: 'all' | 'k-shot' | 'custom' = rawMode === 'none' ? 'all' : rawMode;
  const fewShotK = config.few_shot_config?.global_k ?? 3;

  // Ensure evaluation_mode is consistent with rubric_enabled
  const rubricEnabled = config.rubric_enabled ?? false;
  const evaluationMode = normalizeEvaluationMode(rubricEnabled, config.evaluation_mode ?? 'template_only');

  // Parse deep judgment rubric configuration
  const deepJudgmentRubricMode = (config.deep_judgment_rubric_mode ?? 'disabled') as
    | 'disabled'
    | 'enable_all'
    | 'use_checkpoint';
  const deepJudgmentRubricEnabled = deepJudgmentRubricMode !== 'disabled';

  return {
    answeringModels,
    parsingModels,
    replicateCount: config.replicate_count,
    rubricEnabled,
    rubricEvaluationStrategy: config.rubric_evaluation_strategy ?? 'batch',
    evaluationMode,
    abstentionEnabled: config.abstention_enabled ?? false,
    sufficiencyEnabled: config.sufficiency_enabled ?? false,
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
  };
}
