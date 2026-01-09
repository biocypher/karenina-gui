import React from 'react';
import { CheckCircle } from 'lucide-react';
import { QuestionData } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface ExtractionResultsProps {
  extractedQuestions: QuestionData;
  onReset: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ExtractionResults: React.FC<ExtractionResultsProps> = ({ extractedQuestions, onReset }) => {
  const questionsCount = Object.keys(extractedQuestions).length;

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Extraction Complete
            </h3>
            <p className="text-slate-600 dark:text-slate-300">Successfully extracted {questionsCount} questions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-colors font-medium"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
