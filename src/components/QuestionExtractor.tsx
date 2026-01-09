import React, { useState } from 'react';
import { FilePreview } from './FilePreview';
import { QuestionVisualizer } from './QuestionVisualizer';
import { QuestionData } from '../types';
import { useTemplateStore } from '../stores/useTemplateStore';
import { logger } from '../utils/logger';
import { FileUploader, ColumnConfiguration, ExtractionResults, FileInfo, ErrorDisplay } from './extraction';

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
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileSelect = async (fileOrError: File | { file: File; error: string }) => {
    // Check if this is an error from FileUploader validation
    if ('error' in fileOrError) {
      setLocalError(fileOrError.error);
      return;
    }
    await uploadFile(fileOrError);
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
      handleFileSelect(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setLocalError(null);
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
      logger.error('EXTRACTOR', 'Upload error', 'QuestionExtractor', { error });
      setLocalError('Failed to upload file. Please try again.');
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
      logger.error('EXTRACTOR', 'Preview error', 'QuestionExtractor', { error });
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
      logger.error('EXTRACTOR', 'Extraction error', 'QuestionExtractor', { error });
      setExtractionResult({ success: false, error: 'Failed to extract questions' });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReset = () => {
    resetExtractionWorkflow();
    setExtractionResult(null);
    setLocalError(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Step 1: File Upload */}
      {currentStep === 'upload' && (
        <FileUploader
          isUploading={isUploading}
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
        />
      )}

      {/* Step 2 & 3: Preview and Configure */}
      {(currentStep === 'preview' || currentStep === 'configure') && previewData && (
        <div className="space-y-6">
          {/* File Info */}
          <FileInfo
            filename={uploadedFile?.filename || ''}
            size={uploadedFile?.size}
            totalRows={previewData.total_rows}
            onReset={handleReset}
          />

          {/* Column Configuration */}
          {currentStep === 'configure' && (
            <ColumnConfiguration
              previewData={previewData}
              selectedQuestionColumn={selectedQuestionColumn}
              selectedAnswerColumn={selectedAnswerColumn}
              advancedVisible={advancedVisible}
              isExtracting={isExtracting}
              onQuestionColumnChange={setSelectedQuestionColumn}
              onAnswerColumnChange={setSelectedAnswerColumn}
              onAdvancedToggle={() => setAdvancedVisible(!advancedVisible)}
              onMetadataSettingsChange={setMetadataSettings}
              onExtract={handleExtractQuestions}
            />
          )}

          {/* File Preview */}
          <FilePreview data={previewData} />
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 'visualize' && Object.keys(extractedQuestions).length > 0 && (
        <div className="space-y-6">
          {/* Results Summary */}
          <ExtractionResults extractedQuestions={extractedQuestions} onReset={handleReset} />

          {/* Question Visualizer */}
          <QuestionVisualizer questions={extractedQuestions} />
        </div>
      )}

      {/* Error Display */}
      <ErrorDisplay
        error={localError || previewData?.error || extractionResult?.error}
        localError={localError}
        onDismiss={() => setLocalError(null)}
      />
    </div>
  );
};
