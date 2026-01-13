import React from 'react';
import { Globe, Tags } from 'lucide-react';

export interface KeywordColumnConfig {
  column: string;
  separator: string;
}

export interface MetadataSettingsForKeywords {
  url_column?: string;
  keywords_columns?: KeywordColumnConfig[];
}

interface AdditionalMetadataSectionProps {
  settings: Pick<MetadataSettingsForKeywords, 'url_column' | 'keywords_columns'>;
  columns: string[];
  onColumnChange: (field: 'url_column', value: string) => void;
  onKeywordColumnChange: (index: number, field: 'column' | 'separator', value: string) => void;
  addKeywordColumn: () => void;
  removeKeywordColumn: (index: number) => void;
  getPreviewValues: (columnName: string) => string[];
  getKeywordsPreview: (keywordColumns: KeywordColumnConfig[]) => {
    columns: { column: string; input: string; parsed: string[] }[];
    concatenated: string[];
  }[];
}

export const AdditionalMetadataSection: React.FC<AdditionalMetadataSectionProps> = ({
  settings,
  columns,
  onColumnChange,
  onKeywordColumnChange,
  addKeywordColumn,
  removeKeywordColumn,
  getPreviewValues,
  getKeywordsPreview,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">Additional Metadata</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Links and categorization</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* URL/Link */}
        <div>
          <label htmlFor="url-select" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            URL/Link
          </label>
          <select
            id="url-select"
            value={settings.url_column || ''}
            onChange={(e) => onColumnChange('url_column', e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600"
          >
            <option value="">None (skip)</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          {settings.url_column && (
            <div className="mt-2 p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50 dark:border-green-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                  <Globe className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs font-medium text-green-700 dark:text-green-300">URL Preview</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {getPreviewValues(settings.url_column)
                  .slice(0, 2)
                  .map((val, i) => (
                    <span
                      key={i}
                      className="inline-block bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-2 py-1 rounded-md text-xs font-mono"
                    >
                      {val.length > 30 ? val.substring(0, 27) + '...' : val}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Keywords</label>

          <div className="space-y-3">
            {/* Multiple Keyword Columns */}
            {(settings.keywords_columns || []).map((kwCol, index) => (
              <div
                key={index}
                className="p-4 bg-purple-50/30 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-700/50"
              >
                <div className="flex items-start gap-3">
                  {/* Column Number Badge */}
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 dark:bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-1">
                    {index + 1}
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Column Selector */}
                    <div>
                      <label
                        htmlFor={`keyword-column-${index}`}
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Column
                      </label>
                      <select
                        id={`keyword-column-${index}`}
                        value={kwCol.column}
                        onChange={(e) => onKeywordColumnChange(index, 'column', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm transition-all"
                      >
                        <option value="">None (skip)</option>
                        {columns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Separator Input */}
                    <div>
                      <label
                        htmlFor={`keyword-separator-${index}`}
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Separator
                      </label>
                      <input
                        id={`keyword-separator-${index}`}
                        type="text"
                        value={kwCol.separator}
                        onChange={(e) => onKeywordColumnChange(index, 'separator', e.target.value)}
                        className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder=","
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  {(settings.keywords_columns || []).length > 1 && (
                    <button
                      onClick={() => removeKeywordColumn(index)}
                      className="flex-shrink-0 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove this keyword column"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Keyword Column Button */}
            <button
              onClick={addKeywordColumn}
              className="w-full px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Keyword Column
            </button>
          </div>

          {/* Keywords Preview */}
          {settings.keywords_columns &&
            settings.keywords_columns.some((kc) => kc.column && kc.column.trim() !== '') && (
              <div className="mt-4 p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                    <Tags className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    Keywords Preview (Concatenated)
                  </span>
                </div>
                {getKeywordsPreview(settings.keywords_columns).map((item, i) => (
                  <div
                    key={i}
                    className="mb-3 last:mb-0 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-slate-200/50 dark:border-slate-700/50"
                  >
                    {/* Show inputs from all columns */}
                    {item.columns.map((colData, ci) => (
                      <div key={ci} className="mb-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {colData.column}:
                        </span>
                        <span className="ml-2 text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                          "{colData.input}"
                        </span>
                      </div>
                    ))}
                    {/* Show concatenated result */}
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-2">
                        Concatenated Result:
                      </span>
                      {item.concatenated.map((keyword, ki) => (
                        <span
                          key={ki}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium shadow-sm"
                        >
                          <Tags className="w-3 h-3" />
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
