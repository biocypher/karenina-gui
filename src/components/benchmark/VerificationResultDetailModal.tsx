import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Checkpoint, VerificationResult, Rubric } from '../../types';
import { TraceHighlightedTextDisplay } from '../TraceHighlightedTextDisplay';
import { RubricResultsDisplay } from '../RubricResultsDisplay';
import { logger } from '../../utils/logger';
import { DeepJudgmentResults } from './verification/DeepJudgmentResults';
import { DeepJudgmentRubricResults } from './verification/DeepJudgmentRubricResults';
import { MetricTraitConfusionMatrix } from './verification/MetricTraitConfusionMatrix';
import { LLMUsageMetrics } from './verification/LLMUsageMetrics';
import { ResultMetadata } from './verification/ResultMetadata';
import { EmbeddingCheckResults } from './verification/EmbeddingCheckResults';
import { AbstentionDetectionResults } from './verification/AbstentionDetectionResults';
import { SufficiencyDetectionResults } from './verification/SufficiencyDetectionResults';

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

  const safeJsonStringify = (value: unknown): string => {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
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
                    <TraceHighlightedTextDisplay
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
                          {safeJsonStringify(result.template.parsed_gt_response)}
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
                          {safeJsonStringify(result.template.parsed_llm_response)}
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
                          {safeJsonStringify(
                            Object.fromEntries(
                              Object.entries(result.template.regex_validation_details).map(([fieldName, details]) => [
                                fieldName,
                                {
                                  pattern: details.pattern,
                                  expected: details.expected,
                                  match_type: details.match_type,
                                },
                              ])
                            )
                          )}
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
                            {safeJsonStringify(result.template.regex_extraction_results)}
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
                          {safeJsonStringify(result.template.verify_result)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {result.template?.verify_granular_result && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Granular Verify Result</h4>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                        <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm overflow-x-auto">
                          {safeJsonStringify(result.template.verify_granular_result)}
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
                        <MetricTraitConfusionMatrix
                          metricTraitConfusionLists={result.rubric.metric_trait_confusion_lists}
                          metricTraitMetrics={result.rubric.metric_trait_metrics}
                        />
                      </div>
                    )}

                  {/* Embedding Check Results */}
                  {result.template?.embedding_check_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Embedding Check Results</h4>
                      <EmbeddingCheckResults template={result.template} />
                    </div>
                  )}

                  {/* Abstention Detection Results */}
                  {result.template?.abstention_check_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Abstention Detection Results
                      </h4>
                      <AbstentionDetectionResults template={result.template} />
                    </div>
                  )}

                  {/* Sufficiency Detection Results */}
                  {result.template?.sufficiency_check_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Sufficiency Detection Results
                      </h4>
                      <SufficiencyDetectionResults template={result.template} />
                    </div>
                  )}

                  {/* Deep-Judgment Results */}
                  {result.deep_judgment?.deep_judgment_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Deep-Judgment Results</h4>
                      <DeepJudgmentResults deepJudgment={result.deep_judgment} />
                    </div>
                  )}

                  {/* Deep-Judgment Rubric Results */}
                  {result.deep_judgment_rubric?.deep_judgment_rubric_performed && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Deep-Judgment Rubric Results
                      </h4>
                      <DeepJudgmentRubricResults deepJudgmentRubric={result.deep_judgment_rubric} />
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
                    <ResultMetadata metadata={result.metadata} template={result.template} />
                  </div>

                  {/* LLM Usage Metrics */}
                  {result.template?.usage_metadata && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">LLM Usage Metrics</h4>
                      <LLMUsageMetrics
                        usageMetadata={result.template.usage_metadata}
                        agentMetrics={result.template.agent_metrics}
                      />
                    </div>
                  )}
                </div>
              );
            } catch (e) {
              logger.error('MODAL', 'Error rendering modal content', 'VerificationResultDetailModal', { error: e });
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
