import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Tags, User, Link, Globe, Building } from 'lucide-react';

interface AdvancedExtractionPanelProps {
  columns: string[];
  isVisible: boolean;
  onToggle: () => void;
  onSettingsChange: (settings: MetadataColumnSettings) => void;
  previewData?: Record<string, string>[];
}

export interface KeywordColumnConfig {
  column: string;
  separator: string;
}

export interface MetadataColumnSettings {
  author_name_column?: string;
  author_email_column?: string;
  author_affiliation_column?: string;
  url_column?: string;
  // New format: multiple keyword columns with individual separators
  keywords_columns?: KeywordColumnConfig[];
  // Deprecated: kept for backward compatibility
  keywords_column?: string;
  keywords_separator?: string;
}

export const AdvancedExtractionPanel: React.FC<AdvancedExtractionPanelProps> = ({
  columns,
  isVisible,
  onToggle,
  onSettingsChange,
  previewData = [],
}) => {
  const [settings, setSettings] = useState<MetadataColumnSettings>({
    keywords_columns: [{ column: '', separator: ',' }], // Start with one empty keyword column
  });

  const handleColumnChange = (field: keyof MetadataColumnSettings, value: string) => {
    const newSettings = {
      ...settings,
      [field]: value || undefined, // Convert empty string to undefined
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  // Handle keyword column changes
  const handleKeywordColumnChange = (index: number, field: 'column' | 'separator', value: string) => {
    const keywordColumns = [...(settings.keywords_columns || [])];
    keywordColumns[index] = {
      ...keywordColumns[index],
      [field]: value,
    };
    const newSettings = {
      ...settings,
      keywords_columns: keywordColumns,
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const addKeywordColumn = () => {
    const keywordColumns = [...(settings.keywords_columns || [])];
    keywordColumns.push({ column: '', separator: ',' });
    const newSettings = {
      ...settings,
      keywords_columns: keywordColumns,
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const removeKeywordColumn = (index: number) => {
    const keywordColumns = [...(settings.keywords_columns || [])];
    keywordColumns.splice(index, 1);
    // Keep at least one keyword column
    if (keywordColumns.length === 0) {
      keywordColumns.push({ column: '', separator: ',' });
    }
    const newSettings = {
      ...settings,
      keywords_columns: keywordColumns,
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const getPreviewValues = (columnName: string): string[] => {
    if (!columnName || !previewData.length) return [];
    return previewData
      .slice(0, 3) // Show first 3 values
      .map((row) => row[columnName] || '')
      .filter((value) => value.trim() !== '');
  };

  const getKeywordsPreview = (
    keywordColumns: KeywordColumnConfig[]
  ): { columns: { column: string; input: string; parsed: string[] }[]; concatenated: string[] }[] => {
    if (!previewData.length) return [];

    // Filter to only columns that have been selected
    const validColumns = keywordColumns.filter((kc) => kc.column && kc.column.trim() !== '');
    if (validColumns.length === 0) return [];

    return previewData
      .slice(0, 2) // Show first 2 examples
      .map((row) => {
        const columnsData = validColumns.map((kc) => {
          const input = row[kc.column] || '';
          const parsed = input
            .split(kc.separator)
            .map((k) => k.trim())
            .filter((k) => k.length > 0);
          return { column: kc.column, input: input.trim(), parsed };
        });

        // Concatenate all keywords from all columns
        const allKeywords = columnsData.flatMap((cd) => cd.parsed);
        // Remove duplicates and sort
        const concatenated = Array.from(new Set(allKeywords)).sort();

        return { columns: columnsData, concatenated };
      })
      .filter((item) => item.columns.some((c) => c.input.length > 0));
  };

  return (
    <div className="mt-6">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between transition-all duration-300 rounded-xl border-2 ${
          isVisible
            ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-700 shadow-lg'
            : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-700/50 hover:border-purple-200 dark:hover:border-purple-700 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 dark:hover:from-purple-900/10 dark:hover:to-indigo-900/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg transition-colors ${
              isVisible ? 'bg-purple-100 dark:bg-purple-800/50' : 'bg-slate-100 dark:bg-slate-700'
            }`}
          >
            <Settings
              className={`w-5 h-5 transition-colors ${
                isVisible ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            />
          </div>
          <div className="text-left">
            <div
              className={`font-semibold transition-colors ${
                isVisible ? 'text-purple-900 dark:text-purple-100' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Advanced extraction
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Map additional columns for metadata</div>
          </div>
          <div className="ml-2">
            <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium rounded-full">
              Optional
            </span>
          </div>
        </div>

        <div className={`transition-transform duration-300 ${isVisible ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        </div>
      </button>

      {/* Advanced Options Panel */}
      {isVisible && (
        <div className="mt-4 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/70 dark:border-slate-700/70 rounded-xl shadow-sm">
          <div className="space-y-8">
            {/* Author Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Author Information</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Schema.org Person metadata</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="author-name-select"
                    className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Author Name
                  </label>
                  <select
                    id="author-name-select"
                    value={settings.author_name_column || ''}
                    onChange={(e) => handleColumnChange('author_name_column', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <option value="">None (skip)</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {settings.author_name_column && (
                    <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Name Preview</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getPreviewValues(settings.author_name_column).map((val, i) => (
                          <span
                            key={i}
                            className="inline-block bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs font-medium"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="author-email-select"
                    className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Author Email
                  </label>
                  <select
                    id="author-email-select"
                    value={settings.author_email_column || ''}
                    onChange={(e) => handleColumnChange('author_email_column', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <option value="">None (skip)</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {settings.author_email_column && (
                    <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <Link className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Email Preview</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getPreviewValues(settings.author_email_column).map((val, i) => (
                          <span
                            key={i}
                            className="inline-block bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs font-mono"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="author-affiliation-select"
                    className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Author Affiliation
                  </label>
                  <select
                    id="author-affiliation-select"
                    value={settings.author_affiliation_column || ''}
                    onChange={(e) => handleColumnChange('author_affiliation_column', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <option value="">None (skip)</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {settings.author_affiliation_column && (
                    <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          Affiliation Preview
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getPreviewValues(settings.author_affiliation_column).map((val, i) => (
                          <span
                            key={i}
                            className="inline-block bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Metadata */}
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
                <div>
                  <label
                    htmlFor="url-select"
                    className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    URL/Link
                  </label>
                  <select
                    id="url-select"
                    value={settings.url_column || ''}
                    onChange={(e) => handleColumnChange('url_column', e.target.value)}
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

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Keywords</label>

                  {/* Multiple Keyword Columns */}
                  <div className="space-y-3">
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
                                onChange={(e) => handleKeywordColumnChange(index, 'column', e.target.value)}
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
                                onChange={(e) => handleKeywordColumnChange(index, 'separator', e.target.value)}
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
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
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
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <button
                onClick={onToggle}
                className="group flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200"
              >
                <ChevronUp className="w-4 h-4 transition-transform group-hover:scale-110" />
                Collapse advanced options
              </button>
              <div className="flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Settings className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Settings will be applied during extraction
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
