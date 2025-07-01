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
  finishedTemplates?: Array<[string, any]>;
  onAddAnsweringModel: () => void;
  onAddParsingModel: () => void;
  onRemoveAnsweringModel: (id: string) => void;
  onRemoveParsingModel: (id: string) => void;
  onUpdateAnsweringModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onUpdateParsingModel: (id: string, updates: Partial<ModelConfiguration>) => void;
  onTogglePromptExpanded: (modelId: string) => void;
  onReplicateCountChange: (count: number) => void;
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
  onAddAnsweringModel,
  onAddParsingModel,
  onRemoveAnsweringModel,
  onRemoveParsingModel,
  onUpdateAnsweringModel,
  onUpdateParsingModel,
  onTogglePromptExpanded,
  onReplicateCountChange,
  onManualTraceUploadSuccess,
  onManualTraceUploadError,
}) => {
  const renderModelConfiguration = (
    model: ModelConfiguration,
    index: number,
    isAnswering: boolean
  ) => (
    <div key={model.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-800 dark:text-slate-200">
          Model {index + 1}
        </h4>
        {((isAnswering && answeringModels.length > 1) || (!isAnswering && parsingModels.length > 1)) && (
          <button
            onClick={() => isAnswering ? onRemoveAnsweringModel(model.id) : onRemoveParsingModel(model.id)}
            disabled={isRunning}
            className="text-red-600 hover:text-red-700 disabled:text-slate-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Interface Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Interface
        </label>
        <div className="flex gap-4">
          <label className="flex items-center text-slate-900 dark:text-white">
            <input
              type="radio"
              name={`${model.id}-interface`}
              value="langchain"
              checked={model.interface === 'langchain'}
              onChange={(e) => {
                const update = { interface: e.target.value as 'langchain' | 'openrouter' | 'manual' };
                isAnswering ? onUpdateAnsweringModel(model.id, update) : onUpdateParsingModel(model.id, update);
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
                isAnswering ? onUpdateAnsweringModel(model.id, update) : onUpdateParsingModel(model.id, update);
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
                  isAnswering ? onUpdateAnsweringModel(model.id, update) : onUpdateParsingModel(model.id, update);
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Provider
          </label>
          <input
            type="text"
            value={model.model_provider}
            onChange={(e) => {
              const update = { model_provider: e.target.value };
              isAnswering ? onUpdateAnsweringModel(model.id, update) : onUpdateParsingModel(model.id, update);
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Model Name
          </label>
          <input
            type="text"
            value={model.model_name}
            onChange={(e) => {
              const update = { model_name: e.target.value };
              isAnswering ? onUpdateAnsweringModel(model.id, update) : onUpdateParsingModel(model.id, update);
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
              isAnswering ? onUpdateAnsweringModel(model.id, update) : onUpdateParsingModel(model.id, update);
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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              System Prompt
            </label>
            <button
              type="button"
              onClick={() => onTogglePromptExpanded(model.id)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {expandedPrompts.has(model.id) ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {expandedPrompts.has(model.id) && (
            <textarea
              value={model.system_prompt}
              onChange={(e) => {
                const update = { system_prompt: e.target.value };
                isAnswering ? onUpdateAnsweringModel(model.id, update) : onUpdateParsingModel(model.id, update);
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
            {answeringModels.map((model, index) => 
              renderModelConfiguration(model, index, true)
            )}
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
            {parsingModels.map((model, index) => 
              renderModelConfiguration(model, index, false)
            )}
          </div>
        </Card>
      </div>

      {/* Model Combinations Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Test Combinations</span>
        </div>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          With {answeringModels.length} answering model(s), {parsingModels.length} parsing model(s), and {replicateCount} replicate(s), 
          each selected test will run <span className="font-semibold">{answeringModels.length * parsingModels.length * replicateCount}</span> times 
          (one for each model combination × replicate).
        </p>
      </div>
    </>
  );
};