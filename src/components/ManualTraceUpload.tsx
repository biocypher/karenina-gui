import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Card } from './ui/Card';

interface ManualTraceUploadProps {
  onUploadSuccess?: (traceCount: number) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  traceCount?: number;
}

export const ManualTraceUpload: React.FC<ManualTraceUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  className = ''
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
    } catch (error) {
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

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
        return <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Upload className="w-8 h-8 text-slate-400" />;
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
    <Card className={`p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Upload Manual Traces
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Upload a JSON file containing precomputed answer traces keyed by question hash.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${getStatusColor()}`}
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
      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Expected JSON Format:
        </h4>
        <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 p-3 rounded border overflow-x-auto">
{`{
  "abc123...": "This is the answer trace for question 1...",
  "def456...": "This is the answer trace for question 2...",
  "ghi789...": "This is the answer trace for question 3..."
}`}
        </pre>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          Keys must be 32-character MD5 hashes of questions. Values must be non-empty answer traces.
        </p>
      </div>
    </Card>
  );
};