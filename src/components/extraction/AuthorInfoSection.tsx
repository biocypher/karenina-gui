import React from 'react';
import { User, Link, Building } from 'lucide-react';

export interface MetadataColumnSettings {
  author_name_column?: string;
  author_email_column?: string;
  author_affiliation_column?: string;
}

interface AuthorInfoSectionProps {
  settings: Pick<MetadataColumnSettings, 'author_name_column' | 'author_email_column' | 'author_affiliation_column'>;
  columns: string[];
  onColumnChange: (field: keyof MetadataColumnSettings, value: string) => void;
  getPreviewValues: (columnName: string) => string[];
}

export const AuthorInfoSection: React.FC<AuthorInfoSectionProps> = ({
  settings,
  columns,
  onColumnChange,
  getPreviewValues,
}) => {
  return (
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
        {/* Author Name */}
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
            onChange={(e) => onColumnChange('author_name_column', e.target.value)}
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

        {/* Author Email */}
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
            onChange={(e) => onColumnChange('author_email_column', e.target.value)}
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

        {/* Author Affiliation */}
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
            onChange={(e) => onColumnChange('author_affiliation_column', e.target.value)}
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
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Affiliation Preview</span>
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
  );
};
