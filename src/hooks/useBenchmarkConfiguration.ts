import { useState, useEffect } from 'react';
import { ModelConfiguration } from '../types';
import { useConfigStore } from '../stores/useConfigStore';

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

  const [answeringModels, setAnsweringModels] = useState<ModelConfiguration[]>([
    {
      id: 'answering-1',
      model_provider: 'google_genai',
      model_name: 'gemini-2.5-flash',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.',
    },
  ]);

  const [parsingModels, setParsingModels] = useState<ModelConfiguration[]>([
    {
      id: 'parsing-1',
      model_provider: 'google_genai',
      model_name: 'gemini-2.5-flash',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt:
        'You are a validation assistant. Parse and validate responses against the given Pydantic template.',
    },
  ]);

  // Update default models when saved config store defaults change
  useEffect(() => {
    setAnsweringModels((models) =>
      models.map((model, index) =>
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

    setParsingModels((models) =>
      models.map((model, index) =>
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
  }, [savedInterface, savedProvider, savedModel]);

  const [replicateCount, setReplicateCount] = useState<number>(1);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [runName, setRunName] = useState<string>('');
  const [rubricEnabled, setRubricEnabled] = useState<boolean>(false);
  const [correctnessEnabled, setCorrectnessEnabled] = useState<boolean>(true);
  const [fewShotEnabled, setFewShotEnabled] = useState<boolean>(false);
  const [fewShotMode, setFewShotMode] = useState<'all' | 'k-shot' | 'custom'>('all');
  const [fewShotK, setFewShotK] = useState<number>(3);

  // Model management functions
  const addAnsweringModel = () => {
    const newModel: ModelConfiguration = {
      id: `answering-${Date.now()}`,
      model_provider: savedProvider,
      model_name: savedModel,
      temperature: 0.1,
      interface: savedInterface,
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.',
    };
    setAnsweringModels([...answeringModels, newModel]);
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
    setParsingModels([...parsingModels, newModel]);
  };

  const removeAnsweringModel = (id: string) => {
    if (answeringModels.length > 1) {
      setAnsweringModels(answeringModels.filter((model) => model.id !== id));
    }
  };

  const removeParsingModel = (id: string) => {
    if (parsingModels.length > 1) {
      setParsingModels(parsingModels.filter((model) => model.id !== id));
    }
  };

  const updateAnsweringModel = (id: string, updates: Partial<ModelConfiguration>) => {
    setAnsweringModels(
      answeringModels.map((model) => {
        if (model.id === id) {
          const updatedModel = { ...model, ...updates };

          // Handle interface switching - clear non-relevant fields and set defaults
          if (updates.interface) {
            switch (updates.interface) {
              case 'langchain':
                // Ensure provider has a default value for langchain
                if (!updatedModel.model_provider) {
                  updatedModel.model_provider = savedProvider;
                }
                break;
              case 'openrouter':
                // Clear provider field for openrouter (not needed)
                updatedModel.model_provider = '';
                break;
              case 'manual':
                // Clear both provider and model_name for manual
                updatedModel.model_provider = '';
                updatedModel.model_name = '';
                break;
            }
          }

          return updatedModel;
        }
        return model;
      })
    );
  };

  const updateParsingModel = (id: string, updates: Partial<ModelConfiguration>) => {
    setParsingModels(
      parsingModels.map((model) => {
        if (model.id === id) {
          const updatedModel = { ...model, ...updates };

          // Handle interface switching - clear non-relevant fields and set defaults
          if (updates.interface) {
            switch (updates.interface) {
              case 'langchain':
                // Ensure provider has a default value for langchain
                if (!updatedModel.model_provider) {
                  updatedModel.model_provider = savedProvider;
                }
                break;
              case 'openrouter':
                // Clear provider field for openrouter (not needed)
                updatedModel.model_provider = '';
                break;
              case 'manual':
                // For parsing models, manual interface should behave like openrouter
                // (parsing models don't support manual interface according to the UI)
                updatedModel.model_provider = '';
                break;
            }
          }

          return updatedModel;
        }
        return model;
      })
    );
  };

  const togglePromptExpanded = (modelId: string) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId);
    } else {
      newExpanded.add(modelId);
    }
    setExpandedPrompts(newExpanded);
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
