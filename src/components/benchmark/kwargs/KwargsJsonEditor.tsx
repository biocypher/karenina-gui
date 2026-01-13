import React from 'react';
import { AlertCircle, Code } from 'lucide-react';

// ============================================================================
// JSON Editor Props
// ============================================================================

export interface KwargsJsonEditorProps {
  jsonText: string;
  onJsonChange: (text: string) => void;
  onIndent: () => void;
  jsonError: string | null;
  showExamples: boolean;
  onToggleExamples: () => void;
}

// Example templates
const EXAMPLES = [
  {
    name: 'Google API Key',
    json: JSON.stringify({ google_api_key: 'your-api-key-here' }, null, 2),
  },
  {
    name: 'Anthropic API Key',
    json: JSON.stringify({ anthropic_api_key: 'your-api-key-here', timeout: 60 }, null, 2),
  },
  {
    name: 'Custom Parameters',
    json: JSON.stringify({ custom_param: 'custom_value', seed: 42 }, null, 2),
  },
];

// ============================================================================
// JSON Editor Component
// ============================================================================

export const KwargsJsonEditor: React.FC<KwargsJsonEditorProps> = ({
  jsonText,
  onJsonChange,
  onIndent, // eslint-disable-line @typescript-eslint/no-unused-vars
  jsonError,
  showExamples,
  onToggleExamples,
}) => {
  return (
    <div className="space-y-4">
      {/* Examples Toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">JSON Configuration</label>
        <button
          onClick={onToggleExamples}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
        >
          <Code className="w-4 h-4" />
          <span>{showExamples ? 'Hide' : 'Show'} Examples</span>
        </button>
      </div>

      {/* Examples Dropdown */}
      {showExamples && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {EXAMPLES.map((example) => (
            <button
              key={example.name}
              onClick={() => {
                onJsonChange(example.json);
                onToggleExamples();
              }}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-left"
            >
              {example.name}
            </button>
          ))}
        </div>
      )}

      {/* JSON Editor */}
      <div>
        <textarea
          value={jsonText}
          onChange={(e) => onJsonChange(e.target.value)}
          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          placeholder='{\n  "key": "value"\n}'
          spellCheck={false}
        />
      </div>

      {/* JSON Error */}
      {jsonError && (
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{jsonError}</span>
        </div>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>Use this tab for custom parameters not available in the Common tab. Avoid duplicating keys between tabs.</p>
      </div>
    </div>
  );
};
