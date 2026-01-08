import { ModelConfiguration } from '../types';

/**
 * Default model configurations used for initial state and validation.
 * These are the default values that models are initialized with in the store.
 */

export const DEFAULT_ANSWERING_MODEL_ID = 'answering-1';
export const DEFAULT_PARSING_MODEL_ID = 'parsing-1';
export const DEFAULT_MODEL_PROVIDER = 'anthropic';
export const DEFAULT_MODEL_NAME = 'claude-haiku-4-5';
export const DEFAULT_MODEL_INTERFACE = 'langchain';

/**
 * Check if a model configuration matches the default answering model.
 */
export function isDefaultAnsweringModel(model: ModelConfiguration): boolean {
  return (
    model.id === DEFAULT_ANSWERING_MODEL_ID &&
    model.model_provider === DEFAULT_MODEL_PROVIDER &&
    model.model_name === DEFAULT_MODEL_NAME &&
    model.interface === DEFAULT_MODEL_INTERFACE
  );
}

/**
 * Check if a model configuration matches the default parsing model.
 */
export function isDefaultParsingModel(model: ModelConfiguration): boolean {
  return (
    model.id === DEFAULT_PARSING_MODEL_ID &&
    model.model_provider === DEFAULT_MODEL_PROVIDER &&
    model.model_name === DEFAULT_MODEL_NAME &&
    model.interface === DEFAULT_MODEL_INTERFACE
  );
}

/**
 * Check if the answering models array contains only the default model.
 */
export function isDefaultAnsweringConfiguration(models: ModelConfiguration[]): boolean {
  return models.length === 1 && isDefaultAnsweringModel(models[0]);
}

/**
 * Check if the parsing models array contains only the default model.
 */
export function isDefaultParsingConfiguration(models: ModelConfiguration[]): boolean {
  return models.length === 1 && isDefaultParsingModel(models[0]);
}

/**
 * Check if both answering and parsing models are at their default configurations.
 */
export function isDefaultModelConfiguration(
  answeringModels: ModelConfiguration[],
  parsingModels: ModelConfiguration[]
): boolean {
  return isDefaultAnsweringConfiguration(answeringModels) && isDefaultParsingConfiguration(parsingModels);
}
