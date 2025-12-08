import React, { useMemo } from 'react';
import { HighlightPattern, HIGHLIGHT_COLORS, HighlightColorId } from '../stores/useTraceHighlightingStore';

interface TraceHighlightPreviewProps {
  text: string;
  patterns: HighlightPattern[];
  enabled: boolean;
}

// Helper to get color classes
const getColorClasses = (colorId: HighlightColorId) => {
  return HIGHLIGHT_COLORS.find((c) => c.id === colorId) ?? HIGHLIGHT_COLORS[0];
};

/**
 * Lightweight preview component for trace highlighting configuration.
 * Displays sample trace text with header highlighting applied using dynamic patterns.
 */
export const TraceHighlightPreview: React.FC<TraceHighlightPreviewProps> = ({ text, patterns, enabled }) => {
  const highlightedContent = useMemo(() => {
    // If disabled or no patterns, render plain text
    if (!enabled || patterns.length === 0) {
      return <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{text}</pre>;
    }

    // Filter to only enabled patterns with non-empty regex
    const activePatterns = patterns.filter((p) => p.enabled && p.pattern.trim());

    if (activePatterns.length === 0) {
      return <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{text}</pre>;
    }

    try {
      // Build combined regex with named capture groups to identify which pattern matched
      // We'll use the index approach since JS regex named groups are tricky
      const combinedPattern = activePatterns.map((p) => `(${p.pattern})`).join('|');
      const regex = new RegExp(combinedPattern, 'g');

      const segments: React.ReactNode[] = [];
      let lastIndex = 0;
      let key = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          segments.push(<span key={key++}>{text.substring(lastIndex, match.index)}</span>);
        }

        // Determine which pattern matched by checking which capture group is defined
        let matchedPatternIndex = 0;
        for (let i = 1; i < match.length; i++) {
          if (match[i] !== undefined) {
            matchedPatternIndex = i - 1;
            break;
          }
        }

        const matchedPattern = activePatterns[matchedPatternIndex];
        const colorClasses = getColorClasses(matchedPattern.colorId);

        // Add highlighted match
        segments.push(
          <span key={key++} className={`${colorClasses.bg} px-0.5 rounded`}>
            {match[0]}
          </span>
        );

        lastIndex = regex.lastIndex;

        // Prevent infinite loop on zero-width matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }

      // Add remaining text after last match
      if (lastIndex < text.length) {
        segments.push(<span key={key++}>{text.substring(lastIndex)}</span>);
      }

      return <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{segments}</pre>;
    } catch {
      // If regex is invalid, render plain text
      return <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{text}</pre>;
    }
  }, [text, patterns, enabled]);

  return highlightedContent;
};

// Sample text for preview in configuration modal (kept for backward compatibility)
export const PREVIEW_SAMPLE_TEXT = `--- AI Message ---
Hello, I can help you with that task. Let me search for the information you need.

--- Tool Message (call_id: call_abc123def456) ---
{"informationForTargetByEnsemblId": "query informationForTargetByEnsemblId {\\n  target(ensemblId: \\"ENSG00000169083\\") {\\n    id\\n    approvedSymbol\\n  }\\n}"}

--- AI Message ---
Based on the tool result, the target with Ensembl ID ENSG00000169083 has the approved symbol AR. This is the final answer.`;
