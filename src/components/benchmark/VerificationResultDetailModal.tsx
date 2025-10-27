import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Checkpoint, VerificationResult, Rubric } from '../../types';
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
                        result.completed_without_errors
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                      }`}
                    >
                      {result.completed_without_errors ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {result.completed_without_errors ? 'true' : 'false'}
                    </div>
                    {result.error && <p className="text-red-600 dark:text-red-400 mt-2">{result.error}</p>}
                  </div>

                  {/* Raw Question */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Raw Question</h4>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <p className="text-slate-800 dark:text-slate-200">{result.question_text || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Raw Answer (Expected) */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Raw Answer (Expected)</h4>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <p className="text-slate-800 dark:text-slate-200">
                        {checkpoint[result.question_id]?.raw_answer || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Raw LLM Response (Generated) */}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Raw LLM Response (Generated)
                    </h4>
                    <SearchableTextDisplay
                      text={result.raw_llm_response || 'N/A'}
                      className="text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Ground Truth (Expected) */}
                  {result.parsed_gt_response && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Ground Truth (Expected)</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return JSON.stringify(result.parsed_gt_response, null, 2);
                            } catch {
                              return String(result.parsed_gt_response);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* LLM Extraction (Generated) */}
                  {result.parsed_llm_response && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        LLM Extraction (Generated)
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return JSON.stringify(result.parsed_llm_response, null, 2);
                            } catch {
                              return String(result.parsed_llm_response);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Regex Ground Truth (Expected) */}
                  {result.regex_validation_details && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Regex Ground Truth (Expected)
                      </h4>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              const regexGroundTruth: Record<string, Record<string, unknown>> = {};
                              Object.entries(result.regex_validation_details).forEach(([fieldName, details]) => {
                                regexGroundTruth[fieldName] = {
                                  pattern: details.pattern,
                                  expected: details.expected,
                                  match_type: details.match_type,
                                };
                              });
                              return JSON.stringify(regexGroundTruth, null, 2);
                            } catch {
                              return String(result.regex_validation_details);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Regex Extraction (Generated) */}
                  {result.regex_extraction_results && Object.keys(result.regex_extraction_results).length > 0 && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Regex Extraction (Generated)
                      </h4>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return JSON.stringify(result.regex_extraction_results, null, 2);
                            } catch {
                              return String(result.regex_extraction_results);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Verification Results */}
                  {result.verify_result && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Verify Result</h4>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return typeof result.verify_result === 'string'
                                ? result.verify_result
                                : JSON.stringify(result.verify_result, null, 2);
                            } catch {
                              return String(result.verify_result);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {result.verify_granular_result && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Granular Verify Result</h4>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {(() => {
                            try {
                              return typeof result.verify_granular_result === 'string'
                                ? result.verify_granular_result
                                : JSON.stringify(result.verify_granular_result, null, 2);
                            } catch {
                              return String(result.verify_granular_result);
                            }
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Rubric Evaluation Results */}
                  {result.verify_rubric && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Rubric Evaluation Results</h4>
                      <RubricResultsDisplay
                        rubricResults={result.verify_rubric}
                        currentRubric={currentRubric}
                        evaluationRubric={result.evaluation_rubric}
                      />
                    </div>
                  )}

                  {/* Embedding Check Results */}
                  {result.embedding_check_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Embedding Check Results</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Similarity Score:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.embedding_similarity_score?.toFixed(3) || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model Used:</h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.embedding_model_used || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {result.embedding_override_applied && (
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
                  {result.abstention_check_performed && (
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
                              {result.abstention_check_performed ? 'Yes' : 'No'}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Abstention Detected:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.abstention_detected === true
                                ? 'Yes'
                                : result.abstention_detected === false
                                  ? 'No'
                                  : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {result.abstention_detected && result.abstention_override_applied && (
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
                            {result.abstention_reasoning && (
                              <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                                <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                  Detector Reasoning:
                                </h5>
                                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                                  {result.abstention_reasoning}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deep-Judgment Results */}
                  {result.deep_judgment_performed && (
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
                              {result.deep_judgment_stages_completed?.join(', ') || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Model Calls:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.deep_judgment_model_calls || 0}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Excerpt Retries:
                            </h5>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">
                              {result.deep_judgment_excerpt_retry_count || 0}
                            </p>
                          </div>
                        </div>

                        {/* Extracted Excerpts */}
                        {result.extracted_excerpts && Object.keys(result.extracted_excerpts).length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Extracted Excerpts:
                            </h5>
                            <div className="space-y-2">
                              {Object.entries(result.extracted_excerpts).map(([attributeName, excerpts]) => {
                                // Get hallucination risk for this attribute
                                const riskLevel = result.hallucination_risk_assessment?.[attributeName];
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
                              })}
                            </div>
                          </div>
                        )}

                        {/* Attribute Reasoning */}
                        {result.attribute_reasoning && Object.keys(result.attribute_reasoning).length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Attribute Reasoning:
                            </h5>
                            <div className="space-y-2">
                              {Object.entries(result.attribute_reasoning).map(([attributeName, reasoning]) => (
                                <div
                                  key={attributeName}
                                  className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3"
                                >
                                  <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                                    {attributeName}
                                  </div>
                                  <p className="text-slate-800 dark:text-slate-200 text-sm">{reasoning}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attributes Without Excerpts */}
                        {result.attributes_without_excerpts && result.attributes_without_excerpts.length > 0 && (
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
                              {result.attributes_without_excerpts.map((attrName) => (
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
                        {(!result.extracted_excerpts || Object.keys(result.extracted_excerpts).length === 0) &&
                          (!result.attribute_reasoning || Object.keys(result.attribute_reasoning).length === 0) &&
                          (!result.attributes_without_excerpts || result.attributes_without_excerpts.length === 0) && (
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                              <p className="text-slate-600 dark:text-slate-400 text-sm">
                                Deep-judgment was performed but no data was generated.
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* System Prompts */}
                  {(result.answering_system_prompt || result.parsing_system_prompt) && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">System Prompts Used</h4>
                      <div className="space-y-3">
                        {result.answering_system_prompt && (
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Answering Model System Prompt:
                            </h5>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <p className="text-slate-800 dark:text-slate-200 text-sm">
                                {result.answering_system_prompt}
                              </p>
                            </div>
                          </div>
                        )}
                        {result.parsing_system_prompt && (
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Parsing Model System Prompt:
                            </h5>
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                              <p className="text-slate-800 dark:text-slate-200 text-sm">
                                {result.parsing_system_prompt}
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
                          <p className="text-slate-800 dark:text-slate-200">{result.answering_model || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Parsing Model:</span>
                          <p className="text-slate-800 dark:text-slate-200">{result.parsing_model || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Execution Time:</span>
                          <p className="text-slate-800 dark:text-slate-200">
                            {result.execution_time ? `${result.execution_time.toFixed(2)}s` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Timestamp:</span>
                          <p className="text-slate-800 dark:text-slate-200">
                            {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        {/* MCP Server Information */}
                        {result.answering_mcp_servers && result.answering_mcp_servers.length > 0 && (
                          <div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">MCP Servers:</span>
                            <p className="text-slate-800 dark:text-slate-200">
                              {result.answering_mcp_servers.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
