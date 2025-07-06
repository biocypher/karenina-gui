import React from 'react';
import { Rubric } from '../types';

interface RubricResultsDisplayProps {
  rubricResults: Record<string, number | boolean> | undefined;
  currentRubric?: Rubric;
  evaluationRubric?: Rubric; // The merged rubric that was actually used for evaluation
  className?: string;
}

export const RubricResultsDisplay: React.FC<RubricResultsDisplayProps> = ({
  rubricResults,
  currentRubric,
  evaluationRubric,
  className = '',
}) => {
  if (!rubricResults) {
    return (
      <div className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-3 ${className}`}>
        <p className="text-slate-500 dark:text-slate-400 text-sm">No rubric evaluation performed</p>
      </div>
    );
  }

  const traits = Object.entries(rubricResults);

  if (traits.length === 0) {
    return (
      <div className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-3 ${className}`}>
        <p className="text-slate-500 dark:text-slate-400 text-sm">No rubric traits evaluated</p>
      </div>
    );
  }

  const passedTraits = traits.filter(([, value]) => (typeof value === 'boolean' ? value : value && value >= 3)).length;
  const totalTraits = traits.length;
  const successRate = passedTraits / totalTraits;

  // Get trait descriptions and source info from the rubric that was actually used for evaluation
  const getTraitInfo = (traitName: string): { description?: string; isQuestionSpecific?: boolean } => {
    // Prioritize evaluationRubric (the merged rubric that was actually used)
    const rubricToUse = evaluationRubric || currentRubric;
    if (!rubricToUse) return {};

    const trait = rubricToUse.traits.find((t) => t.name === traitName);
    if (!trait) return {};

    // Determine if this trait is question-specific by checking if it exists in currentRubric
    // If evaluationRubric has it but currentRubric doesn't, it's question-specific
    let isQuestionSpecific = false;
    if (evaluationRubric && currentRubric) {
      const existsInGlobal = currentRubric.traits.some((t) => t.name === traitName);
      isQuestionSpecific = !existsInGlobal;
    }

    return {
      description: trait.description,
      isQuestionSpecific,
    };
  };

  return (
    <div className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-4 ${className}`}>
      {/* Summary Header */}
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Rubric Evaluation Results</h5>
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            successRate >= 0.5
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
          }`}
        >
          {passedTraits}/{totalTraits} passed
        </span>
      </div>

      {/* Individual Trait Results */}
      <div className="space-y-2">
        {traits.map(([name, value]) => {
          const isPassed = typeof value === 'boolean' ? value : value && value >= 3;
          const { description, isQuestionSpecific } = getTraitInfo(name);

          return (
            <div key={name} className="flex flex-col space-y-1">
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-2 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{name}</span>
                    {isQuestionSpecific && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                        Q-specific
                      </span>
                    )}
                  </div>
                  {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
                </div>
                <span
                  className={`font-semibold text-sm ml-3 ${
                    isPassed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value || 'N/A'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
