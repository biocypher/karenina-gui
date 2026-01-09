import { useState, useEffect, useCallback } from 'react';
import type {
  AgentMiddlewareConfig,
  AgentLimitConfig,
  ModelRetryConfig,
  ToolRetryConfig,
  SummarizationConfig,
} from '../../../types';
import {
  DEFAULT_LIMITS,
  DEFAULT_MODEL_RETRY,
  DEFAULT_TOOL_RETRY,
  DEFAULT_SUMMARIZATION,
} from './MiddlewareConfigurationSections';

// Generation params type
export interface GenerationParams {
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
}

// Keys that are generation params (handled in Tab 1)
const GENERATION_PARAM_KEYS = [
  'max_tokens',
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'stop_sequences',
  'stop',
];

// ============================================================================
// Hook Props
// ============================================================================

export interface UseExtraKwargsStateProps {
  isOpen: boolean;
  initialKwargs?: Record<string, unknown>;
  initialMiddleware?: AgentMiddlewareConfig;
  initialMaxContextTokens?: number;
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseExtraKwargsStateReturn {
  // Tab state
  activeTab: 'common' | 'json';
  setActiveTab: (tab: 'common' | 'json') => void;

  // Tab 1: Common params state
  generationParams: GenerationParams;
  setGenerationParams: React.Dispatch<React.SetStateAction<GenerationParams>>;
  middlewareConfig: AgentMiddlewareConfig | undefined;
  maxContextTokens: number | undefined;
  setMaxContextTokens: (value: number | undefined) => void;

  // Tab 2: JSON state
  jsonText: string;
  setJsonText: (text: string) => void;
  jsonError: string | null;
  setJsonError: (error: string | null) => void;

  // Conflict detection
  conflicts: string[];
  setConflicts: (conflicts: string[]) => void;

  // Examples toggle
  showExamples: boolean;
  setShowExamples: (show: boolean) => void;

  // Actions
  handleJsonChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  validateJson: () => Record<string, unknown> | null;
  handleIndent: () => void;
  handleSave: () => ModelConfigurationUpdate | null;
  handleClear: () => void;

  // Middleware update helpers
  updateLimits: (updates: Partial<AgentLimitConfig>) => void;
  updateModelRetry: (updates: Partial<ModelRetryConfig>) => void;
  updateToolRetry: (updates: Partial<ToolRetryConfig>) => void;
  updateSummarization: (updates: Partial<SummarizationConfig>) => void;
}

// Return type for onSave
export interface ModelConfigurationUpdate {
  extra_kwargs: Record<string, unknown>;
  agent_middleware?: AgentMiddlewareConfig;
  max_context_tokens?: number;
}

// ============================================================================
// Custom Hook
// ============================================================================

export const useExtraKwargsState = (props: UseExtraKwargsStateProps): UseExtraKwargsStateReturn => {
  const { isOpen, initialKwargs, initialMiddleware, initialMaxContextTokens } = props;

  // Tab state
  const [activeTab, setActiveTab] = useState<'common' | 'json'>('common');

  // Tab 1: Common params state
  const [generationParams, setGenerationParams] = useState<GenerationParams>({});
  const [middlewareConfig, setMiddlewareConfig] = useState<AgentMiddlewareConfig | undefined>(undefined);
  const [maxContextTokens, setMaxContextTokens] = useState<number | undefined>(undefined);

  // Tab 2: JSON state
  const [jsonText, setJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Conflict detection
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Examples toggle
  const [showExamples, setShowExamples] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Extract generation params from initialKwargs
      const extractedGenParams: GenerationParams = {};
      const remainingKwargs: Record<string, unknown> = {};

      if (initialKwargs) {
        Object.entries(initialKwargs).forEach(([key, value]) => {
          if (key === 'max_tokens' && typeof value === 'number') {
            extractedGenParams.max_tokens = value;
          } else if (key === 'top_p' && typeof value === 'number') {
            extractedGenParams.top_p = value;
          } else if (key === 'frequency_penalty' && typeof value === 'number') {
            extractedGenParams.frequency_penalty = value;
          } else if (key === 'presence_penalty' && typeof value === 'number') {
            extractedGenParams.presence_penalty = value;
          } else if ((key === 'stop_sequences' || key === 'stop') && Array.isArray(value)) {
            extractedGenParams.stop_sequences = value as string[];
          } else {
            remainingKwargs[key] = value;
          }
        });
      }

      setGenerationParams(extractedGenParams);
      setJsonText(JSON.stringify(remainingKwargs, null, 2));
      setMiddlewareConfig(initialMiddleware);
      setMaxContextTokens(initialMaxContextTokens);
      setJsonError(null);
      setConflicts([]);
      setActiveTab('common');
    }
  }, [isOpen, initialKwargs, initialMiddleware, initialMaxContextTokens]);

  // Detect conflicts between Tab 1 and Tab 2
  const detectConflicts = useCallback((): string[] => {
    const detectedConflicts: string[] = [];

    try {
      const jsonData = JSON.parse(jsonText);

      // Check generation params
      GENERATION_PARAM_KEYS.forEach((key) => {
        const genKey = key === 'stop' ? 'stop_sequences' : key;
        if (
          generationParams[genKey as keyof GenerationParams] !== undefined &&
          (jsonData[key] !== undefined || jsonData[genKey] !== undefined)
        ) {
          detectedConflicts.push(key);
        }
      });

      // Check middleware
      if (middlewareConfig && jsonData.agent_middleware) {
        detectedConflicts.push('agent_middleware');
      }
    } catch {
      // JSON is invalid, no conflicts from it
    }

    return detectedConflicts;
  }, [jsonText, generationParams, middlewareConfig]);

  // Handle JSON text change
  const handleJsonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setJsonText(e.target.value);
      if (jsonError) setJsonError(null);
      if (conflicts.length > 0) setConflicts([]);
    },
    [jsonError, conflicts.length]
  );

  // Validate JSON
  const validateJson = useCallback((): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      return parsed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';
      setJsonError(errorMessage);
      return null;
    }
  }, [jsonText]);

  // Format/indent JSON
  const handleIndent = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';
      setJsonError(errorMessage);
    }
  }, [jsonText]);

  // Handle save
  const handleSave = useCallback((): ModelConfigurationUpdate | null => {
    // Validate JSON first
    const jsonData = validateJson();
    if (jsonData === null) return null;

    // Check for conflicts
    const detected = detectConflicts();
    if (detected.length > 0) {
      setConflicts(detected);
      return null;
    }

    // Merge generation params into extra_kwargs
    const finalExtraKwargs: Record<string, unknown> = { ...jsonData };

    if (generationParams.max_tokens !== undefined) {
      finalExtraKwargs.max_tokens = generationParams.max_tokens;
    }
    if (generationParams.top_p !== undefined) {
      finalExtraKwargs.top_p = generationParams.top_p;
    }
    if (generationParams.frequency_penalty !== undefined) {
      finalExtraKwargs.frequency_penalty = generationParams.frequency_penalty;
    }
    if (generationParams.presence_penalty !== undefined) {
      finalExtraKwargs.presence_penalty = generationParams.presence_penalty;
    }
    if (generationParams.stop_sequences && generationParams.stop_sequences.length > 0) {
      // Filter out empty strings
      const validSequences = generationParams.stop_sequences.filter((s) => s.trim() !== '');
      if (validSequences.length > 0) {
        finalExtraKwargs.stop = validSequences;
      }
    }

    return {
      extra_kwargs: finalExtraKwargs,
      agent_middleware: middlewareConfig,
      max_context_tokens: maxContextTokens,
    };
  }, [validateJson, detectConflicts, generationParams, middlewareConfig, maxContextTokens]);

  // Clear all
  const handleClear = useCallback(() => {
    setGenerationParams({});
    setMaxContextTokens(undefined);
    setMiddlewareConfig(undefined);
    setJsonText('{}');
    setJsonError(null);
    setConflicts([]);
  }, []);

  // Update middleware sub-configs
  const updateLimits = useCallback((updates: Partial<AgentLimitConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: { ...(prev?.limits ?? DEFAULT_LIMITS), ...updates },
      model_retry: prev?.model_retry ?? DEFAULT_MODEL_RETRY,
      tool_retry: prev?.tool_retry ?? DEFAULT_TOOL_RETRY,
      summarization: prev?.summarization ?? DEFAULT_SUMMARIZATION,
    }));
  }, []);

  const updateModelRetry = useCallback((updates: Partial<ModelRetryConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: prev?.limits ?? DEFAULT_LIMITS,
      model_retry: { ...(prev?.model_retry ?? DEFAULT_MODEL_RETRY), ...updates },
      tool_retry: prev?.tool_retry ?? DEFAULT_TOOL_RETRY,
      summarization: prev?.summarization ?? DEFAULT_SUMMARIZATION,
    }));
  }, []);

  const updateToolRetry = useCallback((updates: Partial<ToolRetryConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: prev?.limits ?? DEFAULT_LIMITS,
      model_retry: prev?.model_retry ?? DEFAULT_MODEL_RETRY,
      tool_retry: { ...(prev?.tool_retry ?? DEFAULT_TOOL_RETRY), ...updates },
      summarization: prev?.summarization ?? DEFAULT_SUMMARIZATION,
    }));
  }, []);

  const updateSummarization = useCallback((updates: Partial<SummarizationConfig>) => {
    setMiddlewareConfig((prev) => ({
      limits: prev?.limits ?? DEFAULT_LIMITS,
      model_retry: prev?.model_retry ?? DEFAULT_MODEL_RETRY,
      tool_retry: prev?.tool_retry ?? DEFAULT_TOOL_RETRY,
      summarization: { ...(prev?.summarization ?? DEFAULT_SUMMARIZATION), ...updates },
    }));
  }, []);

  return {
    activeTab,
    setActiveTab,
    generationParams,
    setGenerationParams,
    middlewareConfig,
    maxContextTokens,
    setMaxContextTokens,
    jsonText,
    setJsonText,
    jsonError,
    setJsonError,
    conflicts,
    setConflicts,
    showExamples,
    setShowExamples,
    handleJsonChange,
    validateJson,
    handleIndent,
    handleSave,
    handleClear,
    updateLimits,
    updateModelRetry,
    updateToolRetry,
    updateSummarization,
  };
};
