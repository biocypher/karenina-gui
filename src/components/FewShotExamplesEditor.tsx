import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, X, Save, FileText } from 'lucide-react';

interface FewShotExample {
  id: string;
  question: string;
  answer: string;
}

interface FewShotExamplesEditorProps {
  isOpen: boolean;
  examples: Array<{ question: string; answer: string }>;
  onSave: (examples: Array<{ question: string; answer: string }>) => void;
  onClose: () => void;
}

export const FewShotExamplesEditor: React.FC<FewShotExamplesEditorProps> = ({ isOpen, examples, onSave, onClose }) => {
  const [localExamples, setLocalExamples] = useState<FewShotExample[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize local examples from props
  useEffect(() => {
    if (isOpen) {
      const initialExamples = examples.map((example, index) => ({
        id: `example_${Date.now()}_${index}`,
        question: example.question,
        answer: example.answer,
      }));
      setLocalExamples(initialExamples);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, examples]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSave, onClose]);

  const addExample = () => {
    const newExample: FewShotExample = {
      id: `example_${Date.now()}`,
      question: '',
      answer: '',
    };
    setLocalExamples((prev) => [...prev, newExample]);
    setHasUnsavedChanges(true);
  };

  const removeExample = (id: string) => {
    setLocalExamples((prev) => prev.filter((ex) => ex.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateExample = (id: string, field: 'question' | 'answer', value: string) => {
    setLocalExamples((prev) => prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)));
    setHasUnsavedChanges(true);
  };

  const handleSave = useCallback(() => {
    const examplesData = localExamples
      .filter((ex) => ex.question.trim() && ex.answer.trim()) // Filter out empty examples
      .map((ex) => ({ question: ex.question, answer: ex.answer }));

    onSave(examplesData);
    setHasUnsavedChanges(false);
  }, [localExamples, onSave]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Few-shot Examples</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Add question-answer pairs to provide examples for few-shot prompting. These examples will be shown to the
              LLM before your actual question to improve response accuracy.
            </p>
          </div>

          {/* Examples List */}
          <div className="space-y-4">
            {localExamples.map((example, index) => (
              <div key={example.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Example {index + 1}</h3>
                  <button
                    onClick={() => removeExample(example.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Question */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Question
                    </label>
                    <textarea
                      value={example.question}
                      onChange={(e) => updateExample(example.id, 'question', e.target.value)}
                      className="w-full h-24 p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter the example question..."
                    />
                  </div>

                  {/* Answer */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Answer</label>
                    <textarea
                      value={example.answer}
                      onChange={(e) => updateExample(example.id, 'answer', e.target.value)}
                      className="w-full h-24 p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter the expected answer..."
                    />
                  </div>
                </div>
              </div>
            ))}

            {localExamples.length === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No examples added yet.</p>
                <p className="text-sm">Click "Add Example" to get started.</p>
              </div>
            )}
          </div>

          {/* Add Example Button */}
          <div className="mt-6">
            <button
              onClick={addExample}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Example
            </button>
          </div>
        </div>

        {/* Footer */}
        {hasUnsavedChanges && (
          <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-600">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You have unsaved changes. Click "Save Changes" or press Ctrl+S to save.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
