import { useState } from 'react';
import { ModelConfiguration } from '../types';

export interface BenchmarkConfiguration {
  answeringModels: ModelConfiguration[];
  parsingModels: ModelConfiguration[];
  replicateCount: number;
  expandedPrompts: Set<string>;
  runName: string;
}

export const useBenchmarkConfiguration = () => {
  const [answeringModels, setAnsweringModels] = useState<ModelConfiguration[]>([
    {
      id: 'answering-1',
      model_provider: 'google_genai',
      model_name: 'gemini-2.0-flash',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.'
    }
  ]);

  const [parsingModels, setParsingModels] = useState<ModelConfiguration[]>([
    {
      id: 'parsing-1',
      model_provider: 'google_genai',
      model_name: 'gemini-2.0-flash',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt: 'You are a validation assistant. Parse and validate responses against the given Pydantic template.'
    }
  ]);

  const [replicateCount, setReplicateCount] = useState<number>(1);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [runName, setRunName] = useState<string>('');

  // Model management functions
  const addAnsweringModel = () => {
    const newModel: ModelConfiguration = {
      id: `answering-${Date.now()}`,
      model_provider: 'google_genai',
      model_name: 'gemini-2.0-flash',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt: 'You are an expert assistant. Answer the question accurately and concisely.'
    };
    setAnsweringModels([...answeringModels, newModel]);
  };

  const addParsingModel = () => {
    const newModel: ModelConfiguration = {
      id: `parsing-${Date.now()}`,
      model_provider: 'google_genai',
      model_name: 'gemini-2.0-flash',
      temperature: 0.1,
      interface: 'langchain',
      system_prompt: 'You are a validation assistant. Parse and validate responses against the given Pydantic template.'
    };
    setParsingModels([...parsingModels, newModel]);
  };

  const removeAnsweringModel = (id: string) => {
    if (answeringModels.length > 1) {
      setAnsweringModels(answeringModels.filter(model => model.id !== id));
    }
  };

  const removeParsingModel = (id: string) => {
    if (parsingModels.length > 1) {
      setParsingModels(parsingModels.filter(model => model.id !== id));
    }
  };

  const updateAnsweringModel = (id: string, updates: Partial<ModelConfiguration>) => {
    setAnsweringModels(answeringModels.map(model => {
      if (model.id === id) {
        const updatedModel = { ...model, ...updates };
        
        // Handle interface switching - clear non-relevant fields and set defaults
        if (updates.interface) {
          switch (updates.interface) {
            case 'langchain':
              // Ensure provider has a default value for langchain
              if (!updatedModel.model_provider) {
                updatedModel.model_provider = 'google_genai';
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
    }));
  };

  const updateParsingModel = (id: string, updates: Partial<ModelConfiguration>) => {
    setParsingModels(parsingModels.map(model => {
      if (model.id === id) {
        const updatedModel = { ...model, ...updates };
        
        // Handle interface switching - clear non-relevant fields and set defaults
        if (updates.interface) {
          switch (updates.interface) {
            case 'langchain':
              // Ensure provider has a default value for langchain
              if (!updatedModel.model_provider) {
                updatedModel.model_provider = 'google_genai';
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
    }));
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
    replicate_count: replicateCount
  });

  return {
    // State
    answeringModels,
    parsingModels,
    replicateCount,
    expandedPrompts,
    runName,
    
    // Setters
    setReplicateCount,
    setRunName,
    
    // Model management functions
    addAnsweringModel,
    addParsingModel,
    removeAnsweringModel,
    removeParsingModel,
    updateAnsweringModel,
    updateParsingModel,
    togglePromptExpanded,
    
    // Utility functions
    getVerificationConfig
  };
};