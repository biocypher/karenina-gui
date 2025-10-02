import React, { useState } from 'react';
import { QuestionExtractor } from './QuestionExtractor';
import { AnswerTemplateGenerator } from './AnswerTemplateGenerator';
import { QuestionData } from '../types';

interface TemplateGenerationTabProps {
  onTemplatesGenerated: (combinedData: QuestionData) => void;
  onSwitchToCurator?: () => void;
}

export const TemplateGenerationTab: React.FC<TemplateGenerationTabProps> = ({
  onTemplatesGenerated,
  onSwitchToCurator,
}) => {
  const [extractedQuestions, setExtractedQuestions] = useState<QuestionData>({});

  const handleQuestionsExtracted = (questions: QuestionData) => {
    setExtractedQuestions(questions);
  };

  return (
    <div className="space-y-8">
      {/* Question Extraction Section - Top */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 dark:from-slate-200 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent mb-2">
            1. Question Extraction
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Upload a file and extract questions to prepare for template generation
          </p>
        </div>
        <QuestionExtractor onQuestionsExtracted={handleQuestionsExtracted} extractedQuestions={extractedQuestions} />
      </div>

      {/* Visual Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-slate-300 dark:border-slate-600"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-full border border-slate-300 dark:border-slate-600">
            ↓ Extracted questions automatically available below ↓
          </span>
        </div>
      </div>

      {/* Template Generation Section - Bottom */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-purple-900 to-indigo-900 dark:from-slate-200 dark:via-purple-300 dark:to-indigo-300 bg-clip-text text-transparent mb-2">
            2. Answer Template Generation
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Generate answer templates from extracted questions using LLM providers
          </p>
        </div>
        <AnswerTemplateGenerator
          questions={extractedQuestions}
          onTemplatesGenerated={onTemplatesGenerated}
          onSwitchToCurator={onSwitchToCurator}
        />
      </div>
    </div>
  );
};
