import { useEffect, useState, useRef } from 'react';
import { useTemplateBuilderStore } from '../../stores/useTemplateBuilderStore';
import { FieldList } from './FieldList';
import { VerifiedFieldEditor } from './VerifiedFieldEditor';
import { CompositionRuleBuilder } from './CompositionRuleBuilder';
import { ValidationModal } from './ValidationModal';
import { InfoTooltip } from './InfoTooltip';

interface TemplateBuilderProps {
  code: string;
  onChange: (code: string) => void;
  onClose?: () => void;
}

export function TemplateBuilder({ code, onChange, onClose }: TemplateBuilderProps) {
  const [showValidation, setShowValidation] = useState(false);
  const prevCodeRef = useRef<string | null>(null);

  const { parseCode, fetchPrimitives, generatedCode, isLoading, lastError } = useTemplateBuilderStore();

  // Parse code on mount and whenever it changes externally (e.g., question navigation).
  // Skip re-parsing when the change comes from our own generated code propagating back.
  useEffect(() => {
    if (code && code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      const currentGenerated = useTemplateBuilderStore.getState().generatedCode;
      if (code !== currentGenerated) {
        parseCode(code);
      }
    }
  }, [code, parseCode]);

  useEffect(() => {
    fetchPrimitives();
  }, [fetchPrimitives]);

  // Propagate generated code back to parent when it updates
  useEffect(() => {
    if (generatedCode) {
      onChange(generatedCode);
    }
  }, [generatedCode, onChange]);

  const handleValidateClick = () => {
    setShowValidation(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-800">
        <div className="ml-auto flex items-center gap-2">
          {lastError && (
            <span className="text-xs text-red-400 truncate max-w-[200px]" title={lastError}>
              {lastError}
            </span>
          )}

          {isLoading && <span className="text-xs text-gray-500 animate-pulse">Loading...</span>}

          <span className="inline-flex items-center gap-1">
            <button
              onClick={handleValidateClick}
              className="px-3 py-1.5 text-sm font-medium rounded
                         bg-emerald-600 hover:bg-emerald-500 text-white
                         transition-colors"
            >
              Validate
            </button>
            <InfoTooltip text="Check that the template is well-formed: valid field types, ground truth matches types, and verification primitives are compatible." />
          </span>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column: field list, composition rule (resizable) */}
        <div className="w-1/4 min-w-[200px] max-w-[40%] resize-x overflow-y-auto border-r border-gray-700 p-4 gap-4 flex flex-col">
          <FieldList />
          <CompositionRuleBuilder />
        </div>

        {/* Right column: field editor */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4">
          <VerifiedFieldEditor />
        </div>
      </div>

      {/* Validation modal */}
      <ValidationModal isOpen={showValidation} onClose={() => setShowValidation(false)} />
    </div>
  );
}
