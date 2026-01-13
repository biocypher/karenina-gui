import React from 'react';
import type { VerificationResult } from '../../../types';

interface DeepJudgmentRubricResultsProps {
  deepJudgmentRubric: NonNullable<VerificationResult['deep_judgment_rubric']>;
}

export const DeepJudgmentRubricResults: React.FC<DeepJudgmentRubricResultsProps> = ({ deepJudgmentRubric }) => {
  const getRiskStyle = (risk: string) => {
    switch (risk) {
      case 'high':
        return {
          bg: 'bg-red-100 dark:bg-red-900/40',
          text: 'text-red-800 dark:text-red-200',
          border: 'border-red-300 dark:border-red-700',
        };
      case 'medium':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/40',
          text: 'text-orange-800 dark:text-orange-200',
          border: 'border-orange-300 dark:border-orange-700',
        };
      case 'low':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/40',
          text: 'text-yellow-800 dark:text-yellow-200',
          border: 'border-yellow-300 dark:border-yellow-700',
        };
      case 'none':
      default:
        return {
          bg: 'bg-green-100 dark:bg-green-900/40',
          text: 'text-green-800 dark:text-green-200',
          border: 'border-green-300 dark:border-green-700',
        };
    }
  };

  return (
    <div className="space-y-3">
      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
        <div>
          <h5 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">Traits Evaluated:</h5>
          <p className="text-indigo-900 dark:text-indigo-100 text-sm font-semibold">
            {deepJudgmentRubric.total_traits_evaluated || 0}
          </p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">Model Calls:</h5>
          <p className="text-indigo-900 dark:text-indigo-100 text-sm font-semibold">
            {deepJudgmentRubric.total_deep_judgment_model_calls || 0}
          </p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">Excerpt Retries:</h5>
          <p className="text-indigo-900 dark:text-indigo-100 text-sm font-semibold">
            {deepJudgmentRubric.total_excerpt_retries || 0}
          </p>
        </div>
      </div>

      {/* Per-Trait Results */}
      {deepJudgmentRubric.deep_judgment_rubric_scores &&
        Object.keys(deepJudgmentRubric.deep_judgment_rubric_scores).length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trait Evaluations:</h5>
            <div className="space-y-3">
              {Object.entries(deepJudgmentRubric.deep_judgment_rubric_scores).map(([traitName, score]) => {
                const reasoning = deepJudgmentRubric?.rubric_trait_reasoning?.[traitName];
                const excerpts = deepJudgmentRubric?.extracted_rubric_excerpts?.[traitName];
                const metadata = deepJudgmentRubric?.trait_metadata?.[traitName];
                const riskAssessment = deepJudgmentRubric?.rubric_hallucination_risk_assessment?.[traitName];

                return (
                  <div
                    key={traitName}
                    className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4"
                  >
                    {/* Trait Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-indigo-900 dark:text-indigo-100">{traitName}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
                          Score: {typeof score === 'boolean' ? (score ? '✓' : '✗') : score}
                        </span>
                      </div>
                      {riskAssessment?.overall_risk && (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                            getRiskStyle(riskAssessment.overall_risk).bg
                          } ${getRiskStyle(riskAssessment.overall_risk).text} border ${getRiskStyle(riskAssessment.overall_risk).border}`}
                        >
                          Risk: {riskAssessment.overall_risk.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Reasoning */}
                    {reasoning && (
                      <div className="mb-3">
                        <h6 className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1 uppercase tracking-wide">
                          Reasoning:
                        </h6>
                        <div className="bg-white dark:bg-slate-800 rounded p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {reasoning}
                        </div>
                      </div>
                    )}

                    {/* Excerpts */}
                    {excerpts && excerpts.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wide">
                          Extracted Excerpts ({excerpts.length}):
                        </h6>
                        <div className="space-y-2">
                          {excerpts.map((excerpt, idx) => (
                            <div
                              key={idx}
                              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                  Excerpt {idx + 1}
                                </span>
                                <div className="flex gap-2">
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                    {excerpt.confidence}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                    sim: {excerpt.similarity_score.toFixed(2)}
                                  </span>
                                  {excerpt.hallucination_risk && (
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        getRiskStyle(excerpt.hallucination_risk).bg
                                      } ${getRiskStyle(excerpt.hallucination_risk).text}`}
                                    >
                                      {excerpt.hallucination_risk}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{excerpt.text}</p>
                              {excerpt.hallucination_justification && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                                  {excerpt.hallucination_justification}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {metadata && (
                      <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Model Calls:</span>{' '}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {metadata.model_calls}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Retries:</span>{' '}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {metadata.excerpt_retry_count}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-600 dark:text-slate-400">Stages:</span>{' '}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {metadata.stages_completed.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Traits Without Valid Excerpts Warning */}
      {deepJudgmentRubric.traits_without_valid_excerpts &&
        deepJudgmentRubric.traits_without_valid_excerpts.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
            <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Traits Without Valid Excerpts ({deepJudgmentRubric.traits_without_valid_excerpts.length})
            </h5>
            <div className="flex flex-wrap gap-2">
              {deepJudgmentRubric.traits_without_valid_excerpts.map((trait) => (
                <span
                  key={trait}
                  className="px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200"
                >
                  {trait}
                </span>
              ))}
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
              These traits failed excerpt extraction and may have been auto-failed or evaluated without evidence.
            </p>
          </div>
        )}
    </div>
  );
};
