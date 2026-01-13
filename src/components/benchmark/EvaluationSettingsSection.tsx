import React from 'react';
import { Card } from '../ui/Card';

export interface EvaluationSettingsSectionProps {
  isRunning: boolean;
  correctnessEnabled: boolean;
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
  onCorrectnessEnabledChange: (enabled: boolean) => void;
  onRubricEnabledChange: (enabled: boolean) => void;
  onRubricEvaluationStrategyChange: (strategy: 'batch' | 'sequential') => void;
  onEvaluationModeChange: (mode: 'template_only' | 'template_and_rubric' | 'rubric_only') => void;
  onAbstentionEnabledChange: (enabled: boolean) => void;
  onSufficiencyEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentTemplateEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentSearchEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentRubricEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentRubricModeChange: (mode: 'enable_all' | 'use_checkpoint') => void;
  onDeepJudgmentRubricExtractExcerptsChange: (enabled: boolean) => void;
  onFewShotEnabledChange: (enabled: boolean) => void;
  onFewShotModeChange: (mode: 'all' | 'k-shot' | 'custom') => void;
  onFewShotKChange: (k: number) => void;
}

export const EvaluationSettingsSection: React.FC<EvaluationSettingsSectionProps> = ({
  isRunning,
  correctnessEnabled,
  rubricEnabled,
  rubricEvaluationStrategy,
  evaluationMode,
  abstentionEnabled,
  sufficiencyEnabled,
  deepJudgmentTemplateEnabled,
  deepJudgmentSearchEnabled,
  deepJudgmentRubricEnabled,
  deepJudgmentRubricMode,
  deepJudgmentRubricExtractExcerpts,
  fewShotEnabled,
  fewShotMode,
  fewShotK,
  onCorrectnessEnabledChange,
  onRubricEnabledChange,
  onRubricEvaluationStrategyChange,
  onEvaluationModeChange,
  onAbstentionEnabledChange,
  onSufficiencyEnabledChange,
  onDeepJudgmentTemplateEnabledChange,
  onDeepJudgmentSearchEnabledChange,
  onDeepJudgmentRubricEnabledChange,
  onDeepJudgmentRubricModeChange,
  onDeepJudgmentRubricExtractExcerptsChange,
  onFewShotEnabledChange,
  onFewShotModeChange,
  onFewShotKChange,
}) => {
  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Evaluation Settings</h3>

        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={correctnessEnabled}
              onChange={(e) => onCorrectnessEnabledChange(e.target.checked)}
              disabled={isRunning}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Correctness</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(Basic answer validation and parsing)</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={rubricEnabled}
              onChange={(e) => onRubricEnabledChange(e.target.checked)}
              disabled={isRunning}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Rubric</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (Qualitative evaluation using defined traits)
            </span>
          </label>

          {/* Evaluation Mode Selector */}
          {rubricEnabled && (
            <div className="ml-7 mt-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Evaluation Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="evaluation-mode"
                    value="template_and_rubric"
                    checked={evaluationMode === 'template_and_rubric'}
                    onChange={(e) =>
                      onEvaluationModeChange(e.target.value as 'template_only' | 'template_and_rubric' | 'rubric_only')
                    }
                    disabled={isRunning}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Template + Rubric</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="evaluation-mode"
                    value="rubric_only"
                    checked={evaluationMode === 'rubric_only'}
                    onChange={(e) =>
                      onEvaluationModeChange(e.target.value as 'template_only' | 'template_and_rubric' | 'rubric_only')
                    }
                    disabled={isRunning}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Rubric Only</span>
                </label>
              </div>
            </div>
          )}

          {/* Rubric Evaluation Strategy Selector */}
          {rubricEnabled && (
            <div className="ml-7 mt-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Rubric Evaluation Strategy
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="rubric-strategy"
                    value="batch"
                    checked={rubricEvaluationStrategy === 'batch'}
                    onChange={(e) => onRubricEvaluationStrategyChange(e.target.value as 'batch' | 'sequential')}
                    disabled={isRunning}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">All Together (Batch)</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="rubric-strategy"
                    value="sequential"
                    checked={rubricEvaluationStrategy === 'sequential'}
                    onChange={(e) => onRubricEvaluationStrategyChange(e.target.value as 'batch' | 'sequential')}
                    disabled={isRunning}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">One by One (Sequential)</span>
                </label>
              </div>
            </div>
          )}

          <label
            className="flex items-center space-x-3"
            title="Detect when models refuse to answer or abstain. When detected, marks the result as abstained regardless of other verification outcomes."
          >
            <input
              type="checkbox"
              checked={abstentionEnabled}
              onChange={(e) => onAbstentionEnabledChange(e.target.checked)}
              disabled={isRunning}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Abstention Detection</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(Detect refusals and mark as abstained)</span>
          </label>

          <label
            className="flex items-center space-x-3"
            title="Check if the model's response contains enough information to populate the answer template. When insufficient, marks the result as failed."
          >
            <input
              type="checkbox"
              checked={sufficiencyEnabled}
              onChange={(e) => onSufficiencyEnabledChange(e.target.checked)}
              disabled={isRunning}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Sufficiency Detection</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (Check if response has enough info for template)
            </span>
          </label>

          {/* Deep-Judgment Configuration */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Deep-Judgment</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (Multi-stage LLM evaluation with evidence extraction)
              </span>
            </div>

            {/* Templates Deep-Judgment */}
            <div className="ml-4 space-y-2">
              <label
                className="flex items-center space-x-3"
                title="Extract excerpts and reasoning for template validation. Always extracts excerpts when enabled."
              >
                <input
                  type="checkbox"
                  checked={deepJudgmentTemplateEnabled}
                  onChange={(e) => onDeepJudgmentTemplateEnabledChange(e.target.checked)}
                  disabled={isRunning}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Templates</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">(Always extracts excerpts)</span>
              </label>

              {deepJudgmentTemplateEnabled && (
                <div className="ml-7 mt-2">
                  <label
                    className="flex items-center space-x-3"
                    title="Validate excerpts against external search results to detect potential hallucinations."
                  >
                    <input
                      type="checkbox"
                      checked={deepJudgmentSearchEnabled}
                      onChange={(e) => onDeepJudgmentSearchEnabledChange(e.target.checked)}
                      disabled={isRunning}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Search Enhancement</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">(Validate with external search)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Rubrics Deep-Judgment */}
            <div className="ml-4 space-y-2">
              <label
                className="flex items-center space-x-3"
                title="Extract excerpts and reasoning for LLM trait evaluation in rubrics."
              >
                <input
                  type="checkbox"
                  checked={deepJudgmentRubricEnabled}
                  onChange={(e) => onDeepJudgmentRubricEnabledChange(e.target.checked)}
                  disabled={isRunning}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Rubrics</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">(LLM trait evaluation)</span>
              </label>

              {deepJudgmentRubricEnabled && (
                <div className="ml-7 mt-2 space-y-3">
                  {/* Mode Selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mode</label>
                    <div className="space-y-1">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="deep-judgment-rubric-mode"
                          value="enable_all"
                          checked={deepJudgmentRubricMode === 'enable_all'}
                          onChange={(e) =>
                            onDeepJudgmentRubricModeChange(e.target.value as 'enable_all' | 'use_checkpoint')
                          }
                          disabled={isRunning}
                          className="h-3 w-3 text-violet-600 focus:ring-violet-500 border-slate-300"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">Enable All</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">(Apply to all LLM traits)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="deep-judgment-rubric-mode"
                          value="use_checkpoint"
                          checked={deepJudgmentRubricMode === 'use_checkpoint'}
                          onChange={(e) =>
                            onDeepJudgmentRubricModeChange(e.target.value as 'enable_all' | 'use_checkpoint')
                          }
                          disabled={isRunning}
                          className="h-3 w-3 text-violet-600 focus:ring-violet-500 border-slate-300"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">Use Checkpoint</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">(Per-trait configuration)</span>
                      </label>
                    </div>
                  </div>

                  {/* Extract Excerpts - Only show for enable_all mode */}
                  {deepJudgmentRubricMode === 'enable_all' && (
                    <div className="ml-0">
                      <label className="flex items-center space-x-2" title="Extract excerpts for rubric traits.">
                        <input
                          type="checkbox"
                          checked={deepJudgmentRubricExtractExcerpts}
                          onChange={(e) => onDeepJudgmentRubricExtractExcerptsChange(e.target.checked)}
                          disabled={isRunning}
                          className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">Extract Excerpts</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={fewShotEnabled}
              onChange={(e) => onFewShotEnabledChange(e.target.checked)}
              disabled={isRunning}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300"> Few-shot Prompting</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (Use examples to improve LLM performance)
            </span>
          </label>
        </div>

        {/* Few-shot Configuration */}
        {fewShotEnabled && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Few-shot Mode</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="few-shot-mode"
                    value="all"
                    checked={fewShotMode === 'all'}
                    onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'custom')}
                    disabled={isRunning}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Use all available examples</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="few-shot-mode"
                    value="k-shot"
                    checked={fewShotMode === 'k-shot'}
                    onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'custom')}
                    disabled={isRunning}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Use k examples per question</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="few-shot-mode"
                    value="custom"
                    checked={fewShotMode === 'custom'}
                    onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'custom')}
                    disabled={isRunning}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Custom examples selection</span>
                </label>
              </div>
            </div>

            {fewShotMode === 'k-shot' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Number of Examples (k)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={fewShotK}
                  onChange={(e) => onFewShotKChange(parseInt(e.target.value))}
                  disabled={isRunning}
                  className="w-24 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Maximum number of examples to use per question (1-10)
                </p>
              </div>
            )}

            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-md">
              <p className="text-sm text-violet-800 dark:text-violet-200">
                <strong>Note:</strong> Few-shot examples are defined per question in the Template Curator. Questions
                without examples will use zero-shot prompting even when this feature is enabled.
              </p>
            </div>
          </div>
        )}

        {!correctnessEnabled && !rubricEnabled && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-800 dark:text-amber-200">
            ⚠ At least one evaluation method should be enabled
          </div>
        )}
      </div>
    </Card>
  );
};
