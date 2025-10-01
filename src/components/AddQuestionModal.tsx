import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from './ui/Modal';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (question: string, rawAnswer: string, author?: string, keywords?: string[]) => void;
}

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [question, setQuestion] = useState('');
  const [rawAnswer, setRawAnswer] = useState('');
  const [author, setAuthor] = useState('');
  const [keywords, setKeywords] = useState('');
  const [errors, setErrors] = useState<{ question?: string; rawAnswer?: string }>({});

  const handleSubmit = () => {
    // Validate inputs
    const newErrors: { question?: string; rawAnswer?: string } = {};

    if (!question.trim()) {
      newErrors.question = 'Question is required';
    }

    if (!rawAnswer.trim()) {
      newErrors.rawAnswer = 'Answer is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Parse keywords (comma-separated)
    const keywordList = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // Call onAdd with the data
    onAdd(
      question.trim(),
      rawAnswer.trim(),
      author.trim() || undefined,
      keywordList.length > 0 ? keywordList : undefined
    );

    // Reset form
    handleReset();
  };

  const handleReset = () => {
    setQuestion('');
    setRawAnswer('');
    setAuthor('');
    setKeywords('');
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Question" size="lg">
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>💡 Tip:</strong> Add a new question manually to your benchmark. A basic Pydantic template will be
            auto-generated, which you can then edit in the Template Curator.
          </p>
        </div>

        {/* Question Field */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Question <span className="text-red-500">*</span>
          </label>
          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (errors.question) setErrors({ ...errors, question: undefined });
            }}
            rows={4}
            placeholder="Enter the question text..."
            className={`w-full px-4 py-3 border ${
              errors.question ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
            } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-y`}
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
              setRawAnswer(e.target.value);
              if (errors.rawAnswer) setErrors({ ...errors, rawAnswer: undefined });
            }}
            rows={4}
            placeholder="Enter the answer text..."
            className={`w-full px-4 py-3 border ${
              errors.rawAnswer ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
            } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-y`}
          />
          {errors.rawAnswer && <p className="mt-1 text-sm text-red-500">{errors.rawAnswer}</p>}
        </div>

        {/* Optional Metadata */}
        <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Optional Metadata</h4>

          {/* Author Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Question author name..."
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Keywords Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., math, geometry, basic"
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-600 pt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>
    </Modal>
  );
};
