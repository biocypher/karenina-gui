import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { VerificationResult } from '../../../types';

interface AbstentionDetectionResultsProps {
  template: NonNullable<VerificationResult['template']>;
}

export const AbstentionDetectionResults: React.FC<AbstentionDetectionResultsProps> = ({ template }) => {
  if (!template.abstention_check_performed) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Check Performed:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">
            {template.abstention_check_performed ? 'Yes' : 'No'}
          </p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Abstention Detected:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">
            {template.abstention_detected === true ? 'Yes' : template.abstention_detected === false ? 'No' : 'N/A'}
          </p>
        </div>
      </div>

      {template.abstention_detected && template.abstention_override_applied && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Result Overridden by Abstention Detection
            </span>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
            The model refused to answer or abstained from providing a substantive response. The result was marked as
            abstained regardless of other verification outcomes.
          </p>
          {template.abstention_reasoning && (
            <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Detector Reasoning:</h5>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">{template.abstention_reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
