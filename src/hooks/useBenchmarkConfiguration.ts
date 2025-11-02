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
  const {
    savedInterface,
    savedProvider,
    savedModel,
    savedEndpointBaseUrl,
    savedEndpointApiKey,
    savedAsyncEnabled,
    savedAsyncMaxWorkers,
  } = useConfigStore();

  // Get all configuration from benchmark store (persists across tab switches)
  const {
    answeringModels,
    parsingModels,
    replicateCount,
    runName,
    expandedPrompts,
    rubricEnabled,
    evaluationMode,
    correctnessEnabled,
    abstentionEnabled,
    deepJudgmentEnabled,
    deepJudgmentSearchEnabled,
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
    setEvaluationMode,
    setCorrectnessEnabled,
    setAbstentionEnabled,
    setDeepJudgmentEnabled,
    setDeepJudgmentSearchEnabled,
    setFewShotEnabled,
    setFewShotMode,
    setFewShotK,
  } = useBenchmarkStore();

  // Update default models ONLY if they match the initial store defaults
  // This ensures user modifications persist across tab switches
  // but reset on page refresh (since Zustand store resets on page refresh)
  useEffect(() => {
    // Check if models are still at their initial defaults (haven't been modified by user)
    const answeringIsDefault =
      answeringModels.length === 1 &&
      answeringModels[0].id === 'answering-1' &&
      answeringModels[0].model_provider === 'google_genai' &&
      answeringModels[0].model_name === 'gemini-2.5-flash' &&
      answeringModels[0].interface === 'langchain';

    const parsingIsDefault =
      parsingModels.length === 1 &&
      parsingModels[0].id === 'parsing-1' &&
      parsingModels[0].model_provider === 'google_genai' &&
      parsingModels[0].model_name === 'gemini-2.5-flash' &&
      parsingModels[0].interface === 'langchain';

    // Only update if both models are still at defaults
    if (answeringIsDefault && parsingIsDefault) {
      setAnsweringModels([
        {
          ...answeringModels[0],
          interface: savedInterface,
          model_provider: savedProvider,
          model_name: savedModel,
          endpoint_base_url: savedEndpointBaseUrl,
          endpoint_api_key: savedEndpointApiKey,
        },
      ]);

      setParsingModels([
        {
          ...parsingModels[0],
          interface: savedInterface,
          model_provider: savedProvider,
          model_name: savedModel,
          endpoint_base_url: savedEndpointBaseUrl,
          endpoint_api_key: savedEndpointApiKey,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Model management functions - wrap store functions with additional logic
  const addAnsweringModel = () => {
    const newModel: ModelConfiguration = {
      id: `answering-${Date.now()}`,
      model_provider: savedProvider,
      model_name: savedModel,
      temperature: 0.1,
      interface: savedInterface,
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.',
      endpoint_base_url: savedEndpointBaseUrl,
      endpoint_api_key: savedEndpointApiKey,
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
      endpoint_base_url: savedEndpointBaseUrl,
      endpoint_api_key: savedEndpointApiKey,
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
          // Clear endpoint fields for langchain
          processedUpdates.endpoint_base_url = undefined;
          processedUpdates.endpoint_api_key = undefined;
          break;
        case 'openrouter':
          // Clear provider field for openrouter (not needed)
          processedUpdates.model_provider = '';
          // Clear endpoint fields for openrouter
          processedUpdates.endpoint_base_url = undefined;
          processedUpdates.endpoint_api_key = undefined;
          break;
        case 'openai_endpoint':
          // Clear provider field for openai_endpoint (not needed)
          processedUpdates.model_provider = '';
          // Ensure endpoint fields have default values
          if (!processedUpdates.endpoint_base_url) {
            processedUpdates.endpoint_base_url = savedEndpointBaseUrl;
          }
          if (!processedUpdates.endpoint_api_key) {
            processedUpdates.endpoint_api_key = savedEndpointApiKey;
          }
          break;
        case 'manual':
          // Clear both provider and model_name for manual
          processedUpdates.model_provider = '';
          processedUpdates.model_name = '';
          // Clear endpoint fields for manual
          processedUpdates.endpoint_base_url = undefined;
          processedUpdates.endpoint_api_key = undefined;
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
          // Clear endpoint fields for langchain
          processedUpdates.endpoint_base_url = undefined;
          processedUpdates.endpoint_api_key = undefined;
          break;
        case 'openrouter':
          // Clear provider field for openrouter (not needed)
          processedUpdates.model_provider = '';
          // Clear endpoint fields for openrouter
          processedUpdates.endpoint_base_url = undefined;
          processedUpdates.endpoint_api_key = undefined;
          break;
        case 'openai_endpoint':
          // Clear provider field for openai_endpoint (not needed)
          processedUpdates.model_provider = '';
          // Ensure endpoint fields have default values
          if (!processedUpdates.endpoint_base_url) {
            processedUpdates.endpoint_base_url = savedEndpointBaseUrl;
          }
          if (!processedUpdates.endpoint_api_key) {
            processedUpdates.endpoint_api_key = savedEndpointApiKey;
          }
          break;
        case 'manual':
          // For parsing models, manual interface should behave like openrouter
          // (parsing models don't support manual interface according to the UI)
          processedUpdates.model_provider = '';
          // Clear endpoint fields for manual
          processedUpdates.endpoint_base_url = undefined;
          processedUpdates.endpoint_api_key = undefined;
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
    evaluation_mode: evaluationMode,
    abstention_enabled: abstentionEnabled,
    deep_judgment_enabled: deepJudgmentEnabled,
    deep_judgment_search_enabled: deepJudgmentSearchEnabled,
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
    evaluationMode,
    correctnessEnabled,
    abstentionEnabled,
    deepJudgmentEnabled,
    deepJudgmentSearchEnabled,
    fewShotEnabled,
    fewShotMode,
    fewShotK,

    // Setters
    setReplicateCount,
    setRunName,
    setRubricEnabled,
    setEvaluationMode,
    setCorrectnessEnabled,
    setAbstentionEnabled,
    setDeepJudgmentEnabled,
    setDeepJudgmentSearchEnabled,
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
