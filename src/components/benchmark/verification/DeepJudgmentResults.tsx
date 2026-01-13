import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SearchResultsDisplay } from '../../SearchResultsDisplay';
import type { VerificationResult } from '../../../types';

interface DeepJudgmentResultsProps {
  deepJudgment: NonNullable<VerificationResult['deep_judgment']>;
}

export const DeepJudgmentResults: React.FC<DeepJudgmentResultsProps> = ({ deepJudgment }) => {
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
      <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stages Completed:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">
            {deepJudgment.deep_judgment_stages_completed?.join(', ') || 'N/A'}
          </p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model Calls:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">{deepJudgment.deep_judgment_model_calls || 0}</p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Excerpt Retries:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">
            {deepJudgment.deep_judgment_excerpt_retry_count || 0}
          </p>
        </div>
      </div>

      {/* Extracted Excerpts */}
      {deepJudgment.extracted_excerpts && Object.keys(deepJudgment.extracted_excerpts).length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Extracted Excerpts:</h5>
          <div className="space-y-2">
            {Object.entries(deepJudgment.extracted_excerpts).map(([attributeName, excerpts]) => {
              const riskLevel = deepJudgment?.hallucination_risk_assessment?.[attributeName];

              return (
                <div
                  key={attributeName}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-blue-900 dark:text-blue-100">{attributeName}</div>
                    {riskLevel && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                          getRiskStyle(riskLevel).bg
                        } ${getRiskStyle(riskLevel).text} border ${getRiskStyle(riskLevel).border}`}
                      >
                        Max Hallucination Risk: {riskLevel.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {excerpts.map((excerpt, idx) => (
                      <div
                        key={idx}
                        className={`rounded p-2 border ${
                          excerpt.explanation
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                            : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900'
                        }`}
                      >
                        {excerpt.explanation ? (
                          <div>
                            <p className="text-amber-800 dark:text-amber-200 text-sm font-medium mb-1">
                              No excerpt found
                            </p>
                            <p className="text-amber-700 dark:text-amber-300 text-sm italic">{excerpt.explanation}</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-slate-800 dark:text-slate-200 text-sm mb-1">"{excerpt.text}"</p>
                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                              <span>Extraction confidence: {excerpt.confidence}</span>
                              <span>
                                {excerpt.similarity_score === 1
                                  ? 'Verbatim match'
                                  : `Fuzzy match (${excerpt.similarity_score.toFixed(3)})`}
                              </span>
                            </div>
                            {excerpt.search_results && (
                              <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                                <SearchResultsDisplay searchResults={excerpt.search_results} />
                              </div>
                            )}
                            {excerpt.hallucination_justification && (
                              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Hallucination Risk Reasoning:
                                  </p>
                                  {excerpt.hallucination_risk && (
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs border ${
                                        excerpt.hallucination_risk === 'high'
                                          ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
                                          : excerpt.hallucination_risk === 'medium'
                                            ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700'
                                            : excerpt.hallucination_risk === 'low'
                                              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                                              : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                                      }`}
                                    >
                                      Risk: {excerpt.hallucination_risk.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {excerpt.hallucination_justification}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attribute Reasoning */}
      {deepJudgment.attribute_reasoning && Object.keys(deepJudgment.attribute_reasoning).length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Attribute Reasoning:</h5>
          <div className="space-y-2">
            {Object.entries(deepJudgment.attribute_reasoning).map(([attributeName, reasoning]) => (
              <div
                key={attributeName}
                className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3"
              >
                <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">{attributeName}</div>
                <p className="text-slate-800 dark:text-slate-200 text-sm">{reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attributes Without Excerpts */}
      {deepJudgment.attributes_without_excerpts && deepJudgment.attributes_without_excerpts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Attributes Without Excerpts</span>
          </div>
          <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">
            The following attributes could not be supported with verbatim excerpts from the raw response:
          </p>
          <div className="flex flex-wrap gap-2">
            {deepJudgment.attributes_without_excerpts.map((attrName) => (
              <span
                key={attrName}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
              >
                {attrName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {(!deepJudgment.extracted_excerpts || Object.keys(deepJudgment.extracted_excerpts).length === 0) &&
        (!deepJudgment.attribute_reasoning || Object.keys(deepJudgment.attribute_reasoning).length === 0) &&
        (!deepJudgment.attributes_without_excerpts || deepJudgment.attributes_without_excerpts.length === 0) && (
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Deep-judgment was performed but no data was generated.
            </p>
          </div>
        )}
    </div>
  );
};
