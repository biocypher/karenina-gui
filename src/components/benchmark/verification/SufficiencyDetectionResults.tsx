import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { VerificationResult } from '../../../types';

interface SufficiencyDetectionResultsProps {
  template: NonNullable<VerificationResult['template']>;
}

export const SufficiencyDetectionResults: React.FC<SufficiencyDetectionResultsProps> = ({ template }) => {
  if (!template.sufficiency_check_performed) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Check Performed:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">
            {template.sufficiency_check_performed ? 'Yes' : 'No'}
          </p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Response Sufficient:</h5>
          <p className="text-slate-800 dark:text-slate-200 text-sm">
            {template.sufficiency_detected === true ? 'Yes' : template.sufficiency_detected === false ? 'No' : 'N/A'}
          </p>
        </div>
      </div>

      {/* Warning when response is insufficient and override was applied */}
      {template.sufficiency_detected === false && template.sufficiency_override_applied && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Result Overridden by Insufficiency Detection
            </span>
          </div>
          <p className="text-purple-700 dark:text-purple-300 text-sm mt-1">
            The model's response does not contain enough information to populate the answer template schema. The result
            was marked as failed regardless of other verification outcomes.
          </p>
          {template.sufficiency_reasoning && (
            <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800">
              <h5 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">Detector Reasoning:</h5>
              <p className="text-purple-700 dark:text-purple-300 text-sm">{template.sufficiency_reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
