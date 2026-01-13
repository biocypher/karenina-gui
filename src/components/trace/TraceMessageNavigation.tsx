import React from 'react';
import { MessageSquare, FileText, Settings } from 'lucide-react';
import type { MessageBlock } from './useTraceMessageBlocks';
import type { HighlightPattern, HighlightColorId } from '../../stores/useTraceHighlightingStore';

// ============================================================================
// Props
// ============================================================================

export interface TraceMessageNavigationProps {
  activePatterns: HighlightPattern[];
  messageBlocks: MessageBlock[];
  showFinalOnly: string | null;
  onToggleFinalOnly: (patternId: string) => void;
  onScrollToMessage: (index: number) => void;
  onOpenConfig: () => void;
  getColorClasses: (colorId: HighlightColorId) => { bg: string; text: string; border: string };
}

// ============================================================================
// Component
// ============================================================================

export const TraceMessageNavigation: React.FC<TraceMessageNavigationProps> = ({
  activePatterns,
  messageBlocks,
  showFinalOnly,
  onToggleFinalOnly,
  onScrollToMessage,
  onOpenConfig,
  getColorClasses,
}) => {
  if (messageBlocks.length === 0) {
    return null;
  }

  // Get the first pattern that has matches (for default "Final Response" button)
  const firstMatchedPattern = activePatterns.find((p) => messageBlocks.some((b) => b.patternId === p.id));

  return (
    <>
      {/* Final Response Toggle Button */}
      {firstMatchedPattern && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFinalOnly(firstMatchedPattern.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showFinalOnly
                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {showFinalOnly ? (
              <>
                <FileText className="w-4 h-4" />
                Show Full Trace
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Final {firstMatchedPattern.name}
              </>
            )}
          </button>
          {showFinalOnly && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing last {activePatterns.find((p) => p.id === showFinalOnly)?.name ?? 'message'} only
            </span>
          )}
        </div>
      )}

      {/* Message Navigation Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={onOpenConfig}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
          title="Configure trace highlighting"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">Jump to:</span>
        {(() => {
          // Track count per pattern for numbering
          const countsPerPattern: Record<string, number> = {};
          return messageBlocks.map((block, index) => {
            countsPerPattern[block.patternId] = (countsPerPattern[block.patternId] ?? 0) + 1;
            const num = countsPerPattern[block.patternId];
            const color = getColorClasses(block.colorId);
            return (
              <button
                key={index}
                onClick={() => onScrollToMessage(index)}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors flex-shrink-0 ${color.bg} ${color.text} hover:opacity-80`}
              >
                {block.patternName} {num}
              </button>
            );
          });
        })()}
      </div>
    </>
  );
};
