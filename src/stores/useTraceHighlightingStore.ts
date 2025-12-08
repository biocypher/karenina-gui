import { create } from 'zustand';

// Default patterns for message detection
const DEFAULT_AI_PATTERN = '--- AI Message ---';
const DEFAULT_TOOL_PATTERN = '--- Tool Message \\(call_id: .+\\) ---';
const STORAGE_KEY = 'karenina-trace-highlighting';

interface TraceHighlightingState {
  // Configuration
  aiMessagePattern: string;
  toolMessagePattern: string;
  highlightingEnabled: boolean;

  // Actions
  setAiMessagePattern: (pattern: string) => void;
  setToolMessagePattern: (pattern: string) => void;
  setHighlightingEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;

  // Validation
  validatePattern: (pattern: string) => { valid: boolean; error: string | null };

  // Persistence
  loadFromStorage: () => void;
}

// Helper to load from localStorage
const loadStoredSettings = (): Partial<TraceHighlightingState> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load trace highlighting settings:', error);
  }
  return null;
};

// Helper to save to localStorage
const saveToStorage = (state: {
  aiMessagePattern: string;
  toolMessagePattern: string;
  highlightingEnabled: boolean;
}) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        aiMessagePattern: state.aiMessagePattern,
        toolMessagePattern: state.toolMessagePattern,
        highlightingEnabled: state.highlightingEnabled,
      })
    );
  } catch (error) {
    console.warn('Failed to save trace highlighting settings:', error);
  }
};

// Load initial state from localStorage
const storedSettings = loadStoredSettings();

export const useTraceHighlightingStore = create<TraceHighlightingState>((set, get) => ({
  // Initial state with localStorage fallback
  aiMessagePattern: storedSettings?.aiMessagePattern ?? DEFAULT_AI_PATTERN,
  toolMessagePattern: storedSettings?.toolMessagePattern ?? DEFAULT_TOOL_PATTERN,
  highlightingEnabled: storedSettings?.highlightingEnabled ?? true,

  setAiMessagePattern: (pattern: string) => {
    set({ aiMessagePattern: pattern });
    const state = get();
    saveToStorage({
      aiMessagePattern: pattern,
      toolMessagePattern: state.toolMessagePattern,
      highlightingEnabled: state.highlightingEnabled,
    });
  },

  setToolMessagePattern: (pattern: string) => {
    set({ toolMessagePattern: pattern });
    const state = get();
    saveToStorage({
      aiMessagePattern: state.aiMessagePattern,
      toolMessagePattern: pattern,
      highlightingEnabled: state.highlightingEnabled,
    });
  },

  setHighlightingEnabled: (enabled: boolean) => {
    set({ highlightingEnabled: enabled });
    const state = get();
    saveToStorage({
      aiMessagePattern: state.aiMessagePattern,
      toolMessagePattern: state.toolMessagePattern,
      highlightingEnabled: enabled,
    });
  },

  resetToDefaults: () => {
    set({
      aiMessagePattern: DEFAULT_AI_PATTERN,
      toolMessagePattern: DEFAULT_TOOL_PATTERN,
      highlightingEnabled: true,
    });
    saveToStorage({
      aiMessagePattern: DEFAULT_AI_PATTERN,
      toolMessagePattern: DEFAULT_TOOL_PATTERN,
      highlightingEnabled: true,
    });
  },

  validatePattern: (pattern: string) => {
    if (!pattern.trim()) {
      return { valid: true, error: null }; // Empty patterns are valid (disabled)
    }
    try {
      new RegExp(pattern);
      return { valid: true, error: null };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid regex pattern',
      };
    }
  },

  loadFromStorage: () => {
    const stored = loadStoredSettings();
    if (stored) {
      set({
        aiMessagePattern: stored.aiMessagePattern ?? DEFAULT_AI_PATTERN,
        toolMessagePattern: stored.toolMessagePattern ?? DEFAULT_TOOL_PATTERN,
        highlightingEnabled: stored.highlightingEnabled ?? true,
      });
    }
  },
}));

// Export defaults for use in other components
export const TRACE_HIGHLIGHTING_DEFAULTS = {
  aiMessagePattern: DEFAULT_AI_PATTERN,
  toolMessagePattern: DEFAULT_TOOL_PATTERN,
};
