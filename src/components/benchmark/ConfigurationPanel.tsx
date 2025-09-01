import React from 'react';
import { BarChart3, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { ManualTraceUpload } from '../ManualTraceUpload';

interface ModelConfiguration {
  id: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual';
  system_prompt: string;
}

interface ConfigurationPanelProps {
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];
  replicateCount: number;
  expandedPrompts: Set<string>;
  isRunning: boolean;
  finishedTemplates?: Array<[string, unknown]>;
  rubricEnabled: boolean;
  correctnessEnabled: boolean;
  fewShotEnabled: boolean;
  fewShotMode: 'all' | 'k-shot' | 'individual';
  fewShotK: number;
  onAddAnsweringModel: () => void;
  onAddParsingModel: () => void;
  onRemoveAnsweringModel: (id: string) => void;
  onRemoveParsingModel: (id: string) => void;
  onUpdateAnsweringModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onUpdateParsingModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onTogglePromptExpanded: (modelId: string) => void;
  onRubricEnabledChange: (enabled: boolean) => void;
  onCorrectnessEnabledChange: (enabled: boolean) => void;
  onFewShotEnabledChange: (enabled: boolean) => void;
  onFewShotModeChange: (mode: 'all' | 'k-shot' | 'individual') => void;
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
  correctnessEnabled,
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
  onCorrectnessEnabledChange,
  onFewShotEnabledChange,
  onFewShotModeChange,
  onFewShotKChange,
  onManualTraceUploadSuccess,
  onManualTraceUploadError,
}) => {
  const renderModelConfiguration = (model: ModelConfiguration, index: number, isAnswering: boolean) => (
    <div key={model.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-800 dark:text-slate-200">Model {index + 1}</h4>
        {((isAnswering && answeringModels.length > 1) || (!isAnswering && parsingModels.length > 1)) && (
          <button
            onClick={() => (isAnswering ? onRemoveAnsweringModel(model.id) : onRemoveParsingModel(model.id))}
            disabled={isRunning}
            className="text-red-600 hover:text-red-700 disabled:text-slate-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Interface Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Interface</label>
        <div className="flex gap-4">
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              name={`${model.id}-interface`}
              value="langchain"
              checked={model.interface === 'langchain'}
              onChange={(e) => {
                const update = { interface: e.target.value as 'langchain' | 'openrouter' | 'manual' };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="mr-2"
            />
            LangChain
          </label>
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              name={`${model.id}-interface`}
              value="openrouter"
              checked={model.interface === 'openrouter'}
              onChange={(e) => {
                const update = { interface: e.target.value as 'langchain' | 'openrouter' | 'manual' };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="mr-2"
            />
            OpenRouter
          </label>
          {isAnswering && (
            <label className="flex items-center text-slate-900 dark:text-white">
              <input
                type="radio"
                name={`${model.id}-interface`}
                value="manual"
                checked={model.interface === 'manual'}
                onChange={(e) => {
                  const update = { interface: e.target.value as 'langchain' | 'openrouter' | 'manual' };
                  if (isAnswering) {
                    onUpdateAnsweringModel(model.id, update);
                  } else {
                    onUpdateParsingModel(model.id, update);
                  }
                }}
                disabled={isRunning}
                className="mr-2"
              />
              Manual
            </label>
          )}
        </div>
      </div>

      {/* Provider Selection - Show only for LangChain interface */}
      {model.interface === 'langchain' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Provider</label>
          <input
            type="text"
            value={model.model_provider}
            onChange={(e) => {
              const update = { model_provider: e.target.value };
              if (isAnswering) {
                onUpdateAnsweringModel(model.id, update);
              } else {
                onUpdateParsingModel(model.id, update);
              }
            }}
            disabled={isRunning}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            placeholder="e.g., google_genai, openai, anthropic"
          />
        </div>
      )}

      {/* Model Name - Show for LangChain and OpenRouter interfaces */}
      {(model.interface === 'langchain' || model.interface === 'openrouter') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Model Name</label>
          <input
            type="text"
            value={model.model_name}
            onChange={(e) => {
              const update = { model_name: e.target.value };
              if (isAnswering) {
                onUpdateAnsweringModel(model.id, update);
              } else {
                onUpdateParsingModel(model.id, update);
              }
            }}
            disabled={isRunning}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
          />
        </div>
      )}

      {/* Temperature - Show for LangChain and OpenRouter interfaces */}
      {(model.interface === 'langchain' || model.interface === 'openrouter') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Temperature: {model.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={model.temperature}
            onChange={(e) => {
              const update = { temperature: parseFloat(e.target.value) };
              if (isAnswering) {
                onUpdateAnsweringModel(model.id, update);
              } else {
                onUpdateParsingModel(model.id, update);
              }
            }}
            disabled={isRunning}
            className="w-full"
          />
        </div>
      )}

      {/* System Prompt - Show for LangChain and OpenRouter interfaces */}
      {(model.interface === 'langchain' || model.interface === 'openrouter') && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">System Prompt</label>
            <button
              type="button"
              onClick={() => onTogglePromptExpanded(model.id)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {expandedPrompts.has(model.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {expandedPrompts.has(model.id) && (
            <textarea
              value={model.system_prompt}
              onChange={(e) => {
                const update = { system_prompt: e.target.value };
                if (isAnswering) {
                  onUpdateAnsweringModel(model.id, update);
                } else {
                  onUpdateParsingModel(model.id, update);
                }
              }}
              disabled={isRunning}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
              rows={3}
              placeholder="Define the model's role and behavior..."
            />
          )}

          {!expandedPrompts.has(model.id) && (
            <div className="text-xs text-slate-500 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-700/30 rounded border border-slate-200 dark:border-slate-600">
              {model.system_prompt.length > 60 ? model.system_prompt.substring(0, 60) + '...' : model.system_prompt}
            </div>
          )}
        </div>
      )}

      {/* Manual Trace Upload - Show only for answering models with manual interface */}
      {isAnswering && model.interface === 'manual' && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <ManualTraceUpload
            onUploadSuccess={onManualTraceUploadSuccess}
            onUploadError={onManualTraceUploadError}
            className="text-sm"
            finishedTemplates={finishedTemplates}
          />
        </div>
      )}
    </div>
  );

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
            {answeringModels.map((model, index) => renderModelConfiguration(model, index, true))}
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
            {parsingModels.map((model, index) => renderModelConfiguration(model, index, false))}
          </div>
        </Card>
      </div>

      {/* Evaluation Configuration */}
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">☑ Correctness</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">☑ Rubric</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (Qualitative evaluation using defined traits)
              </span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={fewShotEnabled}
                onChange={(e) => onFewShotEnabledChange(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">⚡ Few-shot Prompting</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (Use examples to improve LLM performance - disabled by default)
              </span>
            </label>
          </div>

          {/* Few-shot Configuration */}
          {fewShotEnabled && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Few-shot Mode
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="few-shot-mode"
                      value="all"
                      checked={fewShotMode === 'all'}
                      onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'individual')}
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
                      onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'individual')}
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Use k examples per question</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="few-shot-mode"
                      value="individual"
                      checked={fewShotMode === 'individual'}
                      onChange={(e) => onFewShotModeChange(e.target.value as 'all' | 'k-shot' | 'individual')}
                      disabled={isRunning}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Per-question examples only</span>
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
    </>
  );
};
