import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { validateDataFile } from '../../utils/fileValidator';

// ============================================================================
// Types
// ============================================================================

export interface FileUploaderProps {
  isUploading: boolean;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (file: File | { file: File; error: string }) => void;
}

// ============================================================================
// Component
// ============================================================================

export const FileUploader: React.FC<FileUploaderProps> = ({
  isUploading,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateDataFile(file);

      if (validation.valid) {
        onFileSelect(file);
      } else {
        onFileSelect({ file, error: validation.error || 'Please upload a valid file format' });
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-8">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        Upload Question File
      </h3>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
          aria-label="Select File"
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isDragOver ? 'bg-indigo-200 dark:bg-indigo-800' : 'bg-indigo-100 dark:bg-indigo-900/40'
            }`}
          >
            <Upload
              className={`w-8 h-8 ${isDragOver ? 'text-indigo-700 dark:text-indigo-300' : 'text-indigo-600 dark:text-indigo-400'}`}
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {isDragOver ? 'Drop your file here' : 'Choose a file to upload'}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Drag and drop or click to select • Supports Excel (.xlsx, .xls), CSV (.csv), and TSV (.tsv, .txt) files
            </p>
          </div>
          <button
            type="button"
            onClick={handleClick}
            disabled={isUploading}
            className="px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors font-medium"
          >
            {isUploading ? 'Uploading...' : 'Select File'}
          </button>
        </div>
      </div>
    </div>
  );
};
