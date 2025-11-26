import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Checkpoint, VerificationResult, Rubric, UsageMetadata } from '../../types';
import { SearchableTextDisplay } from '../SearchableTextDisplay';
import { SearchResultsDisplay } from '../SearchResultsDisplay';
import { RubricResultsDisplay } from '../RubricResultsDisplay';

interface VerificationResultDetailModalProps {
  result: VerificationResult | null;
  checkpoint: Checkpoint;
  currentRubric: Rubric | null;
  onClose: () => void;
}

export const VerificationResultDetailModal: React.FC<VerificationResultDetailModalProps> = ({
  result,
  checkpoint,
  currentRubric,
  onClose,
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Early return if no result
  if (!result) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Detailed Answering Trace</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {(() => {
            try {
              return (
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Completed Without Errors</h4>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        result.metadata.completed_without_errors
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                      }`}
                    >
                      {result.metadata.completed_without_errors ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {result.metadata.completed_without_errors ? 'true' : 'false'}
                    </div>
                    {result.metadata.error && (
                      <p className="text-red-600 dark:text-red-400 mt-2">{result.metadata.error}</p>
                    )}
                  </div>

                  {/* Raw Question */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Raw Question</h4>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <p className="text-slate-800 dark:text-slate-200">{result.metadata.question_text || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Raw Answer (Expected) */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Raw Answer (Expected)</h4>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <p className="text-slate-800 dark:text-slate-200">
                        {result.metadata.raw_answer || checkpoint[result.metadata.question_id]?.raw_answer || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Raw LLM Response (Generated) */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Raw LLM Response (Generated)
                    </h4>
                    <SearchableTextDisplay
                      text={result.template?.raw_llm_response || 'N/A'}
                      className="text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Ground Truth (Expected) */}
                  {result.template?.parsed_gt_response && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Ground Truth (Expected)</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return JSON.stringify(result.template.parsed_gt_response, null, 2);
                            } catch {
                              return String(result.template.parsed_gt_response);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* LLM Extraction (Generated) */}
                  {result.template?.parsed_llm_response && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        LLM Extraction (Generated)
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return JSON.stringify(result.template.parsed_llm_response, null, 2);
                            } catch {
                              return String(result.template.parsed_llm_response);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Regex Ground Truth (Expected) */}
                  {result.template?.regex_validation_details && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Regex Ground Truth (Expected)
                      </h4>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              const regexGroundTruth: Record<string, Record<string, unknown>> = {};
                              Object.entries(result.template.regex_validation_details).forEach(
                                ([fieldName, details]) => {
                                  regexGroundTruth[fieldName] = {
                                    pattern: details.pattern,
                                    expected: details.expected,
                                    match_type: details.match_type,
                                  };
                                }
                              );
                              return JSON.stringify(regexGroundTruth, null, 2);
                            } catch {
                              return String(result.template.regex_validation_details);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Regex Extraction (Generated) */}
                  {result.template?.regex_extraction_results &&
                    Object.keys(result.template.regex_extraction_results).length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                          Regex Extraction (Generated)
                        </h4>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                          <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                            {(() => {
                              try {
                                return JSON.stringify(result.template.regex_extraction_results, null, 2);
                              } catch {
                                return String(result.template.regex_extraction_results);
                              }
                            })()}
                          </pre>
                        </div>
                      </div>
                    )}

                  {/* Verification Results */}
                  {result.template?.verify_result && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Verify Result</h4>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return typeof result.template.verify_result === 'string'
                                ? result.template.verify_result
                                : JSON.stringify(result.template.verify_result, null, 2);
                            } catch {
                              return String(result.template.verify_result);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {result.template?.verify_granular_result && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Granular Verify Result</h4>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return typeof result.template.verify_granular_result === 'string'
                                ? result.template.verify_granular_result
                                : JSON.stringify(result.template.verify_granular_result, null, 2);
                            } catch {
                              return String(result.template.verify_granular_result);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Rubric Evaluation Results */}
                  {(result.rubric?.verify_rubric ||
                    result.rubric?.llm_trait_scores ||
                    result.rubric?.regex_trait_scores ||
                    result.rubric?.callable_trait_scores) && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Rubric Evaluation Results</h4>
                      <RubricResultsDisplay
                        rubricResults={
                          result.rubric.verify_rubric || {
                            ...result.rubric.llm_trait_scores,
                            ...result.rubric.regex_trait_scores,
                            ...result.rubric.callable_trait_scores,
                          }
                        }
                        metricTraitMetrics={result.rubric.metric_trait_scores}
                        currentRubric={currentRubric}
                        evaluationRubric={result.rubric.evaluation_rubric}
                      />
                    </div>
                  )}

                  {/* Metric Trait Confusion Matrix Details */}
                  {result.rubric?.metric_trait_confusion_lists &&
                    Object.keys(result.rubric.metric_trait_confusion_lists).length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                          Metric Trait Confusion Matrix Details
                        </h4>
                        <div className="space-y-4">
                          {Object.entries(result.rubric.metric_trait_confusion_lists).map(
                            ([traitName, confusionLists]) => (
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
                                {result.rubric.metric_trait_metrics?.[traitName] && (
                                  <div className="mb-3 flex flex-wrap gap-2">
                                    {Object.entries(result.rubric.metric_trait_metrics[traitName]).map(
                                      ([metricName, value]) => (
                                        <span
                                          key={metricName}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                                        >
                                          <span className="capitalize">{metricName}:</span>
                                          <span className="ml-1 font-semibold">{(value * 100).toFixed(1)}%</span>
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}

                                {/* Extraction Results */}
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Correct Extractions (TP) */}
                                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h6 className="text-sm font-medium text-green-900 dark:text-green-100">
                                        Correct Extractions (TP)
                                      </h6>
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
                                      <h6 className="text-sm font-medium text-red-900 dark:text-red-100">
                                        Incorrect Extractions (FP)
                                      </h6>
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
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Embedding Check Results */}
                  {result.template?.embedding_check_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Embedding Check Results</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Similarity Score:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.template.embedding_similarity_score?.toFixed(3) || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model Used:</h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.template.embedding_model_used || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {result.template.embedding_override_applied && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                Verification Overridden by Semantic Check
                              </span>
                            </div>
                            <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                              The initial verification failed, but embedding similarity analysis determined the answers
                              are semantically equivalent.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Abstention Detection Results */}
                  {result.template?.abstention_check_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Abstention Detection Results
                      </h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Check Performed:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.template.abstention_check_performed ? 'Yes' : 'No'}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Abstention Detected:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.template.abstention_detected === true
                                ? 'Yes'
                                : result.template.abstention_detected === false
                                  ? 'No'
                                  : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {result.template.abstention_detected && result.template.abstention_override_applied && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                Result Overridden by Abstention Detection
                              </span>
                            </div>
                            <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                              The model refused to answer or abstained from providing a substantive response. The result
                              was marked as abstained regardless of other verification outcomes.
                            </p>
                            {result.template.abstention_reasoning && (
                              <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                                <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                  Detector Reasoning:
                                </h5>
                                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                                  {result.template.abstention_reasoning}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deep-Judgment Results */}
                  {result.deep_judgment?.deep_judgment_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Deep-Judgment Results</h4>
                      <div className="space-y-3">
                        {/* Summary Statistics */}
                        <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Stages Completed:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.deep_judgment.deep_judgment_stages_completed?.join(', ') || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Model Calls:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.deep_judgment.deep_judgment_model_calls || 0}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Excerpt Retries:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.deep_judgment.deep_judgment_excerpt_retry_count || 0}
                            </p>
                          </div>
                        </div>

                        {/* Extracted Excerpts */}
                        {result.deep_judgment.extracted_excerpts &&
                          Object.keys(result.deep_judgment.extracted_excerpts).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Extracted Excerpts:
                              </h5>
                              <div className="space-y-2">
                                {Object.entries(result.deep_judgment.extracted_excerpts).map(
                                  ([attributeName, excerpts]) => {
                                    // Get hallucination risk for this attribute
                                    const riskLevel =
                                      result.deep_judgment?.hallucination_risk_assessment?.[attributeName];
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
                                      <div
                                        key={attributeName}
                                        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="font-medium text-blue-900 dark:text-blue-100">
                                            {attributeName}
                                          </div>
                                          {/* Hallucination Risk Badge */}
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
                                                // Display explanation for missing excerpts
                                                <div>
                                                  <p className="text-amber-800 dark:text-amber-200 text-sm font-medium mb-1">
                                                    No excerpt found
                                                  </p>
                                                  <p className="text-amber-700 dark:text-amber-300 text-sm italic">
                                                    {excerpt.explanation}
                                                  </p>
                                                </div>
                                              ) : (
                                                // Display normal excerpt
                                                <>
                                                  <p className="text-slate-800 dark:text-slate-200 text-sm mb-1">
                                                    "{excerpt.text}"
                                                  </p>
                                                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                                                    <span>Extraction confidence: {excerpt.confidence}</span>
                                                    <span>
                                                      {excerpt.similarity_score === 1
                                                        ? 'Verbatim match'
                                                        : `Fuzzy match (${excerpt.similarity_score.toFixed(3)})`}
                                                    </span>
                                                  </div>
                                                  {/* Search Results (if search was performed) */}
                                                  {excerpt.search_results && (
                                                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                                                      <SearchResultsDisplay searchResults={excerpt.search_results} />
                                                    </div>
                                                  )}
                                                  {/* Hallucination Justification (if available) */}
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
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {/* Attribute Reasoning */}
                        {result.deep_judgment.attribute_reasoning &&
                          Object.keys(result.deep_judgment.attribute_reasoning).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Attribute Reasoning:
                              </h5>
                              <div className="space-y-2">
                                {Object.entries(result.deep_judgment.attribute_reasoning).map(
                                  ([attributeName, reasoning]) => (
                                    <div
                                      key={attributeName}
                                      className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3"
                                    >
                                      <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                                        {attributeName}
                                      </div>
                                      <p className="text-slate-800 dark:text-slate-200 text-sm">{reasoning}</p>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Attributes Without Excerpts */}
                        {result.deep_judgment.attributes_without_excerpts &&
                          result.deep_judgment.attributes_without_excerpts.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                  Attributes Without Excerpts
                                </span>
                              </div>
                              <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">
                                The following attributes could not be supported with verbatim excerpts from the raw
                                response:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {result.deep_judgment.attributes_without_excerpts.map((attrName) => (
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
                        {(!result.deep_judgment.extracted_excerpts ||
                          Object.keys(result.deep_judgment.extracted_excerpts).length === 0) &&
                          (!result.deep_judgment.attribute_reasoning ||
                            Object.keys(result.deep_judgment.attribute_reasoning).length === 0) &&
                          (!result.deep_judgment.attributes_without_excerpts ||
                            result.deep_judgment.attributes_without_excerpts.length === 0) && (
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                              <p className="text-slate-600 dark:text-slate-400 text-sm">
                                Deep-judgment was performed but no data was generated.
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Deep-Judgment Rubric Results */}
                  {result.deep_judgment_rubric?.deep_judgment_rubric_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Deep-Judgment Rubric Results
                      </h4>
                      <div className="space-y-3">
                        {/* Summary Statistics */}
                        <div className="grid grid-cols-3 gap-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                          <div>
                            <h5 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                              Traits Evaluated:
                            </h5>
                            <p className="text-indigo-900 dark:text-indigo-100 text-sm font-semibold">
                              {result.deep_judgment_rubric.total_traits_evaluated || 0}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                              Model Calls:
                            </h5>
                            <p className="text-indigo-900 dark:text-indigo-100 text-sm font-semibold">
                              {result.deep_judgment_rubric.total_deep_judgment_model_calls || 0}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                              Excerpt Retries:
                            </h5>
                            <p className="text-indigo-900 dark:text-indigo-100 text-sm font-semibold">
                              {result.deep_judgment_rubric.total_excerpt_retries || 0}
                            </p>
                          </div>
                        </div>

                        {/* Per-Trait Results */}
                        {result.deep_judgment_rubric.deep_judgment_rubric_scores &&
                          Object.keys(result.deep_judgment_rubric.deep_judgment_rubric_scores).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Trait Evaluations:
                              </h5>
                              <div className="space-y-3">
                                {Object.entries(result.deep_judgment_rubric.deep_judgment_rubric_scores).map(
                                  ([traitName, score]) => {
                                    const reasoning = result.deep_judgment_rubric?.rubric_trait_reasoning?.[traitName];
                                    const excerpts =
                                      result.deep_judgment_rubric?.extracted_rubric_excerpts?.[traitName];
                                    const metadata = result.deep_judgment_rubric?.trait_metadata?.[traitName];
                                    const riskAssessment =
                                      result.deep_judgment_rubric?.rubric_hallucination_risk_assessment?.[traitName];

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
                                      <div
                                        key={traitName}
                                        className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4"
                                      >
                                        {/* Trait Header */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-3">
                                            <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                                              {traitName}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
                                              Score: {typeof score === 'boolean' ? (score ? '✓' : '✗') : score}
                                            </span>
                                          </div>
                                          {/* Overall Hallucination Risk */}
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
                                                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    {excerpt.text}
                                                  </p>
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
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {/* Traits Without Valid Excerpts Warning */}
                        {result.deep_judgment_rubric.traits_without_valid_excerpts &&
                          result.deep_judgment_rubric.traits_without_valid_excerpts.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                ⚠️ Traits Without Valid Excerpts (
                                {result.deep_judgment_rubric.traits_without_valid_excerpts.length})
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {result.deep_judgment_rubric.traits_without_valid_excerpts.map((trait) => (
                                  <span
                                    key={trait}
                                    className="px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200"
                                  >
                                    {trait}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                                These traits failed excerpt extraction and may have been auto-failed or evaluated
                                without evidence.
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* System Prompts */}
                  {(result.metadata.answering_system_prompt || result.metadata.parsing_system_prompt) && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">System Prompts Used</h4>
                      <div className="space-y-3">
                        {result.metadata.answering_system_prompt && (
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Answering Model System Prompt:
                            </h5>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <p className="text-slate-800 dark:text-slate-200 text-sm">
                                {result.metadata.answering_system_prompt}
                              </p>
                            </div>
                          </div>
                        )}
                        {result.metadata.parsing_system_prompt && (
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Parsing Model System Prompt:
                            </h5>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <p className="text-slate-800 dark:text-slate-200 text-sm">
                                {result.metadata.parsing_system_prompt}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Metadata</h4>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Answering Model:</span>
                          <p className="text-slate-800 dark:text-slate-200">
                            {result.metadata.answering_model || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Parsing Model:</span>
                          <p className="text-slate-800 dark:text-slate-200">{result.metadata.parsing_model || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Execution Time:</span>
                          <p className="text-slate-800 dark:text-slate-200">
                            {result.metadata.execution_time ? `${result.metadata.execution_time.toFixed(2)}s` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Timestamp:</span>
                          <p className="text-slate-800 dark:text-slate-200">
                            {result.metadata.timestamp ? new Date(result.metadata.timestamp).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        {/* MCP Server Information */}
                        {result.template?.answering_mcp_servers && result.template.answering_mcp_servers.length > 0 && (
                          <div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">MCP Servers:</span>
                            <p className="text-slate-800 dark:text-slate-200">
                              {result.template.answering_mcp_servers.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LLM Usage Metrics */}
                  {result.template?.usage_metadata && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">LLM Usage Metrics</h4>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-600">
                                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                                  Stage
                                </th>
                                <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                                  Input Tokens
                                </th>
                                <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                                  Output Tokens
                                </th>
                                <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                                  Total Tokens
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                                  Model
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(result.template.usage_metadata)
                                .filter(([stage]) => stage.toLowerCase() !== 'total')
                                .map(([stage, metadata]: [string, UsageMetadata]) => (
                                  <tr key={stage} className="border-b border-slate-100 dark:border-slate-600/50">
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 capitalize">
                                      {stage.replace(/_/g, ' ')}
                                    </td>
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                                      {metadata.input_tokens?.toLocaleString() || 0}
                                    </td>
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                                      {metadata.output_tokens?.toLocaleString() || 0}
                                    </td>
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right font-medium">
                                      {metadata.total_tokens?.toLocaleString() || 0}
                                    </td>
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-xs">
                                      {metadata.model || 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              {(() => {
                                const totals = Object.entries(result.template.usage_metadata)
                                  .filter(([stage]) => stage.toLowerCase() !== 'total')
                                  .reduce(
                                    (acc, [, metadata]) => ({
                                      input_tokens: (acc.input_tokens || 0) + (metadata.input_tokens || 0),
                                      output_tokens: (acc.output_tokens || 0) + (metadata.output_tokens || 0),
                                      total_tokens: (acc.total_tokens || 0) + (metadata.total_tokens || 0),
                                    }),
                                    { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
                                  );
                                return (
                                  <tr className="border-t-2 border-slate-300 dark:border-slate-500 font-semibold">
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200">Total</td>
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                                      {totals.input_tokens.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                                      {totals.output_tokens.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                                      {totals.total_tokens.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Agent Metrics (if available) */}
                        {result.template.agent_metrics && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                            <h5 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Agent Execution</h5>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-300">Iterations:</span>
                                <p className="text-slate-800 dark:text-slate-200">
                                  {result.template.agent_metrics.iterations || 0}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-300">Tool Calls:</span>
                                <p className="text-slate-800 dark:text-slate-200">
                                  {result.template.agent_metrics.tool_calls || 0}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-300">
                                  Suspect Failed Calls:
                                </span>
                                <p
                                  className={`${
                                    (result.template.agent_metrics.suspect_failed_tool_calls || 0) > 0
                                      ? 'text-red-600 dark:text-red-400 font-semibold'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {result.template.agent_metrics.suspect_failed_tool_calls || 0}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-300">Tools Used:</span>
                                <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">
                                  {result.template.agent_metrics.tools_used &&
                                  result.template.agent_metrics.tools_used.length > 0
                                    ? result.template.agent_metrics.tools_used.join(', ')
                                    : 'None'}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-slate-600 dark:text-slate-300">
                                  Suspect Failed Tools:
                                </span>
                                <p
                                  className={`text-xs mt-1 ${
                                    result.template.agent_metrics.suspect_failed_tools &&
                                    result.template.agent_metrics.suspect_failed_tools.length > 0
                                      ? 'text-red-600 dark:text-red-400 font-semibold'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {result.template.agent_metrics.suspect_failed_tools &&
                                  result.template.agent_metrics.suspect_failed_tools.length > 0
                                    ? result.template.agent_metrics.suspect_failed_tools.join(', ')
                                    : 'None'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            } catch (e) {
              console.error('Error rendering modal content:', e);
              return (
                <div className="text-center py-8 text-red-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Error displaying result details</p>
                  <p className="text-sm mt-1">{e instanceof Error ? e.message : 'Unknown error'}</p>
                </div>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
};
