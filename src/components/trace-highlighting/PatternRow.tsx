import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { HIGHLIGHT_COLORS, HighlightPattern, HighlightColorId } from '../../stores/useTraceHighlightingStore';

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
 * Single pattern row component with inline editing.
 * Handles pattern name, color selection, enabled toggle, and regex input.
 */
export const PatternRow: React.FC<PatternRowProps> = ({
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
