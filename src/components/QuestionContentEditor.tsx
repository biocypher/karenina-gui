import React, { useState, useEffect } from 'react';
import { X, Save, FileText, MessageSquare } from 'lucide-react';

interface QuestionContentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  currentQuestion: string;
  currentAnswer: string;
  onSave: (questionId: string, question: string, rawAnswer: string) => void;
}

export const QuestionContentEditor: React.FC<QuestionContentEditorProps> = ({
  isOpen,
  onClose,
  questionId,
  currentQuestion,
  currentAnswer,
  onSave,
}) => {
  const [question, setQuestion] = useState(currentQuestion);
  const [answer, setAnswer] = useState(currentAnswer);
  const [isDirty, setIsDirty] = useState(false);

  // Reset form data when the question changes
  useEffect(() => {
    setQuestion(currentQuestion);
    setAnswer(currentAnswer);
    setIsDirty(false);
  }, [currentQuestion, currentAnswer, questionId]);

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    setIsDirty(true);
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswer(e.target.value);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(questionId, question, answer);
    setIsDirty(false);
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) return;
    }

    // Reset form data to original values
    setQuestion(currentQuestion);
    setAnswer(currentAnswer);
    setIsDirty(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Edit Question & Answer
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Question Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Question
            </label>
            <textarea
              value={question}
              onChange={handleQuestionChange}
              rows={4}
              className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-700/90 text-slate-900 dark:text-white transition-colors resize-none"
              placeholder="Enter the question text..."
            />
          </div>

          {/* Answer Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Raw Answer
            </label>
            <textarea
              value={answer}
              onChange={handleAnswerChange}
              rows={6}
              className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white/90 dark:bg-slate-700/90 text-slate-900 dark:text-white transition-colors resize-none"
              placeholder="Enter the raw answer..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 font-medium shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-5 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
