import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface QuestionFormInputsProps {
  question: string;
  rawAnswer: string;
  errors: { question?: string; rawAnswer?: string };
  onQuestionChange: (value: string) => void;
  onRawAnswerChange: (value: string) => void;
  onClearQuestionError: () => void;
  onClearRawAnswerError: () => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const QuestionFormInputs: React.FC<QuestionFormInputsProps> = ({
  question,
  rawAnswer,
  errors,
  onQuestionChange,
  onRawAnswerChange,
  onClearQuestionError,
  onClearRawAnswerError,
  disabled = false,
}) => {
  return (
    <>
      {/* Question Field */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Question <span className="text-red-500">*</span>
        </label>
        <textarea
          value={question}
          onChange={(e) => {
            onQuestionChange(e.target.value);
            onClearQuestionError();
          }}
          rows={4}
          placeholder="Enter the question text..."
          disabled={disabled}
          className={`w-full px-4 py-3 border ${
            errors.question ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
          } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {errors.question && <p className="mt-1 text-sm text-red-500">{errors.question}</p>}
      </div>

      {/* Raw Answer Field */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Raw Answer <span className="text-red-500">*</span>
        </label>
        <textarea
          value={rawAnswer}
          onChange={(e) => {
            onRawAnswerChange(e.target.value);
            onClearRawAnswerError();
          }}
          rows={4}
          placeholder="Enter the answer text..."
          disabled={disabled}
          className={`w-full px-4 py-3 border ${
            errors.rawAnswer ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
          } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {errors.rawAnswer && <p className="mt-1 text-sm text-red-500">{errors.rawAnswer}</p>}
      </div>
    </>
  );
};
