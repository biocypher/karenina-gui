import { create } from 'zustand';
import { logger } from '../utils/logger';

// Color presets for highlight patterns
export const HIGHLIGHT_COLORS = [
  {
    id: 'green',
    name: 'Green',
    bg: 'bg-green-200 dark:bg-green-800/60',
    text: 'text-green-700 dark:text-green-300',
    preview: 'bg-green-200',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    bg: 'bg-yellow-200 dark:bg-yellow-800/60',
    text: 'text-yellow-700 dark:text-yellow-300',
    preview: 'bg-yellow-200',
  },
  {
    id: 'blue',
    name: 'Blue',
    bg: 'bg-blue-200 dark:bg-blue-800/60',
    text: 'text-blue-700 dark:text-blue-300',
    preview: 'bg-blue-200',
  },
  {
    id: 'purple',
    name: 'Purple',
    bg: 'bg-purple-200 dark:bg-purple-800/60',
    text: 'text-purple-700 dark:text-purple-300',
    preview: 'bg-purple-200',
  },
  {
    id: 'pink',
    name: 'Pink',
    bg: 'bg-pink-200 dark:bg-pink-800/60',
    text: 'text-pink-700 dark:text-pink-300',
    preview: 'bg-pink-200',
  },
  {
    id: 'orange',
    name: 'Orange',
    bg: 'bg-orange-200 dark:bg-orange-800/60',
    text: 'text-orange-700 dark:text-orange-300',
    preview: 'bg-orange-200',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    bg: 'bg-cyan-200 dark:bg-cyan-800/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    preview: 'bg-cyan-200',
  },
  {
    id: 'red',
    name: 'Red',
    bg: 'bg-red-200 dark:bg-red-800/60',
    text: 'text-red-700 dark:text-red-300',
    preview: 'bg-red-200',
  },
] as const;

export type HighlightColorId = (typeof HIGHLIGHT_COLORS)[number]['id'];

export interface HighlightPattern {
  id: string;
  name: string;
  pattern: string;
  colorId: HighlightColorId;
  enabled: boolean;
}

// Default patterns for message detection
const DEFAULT_PATTERNS: HighlightPattern[] = [
  {
    id: 'ai-message',
    name: 'AI Message',
    pattern: '--- AI Message ---',
    colorId: 'green',
    enabled: true,
  },
  {
    id: 'tool-message',
    name: 'Tool Message',
    pattern: '--- Tool Message \\(call_id: .+\\) ---',
    colorId: 'yellow',
    enabled: true,
  },
];

const STORAGE_KEY = 'karenina-trace-highlighting';

interface TraceHighlightingState {
  // Configuration
  patterns: HighlightPattern[];
  highlightingEnabled: boolean;
  editorText: string; // Custom text for preview/editor

  // Actions
  addPattern: (pattern: Omit<HighlightPattern, 'id'>) => void;
  updatePattern: (id: string, updates: Partial<Omit<HighlightPattern, 'id'>>) => void;
  removePattern: (id: string) => void;
  reorderPatterns: (patterns: HighlightPattern[]) => void;
  setHighlightingEnabled: (enabled: boolean) => void;
  setEditorText: (text: string) => void;
  resetToDefaults: () => void;

  // Validation
  validatePattern: (pattern: string) => { valid: boolean; error: string | null };

  // Persistence
  loadFromStorage: () => void;

  // Helpers
  getColorById: (colorId: HighlightColorId) => (typeof HIGHLIGHT_COLORS)[number];
}

// Generate unique ID
const generateId = () => `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to load from localStorage
const loadStoredSettings = (): {
  patterns?: HighlightPattern[];
  highlightingEnabled?: boolean;
  editorText?: string;
} | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.warning('STORAGE', 'Failed to load trace highlighting settings', 'useTraceHighlightingStore', { error });
  }
  return null;
};

// Helper to save to localStorage
const saveToStorage = (state: { patterns: HighlightPattern[]; highlightingEnabled: boolean; editorText: string }) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        patterns: state.patterns,
        highlightingEnabled: state.highlightingEnabled,
        editorText: state.editorText,
      })
    );
  } catch (error) {
    logger.warning('STORAGE', 'Failed to save trace highlighting settings', 'useTraceHighlightingStore', { error });
  }
};

// Load initial state from localStorage
const storedSettings = loadStoredSettings();

// Default editor text for preview
const DEFAULT_EDITOR_TEXT = `--- AI Message ---
Hello, I can help you with that task. Let me search for the information you need.

