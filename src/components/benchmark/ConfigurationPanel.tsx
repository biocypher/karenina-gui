import React, { useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { MCPConfigurationModal } from './MCPConfigurationModal';
import ExtraKwargsModal from './ExtraKwargsModal';
import { ModelConfigurationSection, type ModelConfiguration } from './ModelConfigurationSection';
import { EvaluationSettingsSection } from './EvaluationSettingsSection';
import type { AgentMiddlewareConfig } from '../../types';

interface ConfigurationPanelProps {
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];
  replicateCount: number;
  expandedPrompts: Set<string>;
  isRunning: boolean;
  finishedTemplates?: Array<[string, unknown]>;
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
  onAddAnsweringModel: () => void;
  onAddParsingModel: () => void;
  onRemoveAnsweringModel: (id: string) => void;
  onRemoveParsingModel: (id: string) => void;
  onUpdateAnsweringModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onUpdateParsingModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onTogglePromptExpanded: (modelId: string) => void;
  onRubricEnabledChange: (enabled: boolean) => void;
  onRubricEvaluationStrategyChange: (strategy: 'batch' | 'sequential') => void;
  onEvaluationModeChange: (mode: 'template_only' | 'template_and_rubric' | 'rubric_only') => void;
  onCorrectnessEnabledChange: (enabled: boolean) => void;
  onAbstentionEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentTemplateEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentSearchEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentRubricEnabledChange: (enabled: boolean) => void;
  onDeepJudgmentRubricModeChange: (mode: 'enable_all' | 'use_checkpoint') => void;
  onDeepJudgmentRubricExtractExcerptsChange: (enabled: boolean) => void;
  onFewShotEnabledChange: (enabled: boolean) => void;
  onFewShotModeChange: (mode: 'all' | 'k-shot' | 'custom') => void;
  onFewShotKChange: (k: number) => void;
  onManualTraceUploadSuccess?: (traceCount: number) => void;
  onManualTraceUploadError?: (error: string) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  answeringModels,
  parsingModels,
  replicateCount,
  expandedPrompts,
  isRunning,
  finishedTemplates,
  rubricEnabled,
  rubricEvaluationStrategy,
  evaluationMode,
  correctnessEnabled,
  abstentionEnabled,
  deepJudgmentTemplateEnabled,
  deepJudgmentSearchEnabled,
  deepJudgmentRubricEnabled,
  deepJudgmentRubricMode,
  deepJudgmentRubricExtractExcerpts,
  fewShotEnabled,
  fewShotMode,
  fewShotK,
  onAddAnsweringModel,
  onAddParsingModel,
  onRemoveAnsweringModel,
  onRemoveParsingModel,
  onUpdateAnsweringModel,
  onUpdateParsingModel,
  onTogglePromptExpanded,
  onRubricEnabledChange,
  onRubricEvaluationStrategyChange,
  onEvaluationModeChange,
  onCorrectnessEnabledChange,
  onAbstentionEnabledChange,
  onDeepJudgmentTemplateEnabledChange,
  onDeepJudgmentSearchEnabledChange,
  onDeepJudgmentRubricEnabledChange,
  onDeepJudgmentRubricModeChange,
  onDeepJudgmentRubricExtractExcerptsChange,
  onFewShotEnabledChange,
  onFewShotModeChange,
  onFewShotKChange,
  onManualTraceUploadSuccess,
  onManualTraceUploadError,
}) => {
  const [mcpModalState, setMcpModalState] = useState<{ isOpen: boolean; modelId: string | null }>({
    isOpen: false,
    modelId: null,
  });

  const [extraKwargsModalState, setExtraKwargsModalState] = useState<{
    isOpen: boolean;
    modelId: string | null;
    isAnswering: boolean;
  }>({
    isOpen: false,
    modelId: null,
    isAnswering: true,
  });

  const handleMCPSave = (config: {
    mcp_urls_dict: Record<string, string>;
    mcp_tool_filter: string[];
    mcp_validated_servers?: Record<string, string>;
    use_full_trace_for_template?: boolean;
    use_full_trace_for_rubric?: boolean;
  }) => {
    if (mcpModalState.modelId) {
      onUpdateAnsweringModel(mcpModalState.modelId, config);
    }
    setMcpModalState({ isOpen: false, modelId: null });
  };

  const getCurrentMCPConfig = () => {
    if (!mcpModalState.modelId) return undefined;

    const answeringModel = answeringModels.find((m) => m.id === mcpModalState.modelId);
    if (answeringModel) {
      return {
        mcp_urls_dict: answeringModel.mcp_urls_dict,
        mcp_tool_filter: answeringModel.mcp_tool_filter,
        mcp_validated_servers: answeringModel.mcp_validated_servers,
        use_full_trace_for_template: answeringModel.use_full_trace_for_template,
        use_full_trace_for_rubric: answeringModel.use_full_trace_for_rubric,
      };
    }

    return undefined;
  };

  const handleExtraKwargsSave = (update: {
    extra_kwargs: Record<string, unknown>;
    agent_middleware?: AgentMiddlewareConfig;
    max_context_tokens?: number;
  }) => {
    if (extraKwargsModalState.modelId) {
      const modelUpdate: Partial<ModelConfiguration> = {
        extra_kwargs: Object.keys(update.extra_kwargs).length > 0 ? update.extra_kwargs : undefined,
        agent_middleware: update.agent_middleware,
        max_context_tokens: update.max_context_tokens,
      };

      if (extraKwargsModalState.isAnswering) {
        onUpdateAnsweringModel(extraKwargsModalState.modelId, modelUpdate);
      } else {
        onUpdateParsingModel(extraKwargsModalState.modelId, modelUpdate);
      }
    }
    setExtraKwargsModalState({ isOpen: false, modelId: null, isAnswering: true });
  };

  const getCurrentExtraKwargs = () => {
    if (!extraKwargsModalState.modelId) return undefined;

    const model = extraKwargsModalState.isAnswering
      ? answeringModels.find((m) => m.id === extraKwargsModalState.modelId)
      : parsingModels.find((m) => m.id === extraKwargsModalState.modelId);

    return model?.extra_kwargs;
  };

  const getCurrentMiddleware = () => {
    if (!extraKwargsModalState.modelId) return undefined;

    const model = extraKwargsModalState.isAnswering
      ? answeringModels.find((m) => m.id === extraKwargsModalState.modelId)
      : parsingModels.find((m) => m.id === extraKwargsModalState.modelId);

    return model?.agent_middleware;
  };

  const getCurrentMaxContextTokens = () => {
    if (!extraKwargsModalState.modelId) return undefined;

    const model = extraKwargsModalState.isAnswering
      ? answeringModels.find((m) => m.id === extraKwargsModalState.modelId)
      : parsingModels.find((m) => m.id === extraKwargsModalState.modelId);

    return model?.max_context_tokens;
  };

  const hasMcpForCurrentModel = () => {
    if (!extraKwargsModalState.modelId) return false;

    const model = extraKwargsModalState.isAnswering
      ? answeringModels.find((m) => m.id === extraKwargsModalState.modelId)
      : parsingModels.find((m) => m.id === extraKwargsModalState.modelId);

    return !!(model?.mcp_urls_dict && Object.keys(model.mcp_urls_dict).length > 0);
  };

  const handleRemoveMCP = (modelId: string) => {
    onUpdateAnsweringModel(modelId, {
      mcp_urls_dict: undefined,
      mcp_tool_filter: undefined,
      mcp_validated_servers: undefined,
      use_full_trace_for_template: undefined,
      use_full_trace_for_rubric: undefined,
    });
  };

  return (
    <>
      {/* Configuration Section - Multiple Models Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Answering Models Configuration */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Answering Models ({answeringModels.length})
            </h3>
            <button
              onClick={onAddAnsweringModel}
              disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            >
              <Plus className="w-3 h-3" />
              Add Model
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
            Models used to generate answers to questions. Tests will run for all model combinations.
          </p>

          <div className="space-y-4">
            {answeringModels.map((model, index) => (
              <ModelConfigurationSection
                key={model.id}
                model={model}
                index={index}
                isAnswering={true}
                expandedPrompts={expandedPrompts}
                isRunning={isRunning}
                finishedTemplates={finishedTemplates}
                canRemove={answeringModels.length > 1}
                onUpdateModel={onUpdateAnsweringModel}
                onRemoveModel={onRemoveAnsweringModel}
                onTogglePromptExpanded={onTogglePromptExpanded}
                onConfigureMCP={(modelId) => setMcpModalState({ isOpen: true, modelId })}
                onRemoveMCP={handleRemoveMCP}
                onConfigureExtraKwargs={(modelId) =>
                  setExtraKwargsModalState({ isOpen: true, modelId, isAnswering: true })
                }
                onManualTraceUploadSuccess={onManualTraceUploadSuccess}
                onManualTraceUploadError={onManualTraceUploadError}
              />
            ))}
          </div>
        </Card>

        {/* Parsing Models Configuration */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Parsing Models ({parsingModels.length})
            </h3>
            <button
              onClick={onAddParsingModel}
              disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            >
              <Plus className="w-3 h-3" />
              Add Model
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
            Models used to parse and validate responses against Pydantic templates.
          </p>

          <div className="space-y-4">
            {parsingModels.map((model, index) => (
              <ModelConfigurationSection
                key={model.id}
                model={model}
                index={index}
                isAnswering={false}
                expandedPrompts={expandedPrompts}
                isRunning={isRunning}
                canRemove={parsingModels.length > 1}
                onUpdateModel={onUpdateParsingModel}
                onRemoveModel={onRemoveParsingModel}
                onTogglePromptExpanded={onTogglePromptExpanded}
                onConfigureMCP={() => {}}
                onRemoveMCP={() => {}}
                onConfigureExtraKwargs={(modelId) =>
                  setExtraKwargsModalState({ isOpen: true, modelId, isAnswering: false })
                }
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Evaluation Configuration */}
      <EvaluationSettingsSection
        isRunning={isRunning}
        correctnessEnabled={correctnessEnabled}
        rubricEnabled={rubricEnabled}
        rubricEvaluationStrategy={rubricEvaluationStrategy}
        evaluationMode={evaluationMode}
        abstentionEnabled={abstentionEnabled}
        deepJudgmentTemplateEnabled={deepJudgmentTemplateEnabled}
        deepJudgmentSearchEnabled={deepJudgmentSearchEnabled}
        deepJudgmentRubricEnabled={deepJudgmentRubricEnabled}
        deepJudgmentRubricMode={deepJudgmentRubricMode}
        deepJudgmentRubricExtractExcerpts={deepJudgmentRubricExtractExcerpts}
        fewShotEnabled={fewShotEnabled}
        fewShotMode={fewShotMode}
        fewShotK={fewShotK}
        onCorrectnessEnabledChange={onCorrectnessEnabledChange}
        onRubricEnabledChange={onRubricEnabledChange}
        onRubricEvaluationStrategyChange={onRubricEvaluationStrategyChange}
        onEvaluationModeChange={onEvaluationModeChange}
        onAbstentionEnabledChange={onAbstentionEnabledChange}
        onDeepJudgmentTemplateEnabledChange={onDeepJudgmentTemplateEnabledChange}
        onDeepJudgmentSearchEnabledChange={onDeepJudgmentSearchEnabledChange}
        onDeepJudgmentRubricEnabledChange={onDeepJudgmentRubricEnabledChange}
        onDeepJudgmentRubricModeChange={onDeepJudgmentRubricModeChange}
        onDeepJudgmentRubricExtractExcerptsChange={onDeepJudgmentRubricExtractExcerptsChange}
        onFewShotEnabledChange={onFewShotEnabledChange}
        onFewShotModeChange={onFewShotModeChange}
        onFewShotKChange={onFewShotKChange}
      />

      {/* Model Combinations Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Test Combinations</span>
        </div>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          With {answeringModels.length} answering model(s), {parsingModels.length} parsing model(s), and{' '}
          {replicateCount} replicate(s), each selected test will run{' '}
          <span className="font-semibold">{answeringModels.length * parsingModels.length * replicateCount}</span> times
          (one for each model combination × replicate).
        </p>
      </div>

      {/* MCP Configuration Modal */}
      <MCPConfigurationModal
        isOpen={mcpModalState.isOpen}
        onClose={() => setMcpModalState({ isOpen: false, modelId: null })}
        onSave={handleMCPSave}
        initialConfig={getCurrentMCPConfig()}
      />

      <ExtraKwargsModal
        isOpen={extraKwargsModalState.isOpen}
        onClose={() => setExtraKwargsModalState({ isOpen: false, modelId: null, isAnswering: true })}
        onSave={handleExtraKwargsSave}
        initialKwargs={getCurrentExtraKwargs()}
        initialMiddleware={getCurrentMiddleware()}
        initialMaxContextTokens={getCurrentMaxContextTokens()}
        hasMcp={hasMcpForCurrentModel()}
      />
    </>
  );
};
