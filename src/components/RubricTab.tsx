import React from 'react';
import { FileText } from 'lucide-react';
import { QuestionData } from '../types';
import { useRubricStore } from '../stores/useRubricStore';
import RubricTraitEditor from './RubricTraitEditor';

interface RubricTabProps {
  questions: QuestionData;
}

export const RubricTab: React.FC<RubricTabProps> = ({ questions }) => {
  const hasQuestions = Object.keys(questions).length > 0;
  const { currentRubric } = useRubricStore();
  const hasGlobalRubric = currentRubric && currentRubric.llm_traits.length > 0;

  // Show rubric management if we have global rubrics OR questions for AI generation
  const showRubricManagement = hasGlobalRubric || hasQuestions;

  return (
    <div className="space-y-8">
      {/* Tab Header */}
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 
                       dark:from-slate-200 dark:via-blue-300 dark:to-indigo-300 
                       bg-clip-text text-transparent mb-4"
        >
          Global Rubric Manager
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-lg max-w-3xl mx-auto">
          Create and manage global evaluation rubrics for your benchmarking. Generate traits using AI assistance or
          manually edit rubric criteria that will be used across all questions.
        </p>
      </div>

      {!showRubricManagement ? (
        // No Questions State
        <div
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl 
                        border border-white/30 dark:border-slate-700/30 p-12 text-center"
        >
          <FileText className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Data Available</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">
            To manage global rubrics, either extract questions for AI generation or load a checkpoint containing
            existing global rubrics.
          </p>
        </div>
      ) : (
        // Main Rubric Management Content
        <div className="space-y-8">
          {/* Rubric Trait Editor Section - Always show when we have rubric management available */}
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl 
                          border border-white/30 dark:border-slate-700/30 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Rubric Trait Editor</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {hasGlobalRubric
                ? `Editing ${currentRubric.llm_traits.length} LLM-evaluated traits${(currentRubric.regex_traits?.length || 0) > 0 ? `, ${currentRubric.regex_traits.length} regex traits` : ''}${(currentRubric.metric_traits?.length || 0) > 0 ? `, ${currentRubric.metric_traits.length} metric traits` : ''}. These traits are available for evaluation across all questions.`
                : 'Create, edit, and organize global rubric traits (LLM-evaluated, regex, and metric). These traits will be available for evaluation across all questions in your benchmark suite.'}
            </p>
            <RubricTraitEditor />
          </div>
        </div>
      )}
    </div>
  );
};