--- Tool Message (call_id: call_abc123def456) ---
{"informationForTargetByEnsemblId": "query informationForTargetByEnsemblId {\\n  target(ensemblId: \\"ENSG00000169083\\") {\\n    id\\n    approvedSymbol\\n  }\\n}"}

--- AI Message ---
Based on the tool result, the target with Ensembl ID ENSG00000169083 has the approved symbol AR. This is the final answer.`;

export const useTraceHighlightingStore = create<TraceHighlightingState>((set, get) => ({
  // Initial state with localStorage fallback
  patterns: storedSettings?.patterns ?? DEFAULT_PATTERNS,
  highlightingEnabled: storedSettings?.highlightingEnabled ?? true,
  editorText: storedSettings?.editorText ?? DEFAULT_EDITOR_TEXT,

  addPattern: (pattern) => {
    const newPattern: HighlightPattern = {
      ...pattern,
      id: generateId(),
    };
    const updatedPatterns = [...get().patterns, newPattern];
    set({ patterns: updatedPatterns });
    saveToStorage({
      patterns: updatedPatterns,
      highlightingEnabled: get().highlightingEnabled,
      editorText: get().editorText,
    });
  },

  updatePattern: (id, updates) => {
    const updatedPatterns = get().patterns.map((p) => (p.id === id ? { ...p, ...updates } : p));
    set({ patterns: updatedPatterns });
    saveToStorage({
      patterns: updatedPatterns,
      highlightingEnabled: get().highlightingEnabled,
      editorText: get().editorText,
    });
  },

  removePattern: (id) => {
    const updatedPatterns = get().patterns.filter((p) => p.id !== id);
    set({ patterns: updatedPatterns });
    saveToStorage({
      patterns: updatedPatterns,
      highlightingEnabled: get().highlightingEnabled,
      editorText: get().editorText,
    });
  },

  reorderPatterns: (patterns) => {
    set({ patterns });
    saveToStorage({
      patterns,
      highlightingEnabled: get().highlightingEnabled,
      editorText: get().editorText,
    });
  },

  setHighlightingEnabled: (enabled) => {
    set({ highlightingEnabled: enabled });
    saveToStorage({
      patterns: get().patterns,
      highlightingEnabled: enabled,
      editorText: get().editorText,
    });
  },

  setEditorText: (text) => {
    set({ editorText: text });
    saveToStorage({
      patterns: get().patterns,
      highlightingEnabled: get().highlightingEnabled,
      editorText: text,
    });
  },

  resetToDefaults: () => {
    set({
      patterns: DEFAULT_PATTERNS,
      highlightingEnabled: true,
      editorText: DEFAULT_EDITOR_TEXT,
    });
    saveToStorage({
      patterns: DEFAULT_PATTERNS,
      highlightingEnabled: true,
      editorText: DEFAULT_EDITOR_TEXT,
    });
  },

  validatePattern: (pattern) => {
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
        patterns: stored.patterns ?? DEFAULT_PATTERNS,
        highlightingEnabled: stored.highlightingEnabled ?? true,
        editorText: stored.editorText ?? DEFAULT_EDITOR_TEXT,
      });
    }
  },

  getColorById: (colorId) => {
    return HIGHLIGHT_COLORS.find((c) => c.id === colorId) ?? HIGHLIGHT_COLORS[0];
  },
}));

// Export defaults for use in other components
export const TRACE_HIGHLIGHTING_DEFAULTS = {
  patterns: DEFAULT_PATTERNS,
  editorText: DEFAULT_EDITOR_TEXT,
};
