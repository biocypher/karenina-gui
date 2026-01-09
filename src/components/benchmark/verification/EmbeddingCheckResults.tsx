import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { VerificationResult } from '../../../types';

interface EmbeddingCheckResultsProps {
  template: NonNullable<VerificationResult['template']>;
}

export const EmbeddingCheckResults: React.FC<EmbeddingCheckResultsProps> = ({ template }) => {
  if (!template.embedding_check_performed) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Similarity Score:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">
            {template.embedding_similarity_score?.toFixed(3) || 'N/A'}
          </p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model Used:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">{template.embedding_model_used || 'N/A'}</p>
        </div>
      </div>

      {template.embedding_override_applied && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Verification Overridden by Semantic Check
            </span>
          </div>
          <p className="text-green-700 dark:text-green-300 text-sm mt-1">
            The initial verification failed, but embedding similarity analysis determined the answers are semantically
            equivalent.
          </p>
        </div>
      )}
    </div>
  );
};
