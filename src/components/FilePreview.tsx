import React from 'react';
import { Table, AlertCircle, Info, FileText, Grid } from 'lucide-react';

interface PreviewData {
  success: boolean;
  total_rows?: number;
  columns?: string[];
  preview_rows?: number;
  data?: Record<string, string>[];
  error?: string;
}

interface FilePreviewProps {
  data: PreviewData;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ data }) => {
  if (!data.success) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <FileText className="w-5 h-5" />
          <span className="font-semibold">Error Loading File</span>
        </div>
        <p className="text-red-700 dark:text-red-300">{data.error}</p>
      </div>
    );
  }

  if (!data.columns || !data.data) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <FileText className="w-5 h-5" />
          <span>No file selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Grid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">File Preview</h3>
          <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
            Showing {Math.min(data.preview_rows || 0, data.total_rows || 0)} of {data.total_rows?.toLocaleString()} rows
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700">
                <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">#</th>
                {data.columns.map((header) => (
                  <th key={header} className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={header}>
                        {header}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-600">
              {data.data.slice(0, data.preview_rows || 0).map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                    rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-25 dark:bg-slate-750'
                  }`}
                >
                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                    {rowIndex + 1}
                  </td>
                  {data.columns.map((column, colIndex) => (
                    <td key={`${rowIndex}-${column}`} className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                      <div className="max-w-xs truncate" title={row[column] || ''}>
                        {row[column] || (
                          <span className="text-slate-400 italic">empty</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.total_rows && data.preview_rows && data.total_rows > data.preview_rows && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-sm">
              <Info className="w-4 h-4" />
              <span className="font-medium">
                This is a preview of the first {data.preview_rows} rows. The table is scrollable both horizontally and vertically. ({data.total_rows - data.preview_rows} more rows in full file)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 