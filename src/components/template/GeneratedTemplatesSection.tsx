import React from 'react';
import { CheckCircle, Download, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import type { QuestionData } from '../../types';
import type { GeneratedTemplate } from '../../stores/useTemplateStore';

// ============================================================================
// Types
// ============================================================================

export interface GeneratedTemplatesSectionProps {
  questions: QuestionData;
  generatedTemplates: Record<string, GeneratedTemplate>;
  generatedCount: number;
  successfulCount: number;
  failedCount: number;
  isGenerating: boolean;
  onRetryAllFailed: () => void;
  onDownloadAllGenerated: () => void;
  onClearAllGenerated: () => void;
  onAddToCuration: () => void;
  onRemoveTemplate: (questionId: string) => void;
  onRetryFailedTemplate: (questionId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const GeneratedTemplatesSection: React.FC<GeneratedTemplatesSectionProps> = ({
  questions,
  generatedTemplates,
  generatedCount,
  successfulCount,
  failedCount,
  isGenerating,
  onRetryAllFailed,
  onDownloadAllGenerated,
  onClearAllGenerated,
  onAddToCuration,
  onRemoveTemplate,
  onRetryFailedTemplate,
}) => {
  if (generatedCount === 0) {
    return null;
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      {/* Header with Stats and Action Buttons */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          Generated Templates ({successfulCount}/{generatedCount} successful)
        </h3>
        <div className="flex gap-3">
          {failedCount > 0 && (
            <button
              onClick={onRetryAllFailed}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-xl hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Failed ({failedCount})
            </button>
          )}
          <button
            onClick={onDownloadAllGenerated}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            Download All
          </button>
          <button
            onClick={onClearAllGenerated}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            title="Clear all generated templates from memory"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Generated Templates Table */}
      <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-inner mb-6">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Question</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
              {Object.entries(generatedTemplates).map(([questionId, template]) => {
                const question = questions[questionId];
                return (
                  <tr key={questionId} className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                      <div className="max-w-xs truncate" title={question?.question || questionId}>
                        {question?.question || questionId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {template.success ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {!template.success && (
                          <button
                            onClick={() => onRetryFailedTemplate(questionId)}
                            disabled={isGenerating}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors"
                            title="Retry generation"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveTemplate(questionId)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call to Action - Add to Curation */}
      <div className="flex justify-end">
        <button
          onClick={onAddToCuration}
          disabled={successfulCount === 0}
          className="flex items-center gap-3 px-8 py-4 text-lg font-semibold bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 disabled:transform-none disabled:hover:shadow-xl"
        >
          <Plus className="w-6 h-6" />
          Add to Curation ({successfulCount})
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Empty State Component
// ============================================================================

export interface EmptyStateProps {
  hasQuestions: boolean;
  pendingQuestionsCount: number;
  totalQuestions: number;
  generatedCount: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  hasQuestions,
  pendingQuestionsCount,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalQuestions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generatedCount,
}) => {
  if (!hasQuestions) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
        <div className="space-y-3">
          <p className="text-slate-800 dark:text-slate-200 font-semibold">
            No questions available for template generation.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            Extract questions first using the Question Extractor tab, then return here to generate answer templates.
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
            <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">
              {' '}
              <strong>Workflow:</strong> Question Extractor {'→'} Template Generator {'→'} Template Curator
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pendingQuestionsCount === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto w-12 h-12 text-green-400 dark:text-green-500 mb-4" />
        <p className="text-slate-600 dark:text-slate-300">
          All questions have generated templates! Use &quot;Add to Curation&quot; above to proceed.
        </p>
      </div>
    );
  }

  return null;
};
