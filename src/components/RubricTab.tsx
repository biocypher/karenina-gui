import React from 'react';
import { FileText, Settings } from 'lucide-react';
import { QuestionData } from '../types';
import RubricTraitGenerator from './RubricTraitGenerator';
import RubricTraitEditor from './RubricTraitEditor';

interface RubricTabProps {
  questions: QuestionData;
}

export const RubricTab: React.FC<RubricTabProps> = ({ questions }) => {
  const hasQuestions = Object.keys(questions).length > 0;

  return (
    <div className="space-y-8">
      {/* Tab Header */}
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 
                       dark:from-slate-200 dark:via-blue-300 dark:to-indigo-300 
                       bg-clip-text text-transparent mb-4"
        >
          Rubric Manager
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-lg max-w-3xl mx-auto">
          Create and manage global evaluation rubrics for your benchmarking. Generate traits using AI assistance or
          manually edit rubric criteria that will be used across all questions.
        </p>
      </div>

      {!hasQuestions ? (
        // No Questions State
        <div
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl 
                        border border-white/30 dark:border-slate-700/30 p-12 text-center"
        >
          <FileText className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Questions Available</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">
            To generate rubric traits, you need questions to analyze. Extract questions first using the Question
            Extractor.
          </p>
        </div>
      ) : (
        // Main Rubric Management Content
        <div className="space-y-8">
          {/* Rubric Trait Generator Section */}
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl 
                          border border-white/30 dark:border-slate-700/30 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">AI-Powered Trait Generation</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Use AI to automatically generate evaluation traits based on your questions and answers. The AI will
              analyze patterns and suggest relevant rubric criteria.
            </p>
            <RubricTraitGenerator
              questions={questions}
              onTraitsGenerated={(traits) => {
                console.log('Generated traits:', traits);
              }}
            />
          </div>

          {/* Rubric Trait Editor Section */}
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl 
                          border border-white/30 dark:border-slate-700/30 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Manual Trait Editor</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Manually create, edit, and organize global rubric traits. These traits will be available for evaluation
              across all questions in your benchmark suite.
            </p>
            <RubricTraitEditor />
          </div>

          {/* Information Panel */}
          <div
            className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 
                          rounded-xl border border-indigo-100 dark:border-indigo-800 p-6"
          >
            <h4 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-3">
              💡 Rubric Management Tips
            </h4>
            <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
              <li>
                • <strong>Global Rubrics:</strong> Traits created here apply to all questions in your benchmark
              </li>
              <li>
                • <strong>Question-Specific Rubrics:</strong> Use the Template Curator to add rubrics for individual
                questions
              </li>
              <li>
                • <strong>AI Generation:</strong> Let AI analyze your questions to suggest relevant evaluation criteria
              </li>
              <li>
                • <strong>Manual Editing:</strong> Fine-tune traits or create custom evaluation criteria from scratch
              </li>
              <li>
                • <strong>Trait Types:</strong> Choose between boolean (yes/no), score (1-5), or text-based evaluations
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
