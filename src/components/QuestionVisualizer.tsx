import React, { useState } from 'react';
import { Search, Hash, MessageSquare, FileText, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Question {
  question: string;
  raw_answer: string;
  id?: string;
  tags?: string[];
}

interface QuestionVisualizerProps {
  questions: Record<string, Question>;
}

export const QuestionVisualizer: React.FC<QuestionVisualizerProps> = ({ questions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const questionEntries = Object.entries(questions);

  // Filter questions based on search term
  const filteredQuestions = questionEntries.filter(
    ([id, question]) =>
      question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.raw_answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setCopiedText(text);
      setTimeout(() => {
        setCopiedId(null);
        setCopiedText(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(questionEntries.map(([id]) => id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  if (questionEntries.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-8 text-center">
        <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Questions Available</h3>
        <p className="text-slate-600 dark:text-slate-300">Extract questions from a file to see them visualized here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Extracted Questions
          <span className="text-sm font-normal text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
            {questionEntries.length} total
          </span>
        </h3>

        <div className="flex items-center gap-3">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search questions, answers, or IDs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
      </div>

      {/* Results Count */}
      {searchTerm && (
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Showing {filteredQuestions.length} of {questionEntries.length} questions
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No questions match your search criteria.
          </div>
        ) : (
          filteredQuestions.map(([questionId, question], index) => {
            const isExpanded = expandedQuestions.has(questionId);

            return (
              <div
                key={questionId}
                className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Question Header */}
                <div
                  className="p-4 bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => toggleExpanded(questionId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">
                          #{index + 1}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Hash className="w-3 h-3" />
                          <span className="font-mono" title={questionId}>
                            {questionId.slice(0, 10)}...
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(questionId, questionId);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                          >
                            {copiedId === questionId ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                        {question.question}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        <span className="font-medium">Answer:</span> {question.raw_answer}
                      </p>
                    </div>

                    <button className="ml-4 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-600">
                    <div className="space-y-4">
                      {/* Question ID */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Question ID
                        </label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-between">
                          <code className="text-xs text-slate-800 dark:text-slate-200 font-mono">{questionId}</code>
                          <button
                            onClick={() => copyToClipboard(questionId, `id-${questionId}`)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                          >
                            {copiedId === `id-${questionId}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Full Question */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Question
                        </label>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                          <p className="text-sm text-blue-900 dark:text-blue-200">{question.question}</p>
                        </div>
                      </div>

                      {/* Raw Answer */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Raw Answer
                        </label>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-700">
                          <p className="text-sm text-emerald-900 dark:text-emerald-200">{question.raw_answer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
        <div className="text-xs text-indigo-800 dark:text-indigo-300">
          <strong>Tip:</strong> Click on any question to expand and see the full details including the question ID and
          raw answer. Use the copy buttons to copy question IDs to your clipboard.
        </div>
      </div>
    </div>
  );
};
