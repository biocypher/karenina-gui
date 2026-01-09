/**
 * Model Interface Switcher Utility
 *
 * Handles interface-specific configuration management when switching between
 * different model interfaces (langchain, openrouter, openai_endpoint, manual).
 *
 * Extracted from useBenchmarkConfiguration.ts to deduplicate logic between
 * updateAnsweringModel and updateParsingModel functions.
 */

import type { ModelConfiguration } from '../types';

export type ModelInterface = ModelConfiguration['interface'];

export interface InterfaceSwitchConfig {
  savedProvider?: string;
  savedModel?: string;
  savedEndpointBaseUrl?: string;
  savedEndpointApiKey?: string;
}

/**
 * Process model configuration updates based on interface type
 *
 * When switching interfaces, different fields need to be cleared or set to defaults:
 * - langchain: needs provider, clears endpoint fields
 * - openrouter: clears provider and endpoint fields
 * - openai_endpoint: clears provider, needs endpoint fields
 * - manual: clears provider, model_name, endpoint fields, and MCP config
 *
 * @param updates - The updates being applied to the model configuration
 * @param config - Saved default configuration values
 * @returns Processed updates with appropriate fields cleared/set
 */
export function processInterfaceSwitch(
  updates: Partial<ModelConfiguration>,
  config: InterfaceSwitchConfig
): Partial<ModelConfiguration> {
  const processedUpdates = { ...updates };

  // Only process if interface is being changed
  if (!updates.interface) {
    return processedUpdates;
  }

  switch (updates.interface) {
    case 'langchain':
      // Ensure provider has a default value for langchain
      if (!processedUpdates.model_provider) {
        processedUpdates.model_provider = config.savedProvider || '';
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
        processedUpdates.endpoint_base_url = config.savedEndpointBaseUrl;
      }
      if (!processedUpdates.endpoint_api_key) {
        processedUpdates.endpoint_api_key = config.savedEndpointApiKey;
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

  return processedUpdates;
}

/**
 * Process interface switching for parsing models
 *
 * Similar to processInterfaceSwitch but with parsing-model-specific behavior.
 * For parsing models, manual interface behaves like openrouter (clears fields but doesn't clear model_name).
 *
 * @param updates - The updates being applied to the model configuration
 * @param config - Saved default configuration values
 * @returns Processed updates with appropriate fields cleared/set
 */
export function processParsingInterfaceSwitch(
  updates: Partial<ModelConfiguration>,
  config: InterfaceSwitchConfig
): Partial<ModelConfiguration> {
  const processedUpdates = { ...updates };

  // Only process if interface is being changed
  if (!updates.interface) {
    return processedUpdates;
  }

  switch (updates.interface) {
    case 'langchain':
      // Ensure provider has a default value for langchain
      if (!processedUpdates.model_provider) {
        processedUpdates.model_provider = config.savedProvider || '';
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
        processedUpdates.endpoint_base_url = config.savedEndpointBaseUrl;
      }
      if (!processedUpdates.endpoint_api_key) {
        processedUpdates.endpoint_api_key = config.savedEndpointApiKey;
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

  return processedUpdates;
}
