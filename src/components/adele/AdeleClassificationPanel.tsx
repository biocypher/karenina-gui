/**
 * AdeleClassificationPanel - Per-question ADeLe classification display and trigger.
 *
 * Shows existing classification results or allows triggering new classification.
 * Displays scores in a compact grid format.
 */

import React, { useState, useCallback } from 'react';
import { Brain, RefreshCw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { adeleApi } from '../../services/adeleApi';
import { AdeleScoreBadge } from './AdeleScoreBadge';
import type { ClassificationResult } from '../../types/adele';
import { getAdeleClassification } from '../../types/adele';

interface AdeleClassificationPanelProps {
  /** Question ID */
  questionId: string;
  /** Question text for classification */
  questionText: string;
  /** Custom metadata from the question (may contain classification) */
  customMetadata?: Record<string, unknown>;
  /** Callback when classification is updated */
  onClassificationUpdate?: (questionId: string, classification: ClassificationResult) => void;
  /** Whether to disable interaction */
  disabled?: boolean;
}

export const AdeleClassificationPanel: React.FC<AdeleClassificationPanelProps> = ({
  questionId,
  questionText,
  customMetadata,
  onClassificationUpdate,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localClassification, setLocalClassification] = useState<ClassificationResult | null>(null);

  // Get existing classification from metadata or local state
  const existingClassification = getAdeleClassification(customMetadata);
  const classification =
    localClassification ||
    (existingClassification
      ? {
          questionId,
          questionText,
          scores: existingClassification.scores,
          labels: existingClassification.labels,
          model: existingClassification.model,
          classifiedAt: existingClassification.classifiedAt,
        }
      : null);

  const hasClassification = classification !== null;
  const traitCount = hasClassification ? Object.keys(classification.scores).length : 0;

  // Get sorted trait names for consistent display
  const sortedTraitNames = hasClassification ? Object.keys(classification.scores).sort() : [];

  const handleClassify = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await adeleApi.classifySingle(questionText, undefined, questionId);
      setLocalClassification(result);
      onClassificationUpdate?.(questionId, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Classification failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [questionId, questionText, disabled, isLoading, onClassificationUpdate]);

  // Calculate average score for summary
  const averageScore = hasClassification
    ? Object.values(classification.scores)
        .filter((s) => s >= 0)
        .reduce((a, b) => a + b, 0) / Object.values(classification.scores).filter((s) => s >= 0).length
    : 0;

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          ADeLe Classification
        </h3>
        <button
          onClick={handleClassify}
          disabled={disabled || isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 hover:from-purple-200 hover:to-indigo-200 border border-purple-200 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 dark:from-purple-900/50 dark:to-indigo-900/50 dark:text-purple-300 dark:border-purple-700 dark:hover:from-purple-900/70 dark:hover:to-indigo-900/70"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Classifying...
            </>
          ) : hasClassification ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Re-classify
            </>
          ) : (
            <>
              <Brain className="w-3.5 h-3.5" />
              Classify
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {hasClassification ? (
        <>
          {/* Summary row */}
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-3">
            <span>
              {traitCount} traits classified | Avg: {averageScore.toFixed(1)}
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Expand
                </>
              )}
            </button>
          </div>

          {/* Compact score grid (always visible) */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sortedTraitNames.slice(0, isExpanded ? undefined : 6).map((traitName) => (
              <AdeleScoreBadge
                key={traitName}
                traitName={traitName}
                score={classification.scores[traitName]}
                label={classification.labels[traitName]}
                compact
              />
            ))}
            {!isExpanded && sortedTraitNames.length > 6 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                +{sortedTraitNames.length - 6} more
              </span>
            )}
          </div>

          {/* Expanded detailed view */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedTraitNames.map((traitName) => (
                  <AdeleScoreBadge
                    key={traitName}
                    traitName={traitName}
                    score={classification.scores[traitName]}
                    label={classification.labels[traitName]}
                    showName
                  />
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                Classified: {new Date(classification.classifiedAt).toLocaleString()} | Model: {classification.model}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-slate-500 dark:text-slate-400 italic">
          No classification yet. Click "Classify" to analyze this question using ADeLe dimensions.
        </div>
      )}
    </div>
  );
};

export default AdeleClassificationPanel;
