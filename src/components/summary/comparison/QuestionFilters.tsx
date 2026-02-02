interface Question {
  id: string;
  text: string;
  keywords: string[];
}

interface QuestionFiltersProps {
  availableQuestions: Question[];
  filteredQuestions: Question[];
  selectedQuestions: Set<string>;
  selectedKeywords: Set<string>;
  availableKeywords: string[];
  questionSearchText: string;
  onSearchTextChange: (value: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleQuestion: (id: string) => void;
  onToggleKeyword: (keyword: string) => void;
  onClearKeywords: () => void;
  onClearAllFilters: () => void;
}

export function QuestionFilters({
  availableQuestions,
  filteredQuestions,
  selectedQuestions,
  selectedKeywords,
  availableKeywords,
  questionSearchText,
  onSearchTextChange,
  onSelectAll,
  onSelectNone,
  onToggleQuestion,
  onToggleKeyword,
  onClearKeywords,
  onClearAllFilters,
}: QuestionFiltersProps) {
  const hasActiveFilters =
    questionSearchText !== '' || selectedKeywords.size > 0 || selectedQuestions.size !== availableQuestions.length;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Filter Questions ({selectedQuestions.size}/{availableQuestions.length} selected):
        </label>
        {hasActiveFilters && (
          <button
            onClick={onClearAllFilters}
            className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded border border-red-200 dark:border-red-800 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
      <div className="flex gap-4">
        {/* Question Selector */}
        <div className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 p-3">
          {/* Search and Action Buttons */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Search questions..."
              value={questionSearchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <button
              onClick={onSelectAll}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded border border-blue-200 dark:border-blue-800 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={onSelectNone}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors"
            >
              Select None
            </button>
          </div>

          {/* Question Checkboxes */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredQuestions.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 italic">No questions match filters</div>
            ) : (
              filteredQuestions.map((question) => (
                <label
                  key={question.id}
                  className="flex items-start gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(question.id)}
                    onChange={() => onToggleQuestion(question.id)}
                    className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    {question.text}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Keyword Filter */}
        {availableKeywords.length > 0 && (
          <div className="w-64 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 p-3">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Keywords ({selectedKeywords.size}/{availableKeywords.length})
              </h4>
              {selectedKeywords.size > 0 && (
                <button
                  onClick={onClearKeywords}
                  className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Keyword Pills */}
            <div className="max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {availableKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => onToggleKeyword(keyword)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedKeywords.has(keyword)
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
