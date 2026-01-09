import React from 'react';
import type { VerificationResult } from '../../../types';

interface ResultMetadataProps {
  metadata: VerificationResult['metadata'];
  template?: VerificationResult['template'];
}

export const ResultMetadata: React.FC<ResultMetadataProps> = ({ metadata, template }) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Answering Model:</span>
          <p className="text-slate-800 dark:text-slate-200">{metadata?.answering_model || 'N/A'}</p>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Parsing Model:</span>
          <p className="text-slate-800 dark:text-slate-200">{metadata?.parsing_model || 'N/A'}</p>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Execution Time:</span>
          <p className="text-slate-800 dark:text-slate-200">
            {metadata?.execution_time ? `${metadata.execution_time.toFixed(2)}s` : 'N/A'}
          </p>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Timestamp:</span>
          <p className="text-slate-800 dark:text-slate-200">
            {metadata?.timestamp ? new Date(metadata.timestamp).toLocaleString() : 'N/A'}
          </p>
        </div>
        {template?.answering_mcp_servers && template.answering_mcp_servers.length > 0 && (
          <div className="col-span-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">MCP Servers:</span>
            <p className="text-slate-800 dark:text-slate-200">{template.answering_mcp_servers.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
