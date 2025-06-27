import React from 'react';
import { CheckCircle, Download } from 'lucide-react';
import { TemplateGenerationResult } from '../types';
import { formatDuration } from './TemplateProgress';

interface TemplateResultsProps {
  result: TemplateGenerationResult | null;
  onDownloadResults: () => void;
}

export const TemplateResults: React.FC<TemplateResultsProps> = ({ result, onDownloadResults }) => {
  if (!result) return null;

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          Generation Complete
        </h3>
        <div className="flex gap-3">
          <button
            onClick={onDownloadResults}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            Download Latest Batch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="text-blue-800 dark:text-blue-300 font-medium">Latest Batch</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{result.total_templates}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-100 dark:border-green-800">
          <div className="text-green-800 dark:text-green-300 font-medium">Success Rate</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-200">
            {Math.round((result.successful_generations / result.total_templates) * 100)}%
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
          <div className="text-purple-800 dark:text-purple-300 font-medium">Avg. Time</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
            {formatDuration(result.average_generation_time)}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
          <div className="text-slate-800 dark:text-slate-300 font-medium">Model Used</div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-200">{result.model_info.name}</div>
        </div>
      </div>

      {result.failed_generations > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="text-yellow-800 dark:text-yellow-300 text-sm">
            <strong>Warning:</strong> {result.failed_generations} template(s) failed to generate.
            Check the downloaded file for details.
          </div>
        </div>
      )}
    </div>
  );
};