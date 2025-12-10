import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown, Eye, Edit3 } from 'lucide-react';
import {
  useTraceHighlightingStore,
  TRACE_HIGHLIGHTING_DEFAULTS,
  HIGHLIGHT_COLORS,
  HighlightPattern,
  HighlightColorId,
} from '../stores/useTraceHighlightingStore';
import { TraceHighlightPreview } from './TraceHighlightPreview';

interface PatternRowProps {
  pattern: HighlightPattern;
  index: number;
  totalCount: number;
  onUpdate: (id: string, updates: Partial<Omit<HighlightPattern, 'id'>>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  validatePattern: (pattern: string) => { valid: boolean; error: string | null };
}

/**
 * Single pattern row component with inline editing
 */
const PatternRow: React.FC<PatternRowProps> = ({
  pattern,
  index,
  totalCount,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  validatePattern,
}) => {
  const [localPattern, setLocalPattern] = useState(pattern.pattern);
  const [localName, setLocalName] = useState(pattern.name);
  const [patternError, setPatternError] = useState<string | null>(null);

  // Sync local state when pattern changes externally (e.g., reset)
  useEffect(() => {
    setLocalPattern(pattern.pattern);
    setLocalName(pattern.name);
    setPatternError(null);
  }, [pattern.pattern, pattern.name]);

  const handlePatternChange = (value: string) => {
    setLocalPattern(value);
    const result = validatePattern(value);
    setPatternError(result.error);
    if (result.valid) {
      onUpdate(pattern.id, { pattern: value });
    }
  };

  const handleNameChange = (value: string) => {
    setLocalName(value);
    onUpdate(pattern.id, { name: value });
  };

  const handleColorChange = (colorId: HighlightColorId) => {
    onUpdate(pattern.id, { colorId });
  };

  const handleEnabledChange = (enabled: boolean) => {
    onUpdate(pattern.id, { enabled });
  };

  const color = HIGHLIGHT_COLORS.find((c) => c.id === pattern.colorId) ?? HIGHLIGHT_COLORS[0];

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
      {/* Header row: name, color, enabled, remove */}
      <div className="flex items-center gap-2">
        {/* Name input */}
        <input
          type="text"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Pattern name"
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium"
        />

        {/* Color selector */}
        <div className="relative">
          <select
            value={pattern.colorId}
            onChange={(e) => handleColorChange(e.target.value as HighlightColorId)}
            className="appearance-none pl-6 pr-8 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
          >
            {HIGHLIGHT_COLORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {/* Color preview dot */}
          <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${color.preview}`} />
        </div>

        {/* Enabled toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={pattern.enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2
                       peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer
                       dark:bg-gray-600 peer-checked:after:translate-x-full
                       peer-checked:after:border-white after:content-[''] after:absolute
                       after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300
                       after:border after:rounded-full after:h-4 after:w-4 after:transition-all
                       dark:border-gray-500 peer-checked:bg-blue-600"
          ></div>
        </label>

        {/* Reorder buttons */}
        <div className="flex items-center">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(pattern.id)}
          className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400"
          title="Remove pattern"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Pattern regex input */}
      <div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded flex-shrink-0 ${color.preview}`} />
          <input
            type="text"
            value={localPattern}
            onChange={(e) => handlePatternChange(e.target.value)}
            placeholder="Regex pattern (e.g., --- AI Message ---)"
            className={`flex-1 px-3 py-1.5 border rounded-md bg-white dark:bg-gray-700
                       text-gray-900 dark:text-white focus:outline-none focus:ring-2
                       focus:ring-blue-500 font-mono text-sm
                       ${patternError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
          />
        </div>
        {patternError && (
          <div className="flex items-center gap-1 mt-1 ml-5 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            {patternError}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * TraceHighlightingTab - Configuration tab for trace message highlighting settings.
 * Features Editor/Preview sub-tabs for testing patterns.
 */
export const TraceHighlightingTab: React.FC = () => {
  const {
    patterns,
    highlightingEnabled,
    editorText,
    addPattern,
    updatePattern,
    removePattern,
    reorderPatterns,
    setHighlightingEnabled,
    setEditorText,
    resetToDefaults,
    validatePattern,
  } = useTraceHighlightingStore();

  // Sub-tab state: 'editor' or 'preview'
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const handleAddPattern = () => {
    // Find a color not yet used, or default to first
    const usedColors = patterns.map((p) => p.colorId);
    const availableColor = HIGHLIGHT_COLORS.find((c) => !usedColors.includes(c.id))?.id ?? 'green';

    addPattern({
      name: `Pattern ${patterns.length + 1}`,
      pattern: '',
      colorId: availableColor,
      enabled: true,
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPatterns = [...patterns];
    [newPatterns[index - 1], newPatterns[index]] = [newPatterns[index], newPatterns[index - 1]];
    reorderPatterns(newPatterns);
  };

  const handleMoveDown = (index: number) => {
    if (index === patterns.length - 1) return;
    const newPatterns = [...patterns];
    [newPatterns[index], newPatterns[index + 1]] = [newPatterns[index + 1], newPatterns[index]];
    reorderPatterns(newPatterns);
  };

  const handleReset = () => {
    resetToDefaults();
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Trace Highlighting</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Highlight message headers in trace views</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={highlightingEnabled}
            onChange={(e) => setHighlightingEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4
                       peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer
                       dark:bg-gray-600 peer-checked:after:translate-x-full
                       peer-checked:after:border-white after:content-[''] after:absolute
                       after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300
                       after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                       dark:border-gray-500 peer-checked:bg-blue-600"
          ></div>
        </label>
      </div>

      {/* Patterns Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Highlight Patterns</h4>
          <button
            onClick={handleAddPattern}
            className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Pattern
          </button>
        </div>

        {/* Pattern list */}
        <div className="space-y-2">
          {patterns.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              No patterns defined. Click "Add Pattern" to create one.
            </div>
          ) : (
            patterns.map((pattern, index) => (
              <PatternRow
                key={pattern.id}
                pattern={pattern}
                index={index}
                totalCount={patterns.length}
                onUpdate={updatePattern}
                onRemove={removePattern}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                validatePattern={validatePattern}
              />
            ))
          )}
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-400
                     hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Editor/Preview Tabs */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
        {/* Tab buttons */}
        <div className="flex border-b border-gray-200 dark:border-gray-600 mb-3">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'editor'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'editor' ? (
          <div className="space-y-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400">
              Enter test text to check your patterns:
            </label>
            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder="Paste or type sample trace text here..."
              className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={() => setEditorText(TRACE_HIGHLIGHTING_DEFAULTS.editorText)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Load sample text
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400">Preview with highlighting applied:</label>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600">
              <TraceHighlightPreview text={editorText} patterns={patterns} enabled={highlightingEnabled} />
            </div>
            {/* Pattern legend */}
            {patterns.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {patterns
                  .filter((p) => p.enabled && p.pattern.trim())
                  .map((p) => {
                    const color = HIGHLIGHT_COLORS.find((c) => c.id === p.colorId) ?? HIGHLIGHT_COLORS[0];
                    return (
                      <div key={p.id} className="flex items-center gap-1 text-xs">
                        <div className={`w-3 h-3 rounded ${color.preview}`} />
                        <span className="text-gray-600 dark:text-gray-400">{p.name}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
        <p className="font-medium mb-1">About Trace Highlighting</p>
        <p>
          Define regex patterns to identify message headers in LLM traces. Each pattern can have a custom name and
          color. Only the matched text will be highlighted. Patterns are matched in order from top to bottom.
        </p>
      </div>
    </div>
  );
};
