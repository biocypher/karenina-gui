/**
 * API client for benchmark configuration presets
 */

import { API_ENDPOINTS } from '../constants/api';

/**
 * Verification configuration interface matching backend VerificationConfig
 */
export interface VerificationConfig {
  answering_models: ModelConfig[];
  parsing_models: ModelConfig[];
  replicate_count: number;
  parsing_only?: boolean;
  rubric_enabled?: boolean;
  rubric_trait_names?: string[] | null;
  rubric_evaluation_strategy?: 'batch' | 'sequential';
  evaluation_mode?: 'template_only' | 'template_and_rubric' | 'rubric_only';
  abstention_enabled?: boolean;
  sufficiency_enabled?: boolean;
  deep_judgment_enabled?: boolean;
  deep_judgment_max_excerpts_per_attribute?: number;
  deep_judgment_fuzzy_match_threshold?: number;
  deep_judgment_excerpt_retry_attempts?: number;
  deep_judgment_search_enabled?: boolean;
  deep_judgment_search_tool?: string;
  deep_judgment_rubric_mode?: 'disabled' | 'enable_all' | 'use_checkpoint';
  deep_judgment_rubric_global_excerpts?: boolean;
  few_shot_config?: FewShotConfig | null;
  db_config?: Record<string, unknown> | null;
}

/**
 * Model configuration interface
 */
export interface ModelConfig {
  id: string;
  model_provider: string;
  model_name: string;
  temperature?: number;
  interface: 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint' | 'native_sdk';
  system_prompt: string;
  max_retries?: number;
  mcp_urls_dict?: Record<string, string> | null;
  mcp_tool_filter?: string[] | null;
  endpoint_base_url?: string | null;
  endpoint_api_key?: string | null;
  extra_kwargs?: Record<string, unknown> | null;
}

/**
 * Few-shot configuration interface
 */
export interface FewShotConfig {
  enabled: boolean;
  global_mode: 'all' | 'k-shot' | 'custom' | 'none';
  global_k: number;
  question_configs?: Record<string, unknown>;
  global_external_examples?: Array<Record<string, string>>;
}

/**
 * Summary statistics for a preset
 */
export interface PresetSummary {
  answering_model_count: number;
  parsing_model_count: number;
  total_model_count: number;
  replicate_count: number;
  enabled_features: string[];
  interfaces: string[];
}

/**
 * Preset summary (list view)
 */
export interface PresetListItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  summary: PresetSummary;
}

/**
 * Full preset with configuration
 */
export interface Preset {
  id: string;
  name: string;
  description?: string;
  config: VerificationConfig;
  created_at: string;
  updated_at: string;
}

/**
 * Request body for creating a preset
 */
export interface CreatePresetRequest {
  name: string;
  description?: string;
  config: VerificationConfig;
}

/**
 * Request body for updating a preset
 */
export interface UpdatePresetRequest {
  name?: string;
  description?: string;
  config?: VerificationConfig;
}

/**
 * Error response from API
 */
export class PresetApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = 'PresetApiError';
  }
}

/**
 * Fetch all presets with summary information
 */
export async function fetchPresets(): Promise<PresetListItem[]> {
  try {
    const response = await fetch(API_ENDPOINTS.PRESETS_LIST);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PresetApiError(errorData.detail || 'Failed to fetch presets', response.status, errorData);
    }

    const data = await response.json();
    return data.presets || [];
  } catch (error) {
    if (error instanceof PresetApiError) {
      throw error;
    }
    throw new PresetApiError(error instanceof Error ? error.message : 'Failed to fetch presets', 500);
  }
}

/**
 * Fetch a specific preset by ID
 */
export async function getPreset(presetId: string): Promise<Preset> {
  try {
    const response = await fetch(API_ENDPOINTS.PRESET_DETAIL(presetId));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PresetApiError(errorData.detail || `Failed to fetch preset ${presetId}`, response.status, errorData);
    }

    const data = await response.json();
    return data.preset;
  } catch (error) {
    if (error instanceof PresetApiError) {
      throw error;
    }
    throw new PresetApiError(error instanceof Error ? error.message : 'Failed to fetch preset', 500);
  }
}

/**
 * Create a new preset
 */
export async function createPreset(request: CreatePresetRequest): Promise<Preset> {
  try {
    const response = await fetch(API_ENDPOINTS.PRESETS_LIST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PresetApiError(errorData.detail || 'Failed to create preset', response.status, errorData);
    }

    const data = await response.json();
    return data.preset;
  } catch (error) {
    if (error instanceof PresetApiError) {
      throw error;
    }
    throw new PresetApiError(error instanceof Error ? error.message : 'Failed to create preset', 500);
  }
}

/**
 * Update an existing preset
 */
export async function updatePreset(presetId: string, request: UpdatePresetRequest): Promise<Preset> {
  try {
    const response = await fetch(API_ENDPOINTS.PRESET_DETAIL(presetId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PresetApiError(errorData.detail || `Failed to update preset ${presetId}`, response.status, errorData);
    }

    const data = await response.json();
    return data.preset;
  } catch (error) {
    if (error instanceof PresetApiError) {
      throw error;
    }
    throw new PresetApiError(error instanceof Error ? error.message : 'Failed to update preset', 500);
  }
}

/**
 * Delete a preset
 */
export async function deletePreset(presetId: string): Promise<void> {
  try {
    const response = await fetch(API_ENDPOINTS.PRESET_DETAIL(presetId), {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new PresetApiError(errorData.detail || `Failed to delete preset ${presetId}`, response.status, errorData);
    }
  } catch (error) {
    if (error instanceof PresetApiError) {
      throw error;
    }
    throw new PresetApiError(error instanceof Error ? error.message : 'Failed to delete preset', 500);
  }
}
