import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useTraceHighlightingStore, TRACE_HIGHLIGHTING_DEFAULTS } from '../stores/useTraceHighlightingStore';
import { TraceHighlightPreview, PREVIEW_SAMPLE_TEXT } from './TraceHighlightPreview';

/**
 * TraceHighlightingTab - Configuration tab for trace message highlighting settings.
 */
export const TraceHighlightingTab: React.FC = () => {
  const {
    aiMessagePattern,
    toolMessagePattern,
    highlightingEnabled,
    setAiMessagePattern,
    setToolMessagePattern,
    setHighlightingEnabled,
    resetToDefaults,
    validatePattern,
  } = useTraceHighlightingStore();

  // Local state for pattern inputs with validation
  const [localAiPattern, setLocalAiPattern] = useState(aiMessagePattern);
  const [localToolPattern, setLocalToolPattern] = useState(toolMessagePattern);
  const [aiPatternError, setAiPatternError] = useState<string | null>(null);
  const [toolPatternError, setToolPatternError] = useState<string | null>(null);

  // Sync local state when store changes (e.g., after reset)
  useEffect(() => {
    setLocalAiPattern(aiMessagePattern);
    setLocalToolPattern(toolMessagePattern);
  }, [aiMessagePattern, toolMessagePattern]);

  const handleAiPatternChange = (value: string) => {
    setLocalAiPattern(value);
    const result = validatePattern(value);
    setAiPatternError(result.error);
    if (result.valid) {
      setAiMessagePattern(value);
    }
  };

  const handleToolPatternChange = (value: string) => {
    setLocalToolPattern(value);
    const result = validatePattern(value);
    setToolPatternError(result.error);
    if (result.valid) {
      setToolMessagePattern(value);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalAiPattern(TRACE_HIGHLIGHTING_DEFAULTS.aiMessagePattern);
    setLocalToolPattern(TRACE_HIGHLIGHTING_DEFAULTS.toolMessagePattern);
    setAiPatternError(null);
    setToolPatternError(null);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Trace Highlighting</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Highlight AI and Tool message headers in trace views
          </p>
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

      {/* AI Message Pattern */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          AI Message Header Pattern (Regex)
        </label>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-800/60 flex-shrink-0" title="Green highlight" />
          <input
            type="text"
            value={localAiPattern}
            onChange={(e) => handleAiPatternChange(e.target.value)}
            placeholder="e.g., --- AI Message ---"
            className={`flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-700
                       text-gray-900 dark:text-white focus:outline-none focus:ring-2
                       focus:ring-blue-500 font-mono text-sm
                       ${aiPatternError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
          />
        </div>
        {aiPatternError && (
          <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            {aiPatternError}
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Matches AI message headers (highlighted in green)
        </p>
      </div>

      {/* Tool Message Pattern */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tool Message Header Pattern (Regex)
        </label>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-200 dark:bg-yellow-800/60 flex-shrink-0" title="Yellow highlight" />
          <input
            type="text"
            value={localToolPattern}
            onChange={(e) => handleToolPatternChange(e.target.value)}
            placeholder="e.g., --- Tool Message \(call_id: .+\) ---"
            className={`flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-700
                       text-gray-900 dark:text-white focus:outline-none focus:ring-2
                       focus:ring-blue-500 font-mono text-sm
                       ${toolPatternError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
          />
        </div>
        {toolPatternError && (
          <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            {toolPatternError}
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Matches Tool message headers (highlighted in yellow)
        </p>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400
                     hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Preview Section */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600">
          <TraceHighlightPreview
            text={PREVIEW_SAMPLE_TEXT}
            aiPattern={aiPatternError ? '' : localAiPattern}
            toolPattern={toolPatternError ? '' : localToolPattern}
            enabled={highlightingEnabled}
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
        <p className="font-medium mb-1">About Trace Highlighting</p>
        <p>
          These patterns identify message headers in LLM traces. Only the matched header text will be highlighted, not
          the message content below it. The patterns use JavaScript regex syntax.
        </p>
      </div>
    </div>
  );
};
