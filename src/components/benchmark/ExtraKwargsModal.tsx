import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Code } from 'lucide-react';

interface ExtraKwargsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kwargs: Record<string, unknown>) => void;
  initialKwargs?: Record<string, unknown>;
}

const ExtraKwargsModal: React.FC<ExtraKwargsModalProps> = ({ isOpen, onClose, onSave, initialKwargs }) => {
  const [jsonText, setJsonText] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  // Initialize JSON text from initialKwargs when modal opens
  useEffect(() => {
    if (isOpen && initialKwargs) {
      setJsonText(JSON.stringify(initialKwargs, null, 2));
      setError(null);
    } else if (isOpen && !initialKwargs) {
      setJsonText('{}');
      setError(null);
    }
  }, [isOpen, initialKwargs]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    // Clear any previous error when user types
    if (error) {
      setError(null);
    }
  };

  const validateJson = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(jsonText);
      setError(null);
      return parsed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';
      setError(errorMessage);
      return null;
    }
  };

  const handleTest = () => {
    const parsed = validateJson();
    if (parsed !== null) {
      // Show success message briefly
      setError('✓ Valid JSON');
      setTimeout(() => setError(null), 2000);
    }
  };

  const handleSave = () => {
    const parsed = validateJson();
    if (parsed !== null) {
      onSave(parsed as Record<string, unknown>);
    }
    // If validation failed, modal stays open with error shown
  };

  const handleClear = () => {
    setJsonText('{}');
    setError(null);
  };

  const insertExample = (example: string) => {
    setJsonText(example);
    setError(null);
    setShowExamples(false);
  };

  const examples = [
    {
      name: 'Google API Key',
      json: JSON.stringify(
        {
          google_api_key: 'your-api-key-here',
          max_tokens: 4096,
        },
        null,
        2
      ),
    },
    {
      name: 'Anthropic API Key',
      json: JSON.stringify(
        {
          anthropic_api_key: 'your-api-key-here',
          timeout: 60,
        },
        null,
        2
      ),
    },
    {
      name: 'Custom Parameters',
      json: JSON.stringify(
        {
          max_tokens: 2048,
          top_p: 0.9,
          temperature: 0.7,
          custom_param: 'custom_value',
        },
        null,
        2
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Configure Extra Arguments</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Pass custom parameters to the model interface (LangChain, OpenRouter, etc.)
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Examples Toggle */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">JSON Configuration</label>
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
            >
              <Code className="w-4 h-4" />
              <span>{showExamples ? 'Hide' : 'Show'} Examples</span>
            </button>
          </div>

          {/* Examples Dropdown */}
          {showExamples && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {examples.map((example) => (
                <button
                  key={example.name}
                  onClick={() => insertExample(example.json)}
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
              onChange={handleTextChange}
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder='{\n  "key": "value"\n}'
              spellCheck={false}
            />
          </div>

          {/* Error/Success Message */}
          {error && (
            <div
              className={`flex items-center space-x-2 p-3 rounded-lg ${
                error.startsWith('✓')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {error.startsWith('✓') ? (
                <Check className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Tip:</p>
            <p>
              Common use cases: API keys (
              <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">google_api_key</code>,{' '}
              <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">anthropic_api_key</code>), model parameters (
              <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">max_tokens</code>,{' '}
              <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">top_p</code>), or any custom parameters
              supported by your model provider.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <button onClick={handleClear} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium">
            Clear
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTest}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Test
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtraKwargsModal;
