import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { AuthorInfoSection } from './extraction/AuthorInfoSection';
import { AdditionalMetadataSection, KeywordColumnConfig } from './extraction/AdditionalMetadataSection';

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
            <AuthorInfoSection
              settings={{
                author_name_column: settings.author_name_column,
                author_email_column: settings.author_email_column,
                author_affiliation_column: settings.author_affiliation_column,
              }}
              columns={columns}
              onColumnChange={handleColumnChange}
              getPreviewValues={getPreviewValues}
            />

            {/* Additional Metadata */}
            <AdditionalMetadataSection
              settings={{
                url_column: settings.url_column,
                keywords_columns: settings.keywords_columns,
              }}
              columns={columns}
              onColumnChange={handleColumnChange}
              onKeywordColumnChange={handleKeywordColumnChange}
              addKeywordColumn={addKeywordColumn}
              removeKeywordColumn={removeKeywordColumn}
              getPreviewValues={getPreviewValues}
              getKeywordsPreview={getKeywordsPreview}
            />
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
