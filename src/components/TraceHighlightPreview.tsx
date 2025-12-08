import React, { useMemo } from 'react';

interface TraceHighlightPreviewProps {
  text: string;
  aiPattern: string;
  toolPattern: string;
  enabled: boolean;
}

/**
 * Lightweight preview component for trace highlighting configuration.
 * Displays sample trace text with header highlighting applied.
 */
export const TraceHighlightPreview: React.FC<TraceHighlightPreviewProps> = ({
  text,
  aiPattern,
  toolPattern,
  enabled,
}) => {
  const highlightedContent = useMemo(() => {
    // If disabled or no patterns, render plain text
    if (!enabled || (!aiPattern && !toolPattern)) {
      return <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{text}</pre>;
    }

    // Build regex patterns
    const patterns: { pattern: string; type: 'ai' | 'tool' }[] = [];
    if (aiPattern.trim()) {
      patterns.push({ pattern: aiPattern, type: 'ai' });
    }
    if (toolPattern.trim()) {
      patterns.push({ pattern: toolPattern, type: 'tool' });
    }

    if (patterns.length === 0) {
      return <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{text}</pre>;
    }

    try {
      // Combine patterns with alternation, wrapping each in a capture group
      const combinedPattern = patterns.map((p) => `(${p.pattern})`).join('|');
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

        // Determine which pattern matched (AI is group 1, Tool is group 2)
        const isAI = match[1] !== undefined;
        const bgClass = isAI ? 'bg-green-200 dark:bg-green-800/60' : 'bg-yellow-200 dark:bg-yellow-800/60';

        // Add highlighted match
        segments.push(
          <span key={key++} className={`${bgClass} px-0.5 rounded`}>
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
  }, [text, aiPattern, toolPattern, enabled]);

  return highlightedContent;
};

// Sample text for preview in configuration modal
export const PREVIEW_SAMPLE_TEXT = `--- AI Message ---
Hello, I can help you with that task. Let me search for the information you need.

--- Tool Message (call_id: call_abc123def456) ---
{"informationForTargetByEnsemblId": "query informationForTargetByEnsemblId {\\n  target(ensemblId: \\"ENSG00000169083\\") {\\n    id\\n    approvedSymbol\\n  }\\n}"}

--- AI Message ---
Based on the tool result, the target with Ensembl ID ENSG00000169083 has the approved symbol AR. This is the final answer.`;
