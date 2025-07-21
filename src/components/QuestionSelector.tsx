import React, { useState, useMemo } from 'react';
import { Search, Square, Check, FileText, Filter } from 'lucide-react';
import { QuestionData, Checkpoint } from '../types';

interface QuestionSelectorProps {
  questions: QuestionData | Checkpoint;
  selectedQuestions: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  questions,
  selectedQuestions,
  onSelectionChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'finished' | 'unfinished'>('all');

  // Check if questions have finished property (i.e., are Checkpoint type)
  const hasFinishedProperty = useMemo(() => {
    const firstQuestion = Object.values(questions)[0];
    return firstQuestion && 'finished' in firstQuestion;
  }, [questions]);

  // Filter questions based on search term and finish status
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const searchFiltered: typeof questions = {};

      Object.entries(questions).forEach(([id, question]) => {
        if (
          question.question.toLowerCase().includes(searchLower) ||
          question.raw_answer.toLowerCase().includes(searchLower) ||
          id.toLowerCase().includes(searchLower)
        ) {
          searchFiltered[id] = question;
        }
      });
      filtered = searchFiltered;
    }

    // Apply status filter if finished property exists
    if (hasFinishedProperty && filterStatus !== 'all') {
      const statusFiltered: typeof questions = {};
      Object.entries(filtered).forEach(([id, question]) => {
        const isFinished = 'finished' in question ? question.finished : true;
        if ((filterStatus === 'finished' && isFinished) || (filterStatus === 'unfinished' && !isFinished)) {
          statusFiltered[id] = question;
        }
      });
      filtered = statusFiltered;
    }

    return filtered;
  }, [questions, searchTerm, filterStatus, hasFinishedProperty]);

  const filteredQuestionIds = Object.keys(filteredQuestions);

  const handleSelectAll = () => {
    const newSelected = new Set(selectedQuestions);
    filteredQuestionIds.forEach((id) => newSelected.add(id));
    onSelectionChange(newSelected);
  };

  const handleSelectNone = () => {
    const newSelected = new Set(selectedQuestions);
    filteredQuestionIds.forEach((id) => newSelected.delete(id));
    onSelectionChange(newSelected);
  };

  const handleSelectAllQuestions = () => {
    onSelectionChange(new Set(Object.keys(questions)));
  };

  const handleSelectNoQuestions = () => {
    onSelectionChange(new Set());
  };

  const handleToggleQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    onSelectionChange(newSelected);
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Select Questions for Template Generation
        </h3>
        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg">
          {selectedQuestions.size} of {Object.keys(questions).length} selected
        </div>
      </div>

      {/* Search and Selection Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search questions, answers, or IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Status Filter Dropdown - only show if questions have finished property */}
        {hasFinishedProperty && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'finished' | 'unfinished')}
              className="pl-10 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Show All</option>
              <option value="finished">Finished Only</option>
              <option value="unfinished">Unfinished Only</option>
            </select>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSelectAllQuestions}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Check className="w-4 h-4" />
            Select All ({Object.keys(filteredQuestions).length})
          </button>
          <button
            onClick={handleSelectNoQuestions}
            className="px-4 py-2 bg-slate-600 dark:bg-slate-500 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-400 transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Square className="w-4 h-4" />
            Select None
          </button>
        </div>
      </div>

      {/* Questions Table */}
      <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-inner">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedQuestions.size === Object.keys(filteredQuestions).length &&
                      Object.keys(filteredQuestions).length > 0
                    }
                    onChange={
                      selectedQuestions.size === Object.keys(filteredQuestions).length
                        ? handleSelectNone
                        : handleSelectAll
                    }
                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Question</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Answer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
              {Object.entries(filteredQuestions).map(([id, question]) => (
                <tr key={id} className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(id)}
                      onChange={() => handleToggleQuestion(id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                    <div className="max-w-xs line-clamp-2" title={question.question}>
                      {truncateText(question.question)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="max-w-xs line-clamp-1" title={question.raw_answer}>
                      {truncateText(question.raw_answer, 50)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono">
                    {id.substring(0, 8)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {Object.keys(filteredQuestions).length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No questions match your search criteria.</p>
        </div>
      )}

      {Object.keys(questions).length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No questions available for selection.</p>
        </div>
      )}
    </div>
  );
};
