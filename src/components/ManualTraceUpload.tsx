import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

interface ManualTraceUploadProps {
  onUploadSuccess?: (traceCount: number) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  finishedTemplates?: Array<[string, unknown]>;
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  traceCount?: number;
}

export const ManualTraceUpload: React.FC<ManualTraceUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  className = '',
  finishedTemplates
}) => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: ''
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadStatus({ status: 'uploading', message: 'Uploading manual traces...' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-manual-traces', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Upload failed');
      }

      setUploadStatus({
        status: 'success',
        message: result.message,
        traceCount: result.trace_count
      });

      onUploadSuccess?.(result.trace_count);
    } catch {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadStatus({
        status: 'error',
        message: errorMessage
      });
      onUploadError?.(errorMessage);
    }
  }, [onUploadSuccess, onUploadError]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        setUploadStatus({
          status: 'error',
          message: 'Please upload a JSON file'
        });
        return;
      }
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const clearStatus = useCallback(() => {
    setUploadStatus({ status: 'idle', message: '' });
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    if (!finishedTemplates?.length) {
      setUploadStatus({
        status: 'error',
        message: 'No finished templates available'
      });
      return;
    }

    try {
      // Create empty template JSON with question hashes as keys
      const emptyTemplate = finishedTemplates.reduce((acc, [questionHash]) => {
        acc[questionHash] = "";
        return acc;
      }, {} as Record<string, string>);

      // Download JSON file
      const blob = new Blob([JSON.stringify(emptyTemplate, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual-traces-template-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message briefly
      setUploadStatus({
        status: 'success',
        message: `Downloaded template with ${finishedTemplates.length} question hashes`
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUploadStatus({ status: 'idle', message: '' });
      }, 3000);
    } catch {
      setUploadStatus({
        status: 'error',
        message: 'Failed to generate template file'
      });
    }
  }, [finishedTemplates]);

  const handleDownloadCsvMapper = useCallback(() => {
    if (!finishedTemplates?.length) {
      setUploadStatus({
        status: 'error',
        message: 'No finished templates available'
      });
      return;
    }

    try {
      // Create CSV content with headers
      const csvHeader = 'Question Hash,Raw Question\n';
      const csvRows = finishedTemplates.map(([questionHash, templateData]) => {
        // Escape quotes in the question text and wrap in quotes
        const escapedQuestion = (templateData.question || '').replace(/"/g, '""');
        return `"${questionHash}","${escapedQuestion}"`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;

      // Download CSV file
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `question-hash-mapper-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message briefly
      setUploadStatus({
        status: 'success',
        message: `Downloaded CSV mapper with ${finishedTemplates.length} questions`
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUploadStatus({ status: 'idle', message: '' });
      }, 3000);
    } catch {
      setUploadStatus({
        status: 'error',
        message: 'Failed to generate CSV mapper file'
      });
    }
  }, [finishedTemplates]);

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
        return <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Upload className="w-6 h-6 text-slate-400" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case 'success':
        return 'border-green-300 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-red-300 bg-red-50 dark:bg-red-900/20';
      case 'uploading':
        return 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20';
      default:
        return isDragOver 
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400';
    }
  };

  return (
    <div className={className}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Upload Manual Traces
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload a JSON file with precomputed answer traces keyed by question hash.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${getStatusColor()}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          disabled={uploadStatus.status === 'uploading'}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center gap-3">
          {getStatusIcon()}
          
          {uploadStatus.status === 'idle' && (
            <>
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  Click to upload
                </span> or drag and drop
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                JSON files only
              </p>
            </>
          )}

          {uploadStatus.status !== 'idle' && (
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium ${
                uploadStatus.status === 'success' ? 'text-green-700 dark:text-green-400' :
                uploadStatus.status === 'error' ? 'text-red-700 dark:text-red-400' :
                'text-indigo-700 dark:text-indigo-400'
              }`}>
                {uploadStatus.message}
              </p>
              
              {uploadStatus.status !== 'uploading' && (
                <button
                  onClick={clearStatus}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded">
        <div className="flex items-center justify-between mb-1">
          <h5 className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Expected JSON Format:
          </h5>
          {finishedTemplates?.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleDownloadTemplate}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline hover:no-underline transition-all"
              >
                Download empty template
              </button>
              <span className="text-xs text-slate-400">|</span>
              <button
                onClick={handleDownloadCsvMapper}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline hover:no-underline transition-all"
              >
                Download CSV mapper
              </button>
            </div>
          )}
        </div>
        <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 p-2 rounded border overflow-x-auto">
{`{
  "abc123...": "Answer trace 1...",
  "def456...": "Answer trace 2..."
}`}
        </pre>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          Keys: 32-char MD5 hashes. Values: non-empty traces.
          {finishedTemplates?.length > 0 && (
            <span className="ml-1 text-indigo-600 dark:text-indigo-400">
              ({finishedTemplates.length} templates available)
            </span>
          )}
        </p>
        {finishedTemplates?.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            CSV Mapper: reference file mapping hashes to question text.
          </p>
        )}
      </div>
    </div>
  );
};