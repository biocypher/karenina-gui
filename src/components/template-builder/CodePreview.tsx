import { useState, useEffect, useCallback } from 'react';
import { useTemplateBuilderStore } from '../../stores/useTemplateBuilderStore';

export function CodePreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatedCode = useTemplateBuilderStore((s) => s.generatedCode);
  const isDirty = useTemplateBuilderStore((s) => s.isDirty);
  const isLoading = useTemplateBuilderStore((s) => s.isLoading);
  const generateCode = useTemplateBuilderStore((s) => s.generateCode);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // When the panel opens and the code is stale, regenerate automatically
  useEffect(() => {
    if (isOpen && isDirty) {
      generateCode();
    }
  }, [isOpen, isDirty, generateCode]);

  const handleCopy = useCallback(async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedCode]);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-900 hover:bg-gray-800/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{isOpen ? '\u25BC' : '\u25B6'}</span>
          <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Generated Code</span>
          {isDirty && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">stale</span>}
        </div>
        {isOpen && generatedCode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </button>

      {/* Collapsible code panel */}
      {isOpen && (
        <div className="bg-gray-900 border-t border-gray-700">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Generating code...</div>
          ) : generatedCode ? (
            <pre className="px-4 py-3 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre leading-relaxed max-h-[500px] overflow-y-auto">
              {generatedCode}
            </pre>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No code generated yet. Add fields to your template to see the generated Python code.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
