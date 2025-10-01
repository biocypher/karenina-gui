import { useEffect } from 'react';
import { ModelConfiguration } from '../types';
import { useConfigStore } from '../stores/useConfigStore';
import { useBenchmarkStore } from '../stores/useBenchmarkStore';

export interface BenchmarkConfiguration {
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];
  replicateCount: number;
  expandedPrompts: Set<string>;
  runName: string;
  rubricEnabled: boolean;
  correctnessEnabled: boolean;
  fewShotEnabled: boolean;
  fewShotMode: 'all' | 'k-shot' | 'custom';
  fewShotK: number;
}

export const useBenchmarkConfiguration = () => {
  // Get saved defaults from config store (not working draft values)
  const { savedInterface, savedProvider, savedModel, savedAsyncEnabled, savedAsyncChunkSize, savedAsyncMaxWorkers } =
    useConfigStore();

  // Get all configuration from benchmark store (persists across tab switches)
  const {
    answeringModels,
    parsingModels,
    replicateCount,
    runName,
    expandedPrompts,
    rubricEnabled,
    correctnessEnabled,
    fewShotEnabled,
    fewShotMode,
    fewShotK,
    setAnsweringModels,
    setParsingModels,
    addAnsweringModel: storeAddAnsweringModel,
    addParsingModel: storeAddParsingModel,
    removeAnsweringModel: storeRemoveAnsweringModel,
    removeParsingModel: storeRemoveParsingModel,
    updateAnsweringModel: storeUpdateAnsweringModel,
    updateParsingModel: storeUpdateParsingModel,
    setReplicateCount,
    setRunName,
    togglePromptExpanded: storeTogglePromptExpanded,
    setRubricEnabled,
    setCorrectnessEnabled,
    setFewShotEnabled,
    setFewShotMode,
    setFewShotK,
  } = useBenchmarkStore();

  // Update default models when saved config store defaults change
  useEffect(() => {
    setAnsweringModels(
      answeringModels.map((model, index) =>
        index === 0
          ? {
              ...model,
              interface: savedInterface,
              model_provider: savedProvider,
              model_name: savedModel,
            }
          : model
      )
    );

    setParsingModels(
      parsingModels.map((model, index) =>
        index === 0
          ? {
              ...model,
              interface: savedInterface,
              model_provider: savedProvider,
              model_name: savedModel,
            }
          : model
      )
    );
  }, [savedInterface, savedProvider, savedModel, setAnsweringModels, setParsingModels]);

  // Model management functions - wrap store functions with additional logic
  const addAnsweringModel = () => {
    const newModel: ModelConfiguration = {
      id: `answering-${Date.now()}`,
      model_provider: savedProvider,
      model_name: savedModel,
      temperature: 0.1,
      interface: savedInterface,
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.',
    };
    storeAddAnsweringModel(newModel);
  };

  const addParsingModel = () => {
    const newModel: ModelConfiguration = {
      id: `parsing-${Date.now()}`,
      model_provider: savedProvider,
      model_name: savedModel,
      temperature: 0.1,
      interface: savedInterface,
      system_prompt:
        'You are a validation assistant. Parse and validate responses against the given Pydantic template.',
    };
    storeAddParsingModel(newModel);
  };

  const removeAnsweringModel = (id: string) => {
    storeRemoveAnsweringModel(id);
  };

  const removeParsingModel = (id: string) => {
    storeRemoveParsingModel(id);
  };

  const updateAnsweringModel = (id: string, updates: Partial<ModelConfiguration>) => {
    // Handle interface switching - clear non-relevant fields and set defaults
    const processedUpdates = { ...updates };
    if (updates.interface) {
      switch (updates.interface) {
        case 'langchain':
          // Ensure provider has a default value for langchain
          if (!processedUpdates.model_provider) {
            processedUpdates.model_provider = savedProvider;
          }
          break;
        case 'openrouter':
          // Clear provider field for openrouter (not needed)
          processedUpdates.model_provider = '';
          break;
        case 'manual':
          // Clear both provider and model_name for manual
          processedUpdates.model_provider = '';
          processedUpdates.model_name = '';
          // Clear MCP configuration for manual interface (not supported)
          processedUpdates.mcp_urls_dict = undefined;
          processedUpdates.mcp_tool_filter = undefined;
          break;
      }
    }

    storeUpdateAnsweringModel(id, processedUpdates);
  };

  const updateParsingModel = (id: string, updates: Partial<ModelConfiguration>) => {
    // Handle interface switching - clear non-relevant fields and set defaults
    const processedUpdates = { ...updates };
    if (updates.interface) {
      switch (updates.interface) {
        case 'langchain':
          // Ensure provider has a default value for langchain
          if (!processedUpdates.model_provider) {
            processedUpdates.model_provider = savedProvider;
          }
          break;
        case 'openrouter':
          // Clear provider field for openrouter (not needed)
          processedUpdates.model_provider = '';
          break;
        case 'manual':
          // For parsing models, manual interface should behave like openrouter
          // (parsing models don't support manual interface according to the UI)
          processedUpdates.model_provider = '';
          break;
      }
    }

    storeUpdateParsingModel(id, processedUpdates);
  };

  const togglePromptExpanded = (modelId: string) => {
    storeTogglePromptExpanded(modelId);
  };

  // Get configuration for API calls
  const getVerificationConfig = () => ({
    answering_models: answeringModels,
    parsing_models: parsingModels,
    replicate_count: replicateCount,
    rubric_enabled: rubricEnabled,
    few_shot_enabled: fewShotEnabled,
    few_shot_mode: fewShotMode,
    few_shot_k: fewShotK,
  });

  // Get async configuration for API calls
  const getAsyncConfig = () => ({
    enabled: savedAsyncEnabled,
    chunk_size: savedAsyncChunkSize,
    max_workers: savedAsyncMaxWorkers,
  });

  return {
    // State
    answeringModels,
    parsingModels,
    replicateCount,
    expandedPrompts,
    runName,
    rubricEnabled,
    correctnessEnabled,
    fewShotEnabled,
    fewShotMode,
    fewShotK,

    // Setters
    setReplicateCount,
    setRunName,
    setRubricEnabled,
    setCorrectnessEnabled,
    setFewShotEnabled,
    setFewShotMode,
    setFewShotK,

    // Model management functions
    addAnsweringModel,
    addParsingModel,
    removeAnsweringModel,
    removeParsingModel,
    updateAnsweringModel,
    updateParsingModel,
    togglePromptExpanded,

    // Utility functions
    getVerificationConfig,
    getAsyncConfig,
  };
};
