import React from 'react';
import type { VerificationResult } from '../../../types';

interface MetricTraitConfusionMatrixProps {
  metricTraitConfusionLists: NonNullable<VerificationResult['rubric']>['metric_trait_confusion_lists'];
  metricTraitMetrics: NonNullable<VerificationResult['rubric']>['metric_trait_metrics'];
}

export const MetricTraitConfusionMatrix: React.FC<MetricTraitConfusionMatrixProps> = ({
  metricTraitConfusionLists,
  metricTraitMetrics,
}) => {
  if (!metricTraitConfusionLists || Object.keys(metricTraitConfusionLists).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {Object.entries(metricTraitConfusionLists).map(([traitName, confusionLists]) => (
        <div
          key={traitName}
          className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
        >
          <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
            {traitName}
            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
              Confusion Matrix
            </span>
          </h5>

          {/* Metrics Summary */}
          {metricTraitMetrics?.[traitName] && (
            <div className="mb-3 flex flex-wrap gap-2">
              {Object.entries(metricTraitMetrics[traitName]).map(([metricName, value]) => (
                <span
                  key={metricName}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                >
                  <span className="capitalize">{metricName}:</span>
                  <span className="ml-1 font-semibold">{(value * 100).toFixed(1)}%</span>
                </span>
              ))}
            </div>
          )}

          {/* Extraction Results */}
          <div className="grid grid-cols-2 gap-3">
            {/* Correct Extractions (TP) */}
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h6 className="text-sm font-medium text-green-900 dark:text-green-100">Correct Extractions (TP)</h6>
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                  {confusionLists.tp?.length || 0}
                </span>
              </div>
              {confusionLists.tp && confusionLists.tp.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {confusionLists.tp.map((excerpt, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-1 text-xs bg-white dark:bg-slate-800 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 rounded"
                    >
                      {excerpt}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-green-600 dark:text-green-400 italic">None found</p>
              )}
            </div>

            {/* Incorrect Extractions (FP) */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h6 className="text-sm font-medium text-red-900 dark:text-red-100">Incorrect Extractions (FP)</h6>
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                  {confusionLists.fp?.length || 0}
                </span>
              </div>
              {confusionLists.fp && confusionLists.fp.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {confusionLists.fp.map((excerpt, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-1 text-xs bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded"
                    >
                      {excerpt}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-400 italic">None found</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
