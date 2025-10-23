import React, { useState, useRef } from 'react';
import { Upload, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { FilePreview } from './FilePreview';
import { QuestionVisualizer } from './QuestionVisualizer';
import { AdvancedExtractionPanel } from './AdvancedExtractionPanel';
import { QuestionData } from '../types';
import { useTemplateStore } from '../stores/useTemplateStore';

interface ExtractedQuestions {
  success: boolean;
  questions_count?: number;
  questions_data?: QuestionData;
  error?: string;
}

interface QuestionExtractorProps {
  onQuestionsExtracted?: (questions: QuestionData) => void;
  extractedQuestions?: QuestionData;
}

export const QuestionExtractor: React.FC<QuestionExtractorProps> = ({ onQuestionsExtracted }) => {
  // Get state from the store
  const uploadedFile = useTemplateStore((state) => state.uploadedFile);
  const previewData = useTemplateStore((state) => state.previewData);
  const selectedQuestionColumn = useTemplateStore((state) => state.selectedQuestionColumn);
  const selectedAnswerColumn = useTemplateStore((state) => state.selectedAnswerColumn);
  const selectedSheet = useTemplateStore((state) => state.selectedSheet);
  const currentStep = useTemplateStore((state) => state.currentStep);
  const advancedVisible = useTemplateStore((state) => state.advancedVisible);
  const metadataSettings = useTemplateStore((state) => state.metadataSettings);
  const extractedQuestions = useTemplateStore((state) => state.extractedQuestions);

  // Get setters from the store
  const setUploadedFile = useTemplateStore((state) => state.setUploadedFile);
  const setPreviewData = useTemplateStore((state) => state.setPreviewData);
  const setSelectedQuestionColumn = useTemplateStore((state) => state.setSelectedQuestionColumn);
  const setSelectedAnswerColumn = useTemplateStore((state) => state.setSelectedAnswerColumn);
  const setCurrentStep = useTemplateStore((state) => state.setCurrentStep);
  const setAdvancedVisible = useTemplateStore((state) => state.setAdvancedVisible);
  const setMetadataSettings = useTemplateStore((state) => state.setMetadataSettings);
  const setExtractedQuestions = useTemplateStore((state) => state.setExtractedQuestions);
  const resetExtractionWorkflow = useTemplateStore((state) => state.resetExtractionWorkflow);

  // Local UI state (not persisted)
  const [isUploading, setIsUploading] = useState(false);
  const [, setIsPreviewing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractedQuestions | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;
    uploadFile(file);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Validate file type
      const validExtensions = ['.xlsx', '.xls', '.csv', '.tsv', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (validExtensions.includes(fileExtension)) {
        handleFileSelect(file);
      } else {
        alert('Please upload a valid file format: Excel (.xlsx, .xls), CSV (.csv), or TSV (.tsv, .txt)');
      }
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadedFile(result);
      setCurrentStep('preview');

      // Auto-preview the file
      await handlePreviewFile(result.file_id);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewFile = async (fileId?: string) => {
    const id = fileId || uploadedFile?.file_id;
    if (!id) return;

    setIsPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file_id', id);
      if (selectedSheet) {
        formData.append('sheet_name', selectedSheet);
      }

      const response = await fetch('/api/preview-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const result = await response.json();
      setPreviewData(result);

      if (result.success && result.columns) {
        // Auto-select columns if they match common patterns
        const questionCol = result.columns.find(
          (col: string) => col.toLowerCase().includes('question') || col.toLowerCase().includes('q')
        );
        const answerCol = result.columns.find(
          (col: string) => col.toLowerCase().includes('answer') || col.toLowerCase().includes('a')
        );

        if (questionCol) setSelectedQuestionColumn(questionCol);
        if (answerCol) setSelectedAnswerColumn(answerCol);

        setCurrentStep('configure');
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewData({ success: false, error: 'Failed to preview file' });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExtractQuestions = async () => {
    if (!uploadedFile || !selectedQuestionColumn || !selectedAnswerColumn) return;

    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: uploadedFile.file_id,
          question_column: selectedQuestionColumn,
          answer_column: selectedAnswerColumn,
          sheet_name: selectedSheet || null,
          // Optional metadata columns
          author_name_column: metadataSettings.author_name_column || null,
          author_email_column: metadataSettings.author_email_column || null,
          author_affiliation_column: metadataSettings.author_affiliation_column || null,
          url_column: metadataSettings.url_column || null,
          // New format: multiple keyword columns with individual separators
          keywords_columns: metadataSettings.keywords_columns
            ? metadataSettings.keywords_columns
                .filter((kc) => kc.column && kc.column.trim() !== '') // Only send non-empty columns
                .map((kc) => ({ column: kc.column, separator: kc.separator }))
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Extraction failed');
      }

      const result = await response.json();
      setExtractionResult(result);

      if (result.success && result.questions_data) {
        setCurrentStep('visualize');
        // Store the extracted questions in the store
        setExtractedQuestions(result.questions_data);
        // Call the callback to notify parent
        if (onQuestionsExtracted) {
          onQuestionsExtracted(result.questions_data);
        }
      }
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionResult({ success: false, error: 'Failed to extract questions' });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReset = () => {
    resetExtractionWorkflow();
    setExtractionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Step 1: File Upload */}
      {currentStep === 'upload' && (
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                  Drag and drop or click to select • Supports Excel (.xlsx, .xls), CSV (.csv), and TSV (.tsv, .txt)
                  files
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors font-medium"
              >
                {isUploading ? 'Uploading...' : 'Select File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 & 3: Preview and Configure */}
      {(currentStep === 'preview' || currentStep === 'configure') && previewData && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {uploadedFile?.filename}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {previewData.total_rows?.toLocaleString()} rows •{' '}
                  {uploadedFile?.size ? Math.round(uploadedFile.size / 1024) : 0} KB
                </p>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-colors font-medium"
              >
                Start Over
              </button>
            </div>
          </div>

          {/* Column Configuration */}
          {currentStep === 'configure' && (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Configure Columns
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Question Column
                  </label>
                  <select
                    value={selectedQuestionColumn}
                    onChange={(e) => setSelectedQuestionColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select column...</option>
                    {previewData.columns?.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Answer Column
                  </label>
                  <select
                    value={selectedAnswerColumn}
                    onChange={(e) => setSelectedAnswerColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select column...</option>
                    {previewData.columns?.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advanced Extraction Panel - Only show after basic columns are selected */}
              {selectedQuestionColumn && selectedAnswerColumn && previewData.columns && (
                <AdvancedExtractionPanel
                  columns={previewData.columns}
                  isVisible={advancedVisible}
                  onToggle={() => setAdvancedVisible(!advancedVisible)}
                  onSettingsChange={setMetadataSettings}
                  previewData={previewData.data}
                />
              )}

              <div className="flex items-center gap-4 mt-8">
                <button
                  onClick={handleExtractQuestions}
                  disabled={!selectedQuestionColumn || !selectedAnswerColumn || isExtracting}
                  className="px-6 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors font-medium"
                >
                  {isExtracting ? 'Extracting...' : 'Extract Questions'}
                </button>

                {selectedQuestionColumn && selectedAnswerColumn && (
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Ready to extract
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File Preview */}
          <FilePreview data={previewData} />
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 'visualize' && Object.keys(extractedQuestions).length > 0 && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Extraction Complete
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Successfully extracted {Object.keys(extractedQuestions).length} questions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-colors font-medium"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>

          {/* Question Visualizer */}
          <QuestionVisualizer questions={extractedQuestions} />
        </div>
      )}

      {/* Error States */}
      {(previewData?.error || extractionResult?.error) && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 dark:text-red-300 mt-1">{previewData?.error || extractionResult?.error}</p>
        </div>
      )}
    </div>
  );
};
