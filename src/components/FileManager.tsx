import React, { useRef, useState } from 'react';
import { Upload, Download, FileText, Database, RotateCcw, CheckCircle, Settings } from 'lucide-react';
import { QuestionData, Checkpoint, UnifiedCheckpoint, JsonLdCheckpoint } from '../types';
import { useRubricStore } from '../stores/useRubricStore';
import { useDatasetStore } from '../stores/useDatasetStore';
import { DatasetMetadataEditor } from './DatasetMetadataEditor';
import {
  v2ToJsonLd,
  jsonLdToV2,
  isJsonLdCheckpoint,
  isV2Checkpoint,
  CheckpointConversionError,
} from '../utils/checkpoint-converter';

interface FileManagerProps {
  onLoadQuestionData: (data: QuestionData) => void;
  onLoadCheckpoint: (checkpoint: UnifiedCheckpoint) => void;
  onResetAllData: () => void;
  checkpoint: Checkpoint;
  questionData: QuestionData;
}

export const FileManager: React.FC<FileManagerProps> = ({
  onLoadQuestionData,
  onLoadCheckpoint,
  onResetAllData,
  checkpoint,
  questionData,
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const checkpointFileInputRef = useRef<HTMLInputElement>(null);

  // Dataset metadata editor state
  const [isDatasetEditorOpen, setIsDatasetEditorOpen] = useState(false);

  // Get current rubric and dataset metadata from stores
  const { currentRubric } = useRubricStore();
  const { metadata: datasetMetadata } = useDatasetStore();

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as QuestionData;

        // Validate the structure
        const isValidQuestionData = Object.values(data).every(
          (item) =>
            item &&
            typeof item.question === 'string' &&
            typeof item.raw_answer === 'string' &&
            typeof item.answer_template === 'string'
        );

        if (!isValidQuestionData) {
          alert('Invalid JSON format. Please ensure the file contains valid question data.');
          return;
        }

        onLoadQuestionData(data);
        alert(`Successfully loaded ${Object.keys(data).length} questions from JSON file.`);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error parsing JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Reset the input
    if (jsonFileInputRef.current) {
      jsonFileInputRef.current.value = '';
    }
  };

  const handleCheckpointUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        let unifiedCheckpoint: UnifiedCheckpoint;
        let formatUsed = '';

        // Check if it's a JSON-LD checkpoint
        if (isJsonLdCheckpoint(data)) {
          console.log('📊 Detected JSON-LD checkpoint format');
          formatUsed = 'JSON-LD v3.0';

          try {
            unifiedCheckpoint = jsonLdToV2(data as JsonLdCheckpoint);
            console.log('✅ Successfully converted JSON-LD to internal format');
          } catch (conversionError) {
            console.error('❌ JSON-LD conversion failed:', conversionError);
            if (conversionError instanceof CheckpointConversionError) {
              alert(
                `Failed to convert JSON-LD checkpoint:\n\n${conversionError.message}\n\nPlease check the file format and try again.`
              );
            } else {
              alert('Failed to convert JSON-LD checkpoint. Please check the file format.');
            }
            return;
          }
        }
        // Check if it's a legacy v2.0 checkpoint
        else if (isV2Checkpoint(data)) {
          console.log('📊 Detected legacy v2.0 checkpoint format');
          formatUsed = 'Legacy v2.0';

          // Show migration notice
          const shouldContinue = confirm(
            '⚠️ MIGRATION NOTICE\n\n' +
              'You are loading a legacy v2.0 checkpoint format.\n\n' +
              '• Legacy files will no longer be supported after this update\n' +
              '• This file will be converted to the new JSON-LD format when saved\n' +
              '• Consider downloading a new checkpoint after loading to migrate your data\n\n' +
              'Continue loading this legacy file?'
          );

          if (!shouldContinue) {
            return;
          }

          unifiedCheckpoint = data as UnifiedCheckpoint;

          // Validate checkpoint structure
          const isValidCheckpoint = Object.values(unifiedCheckpoint.checkpoint).every(
            (item) =>
              item &&
              typeof item.question === 'string' &&
              typeof item.raw_answer === 'string' &&
              typeof item.original_answer_template === 'string' &&
              typeof item.answer_template === 'string' &&
              typeof item.last_modified === 'string' &&
              typeof item.finished === 'boolean'
          );

          if (!isValidCheckpoint) {
            alert('Invalid v2.0 checkpoint data structure. Please ensure the file contains valid checkpoint data.');
            return;
          }
        }
        // Unknown format
        else {
          alert(
            '❌ Unrecognized checkpoint format.\n\n' +
              'Supported formats:\n' +
              '• JSON-LD v3.0 (current)\n' +
              '• Legacy v2.0 (deprecated)\n\n' +
              'Please ensure the file is a valid checkpoint.'
          );
          return;
        }

        // Load checkpoint into question store
        onLoadCheckpoint(unifiedCheckpoint);

        // Load dataset metadata into dataset store if present
        if (unifiedCheckpoint.dataset_metadata) {
          const { setMetadata } = useDatasetStore.getState();
          setMetadata(unifiedCheckpoint.dataset_metadata);
          console.log('✅ Loaded dataset metadata:', unifiedCheckpoint.dataset_metadata.name || 'Unnamed dataset');
        }

        // Load global rubric into rubric store if present
        if (unifiedCheckpoint.global_rubric) {
          const { setCurrentRubric, saveRubric } = useRubricStore.getState();
          setCurrentRubric(unifiedCheckpoint.global_rubric);
          console.log('✅ Loaded global rubric with', unifiedCheckpoint.global_rubric.traits.length, 'traits');

          // Sync the rubric to the backend so verification can access it
          console.log('🔄 Syncing global rubric to backend...');
          saveRubric()
            .then(() => {
              console.log('✅ Global rubric synced to backend successfully');
            })
            .catch((error) => {
              console.error('❌ Failed to sync global rubric to backend:', error);
              alert(
                'Warning: Global rubric loaded but failed to sync to backend. Verification may not use global rubric traits.'
              );
            });
        }

        const itemCount = Object.keys(unifiedCheckpoint.checkpoint).length;
        const rubricText = unifiedCheckpoint.global_rubric
          ? ` and global rubric with ${unifiedCheckpoint.global_rubric.traits.length} traits`
          : '';

        alert(
          `✅ Successfully loaded ${formatUsed} checkpoint with ${itemCount} items${rubricText}.\n\n` +
            '📦 Your complete session has been restored!\n\n'
        );
      } catch (error) {
        console.error('Error parsing checkpoint:', error);
        alert('Error parsing checkpoint file. Please check the file format and ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);

    // Reset the input
    if (checkpointFileInputRef.current) {
      checkpointFileInputRef.current.value = '';
    }
  };

  const downloadCheckpoint = () => {
    if (Object.keys(checkpoint).length === 0) {
      alert('No checkpoint data to download. Please make some changes first.');
      return;
    }

    try {
      // Create unified checkpoint with global rubric and dataset metadata
      const unifiedCheckpoint: UnifiedCheckpoint = {
        version: '2.0',
        global_rubric: currentRubric,
        dataset_metadata: datasetMetadata,
        checkpoint: checkpoint,
      };

      // Convert to JSON-LD format
      console.log('📊 Converting checkpoint to JSON-LD format...');
      const jsonLdCheckpoint = v2ToJsonLd(unifiedCheckpoint, {
        preserveIds: true,
        includeMetadata: true,
        validateOutput: true,
      });

      console.log('✅ Successfully converted to JSON-LD format');

      const dataStr = JSON.stringify(jsonLdCheckpoint, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/ld+json' });
      const url = URL.createObjectURL(dataBlob);

      const timestamp = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `karenina_checkpoint_${timestamp}.jsonld`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // Show success message with format info
      const itemCount = Object.keys(checkpoint).length;
      const rubricInfo = currentRubric ? ` and ${currentRubric.traits.length} rubric traits` : '';

      alert(
        `✅ Checkpoint downloaded successfully!\n\n` +
          `📊 Format: JSON-LD v3.0 (schema.org)\n` +
          `📁 File: karenina_checkpoint_${timestamp}.jsonld\n` +
          `📦 Contains: ${itemCount} questions${rubricInfo}\n\n` +
          `🎉 Your data is now in semantic web format and compatible with linked data tools!`
      );
    } catch (conversionError) {
      console.error('❌ Failed to convert checkpoint to JSON-LD:', conversionError);

      if (conversionError instanceof CheckpointConversionError) {
        alert(
          `❌ Failed to export checkpoint:\n\n${conversionError.message}\n\n` +
            'Please check your data and try again, or contact support if the problem persists.'
        );
      } else {
        alert('❌ Failed to export checkpoint. Please try again or contact support.');
      }
    }
  };

  const downloadQuestionData = () => {
    if (Object.keys(questionData).length === 0) {
      alert('No question data to download.');
      return;
    }

    const dataStr = JSON.stringify(questionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `question_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const downloadFinishedItems = () => {
    // Get all finished items from checkpoint
    const finishedItems = Object.entries(checkpoint).filter(([, item]) => item.finished);

    if (finishedItems.length === 0) {
      alert('No finished items to download. Please mark some items as finished first.');
      return;
    }

    // Create question data with updated answer templates for finished items
    const finishedQuestionData: QuestionData = {};

    finishedItems.forEach(([questionId, checkpointItem]) => {
      // Use checkpoint data directly (new format has all necessary info)
      finishedQuestionData[questionId] = {
        question: checkpointItem.question,
        raw_answer: checkpointItem.raw_answer,
        answer_template: checkpointItem.answer_template,
      };
    });

    const dataStr = JSON.stringify(finishedQuestionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `finished_items_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Count finished items
  const finishedCount = Object.values(checkpoint).filter((item) => item.finished).length;

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
        <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        File Management
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Upload Files
          </h4>

          {/* JSON Upload */}
          <div>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonUpload}
              className="hidden"
              id="json-upload"
            />
            <label
              htmlFor="json-upload"
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <FileText className="w-4 h-4" />
              Upload Question Data
            </label>
          </div>

          {/* Checkpoint Upload */}
          <div>
            <input
              ref={checkpointFileInputRef}
              type="file"
              accept=".json,.jsonld"
              onChange={handleCheckpointUpload}
              className="hidden"
              id="checkpoint-upload"
            />
            <label
              htmlFor="checkpoint-upload"
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-700 dark:to-teal-700 dark:hover:from-emerald-800 dark:hover:to-teal-800 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Database className="w-4 h-4" />
              Upload Checkpoint
            </label>
          </div>
        </div>

        {/* Download Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Download Files
          </h4>

          {/* Question Data Download */}
          <button
            onClick={downloadQuestionData}
            disabled={Object.keys(questionData).length === 0}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-600 dark:disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <FileText className="w-4 h-4" />
            Download Question Data
          </button>

          {/* Checkpoint Download */}
          <button
            onClick={downloadCheckpoint}
            disabled={Object.keys(checkpoint).length === 0}
            className="w-full px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 dark:from-amber-700 dark:to-orange-700 dark:hover:from-amber-800 dark:hover:to-orange-800 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-600 dark:disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <Database className="w-4 h-4" />
            Download Checkpoint
          </button>

          {/* Finished Items Download */}
          <button
            onClick={downloadFinishedItems}
            disabled={finishedCount === 0}
            className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 dark:from-emerald-700 dark:to-green-700 dark:hover:from-emerald-800 dark:hover:to-green-800 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-600 dark:disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <CheckCircle className="w-4 h-4" />
            Download Finished Items
          </button>
        </div>

        {/* Actions Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
            <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" />
            Actions
          </h4>

          {/* Dataset Metadata Button */}
          <button
            onClick={() => setIsDatasetEditorOpen(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 dark:from-blue-700 dark:to-cyan-700 dark:hover:from-blue-800 dark:hover:to-cyan-800 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Settings className="w-4 h-4" />
            Dataset Metadata
          </button>

          {/* Dataset Name Display */}
          {datasetMetadata.name && (
            <div className="text-xs text-slate-600 dark:text-slate-400 text-center py-2 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg">
              Dataset: <span className="font-medium text-slate-700 dark:text-slate-300">{datasetMetadata.name}</span>
            </div>
          )}

          {/* Reset All Data */}
          <button
            onClick={onResetAllData}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 dark:from-red-700 dark:to-rose-700 dark:hover:from-red-800 dark:hover:to-rose-800 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All Data
          </button>

          <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg">
            This will clear all questions, templates, and progress
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-inner">
        <h5 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
          <Database className="w-4 h-4" />
          File Formats
        </h5>
        <div className="text-xs text-indigo-800 dark:text-indigo-300 space-y-1">
          <p>
            <strong>Question Data:</strong> Upload/download extracted questions
          </p>
          <p>
            <strong>Checkpoint:</strong> Save/restore complete session with progress
          </p>
          <p>
            <strong>Finished Items:</strong> Export completed questions only
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{Object.keys(questionData).length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Questions Loaded</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-xl border border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{Object.keys(checkpoint).length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Items in Checkpoint</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm">
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{finishedCount}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Finished Items</div>
        </div>
      </div>

      {/* Dataset Metadata Editor Modal */}
      <DatasetMetadataEditor
        isOpen={isDatasetEditorOpen}
        onClose={() => setIsDatasetEditorOpen(false)}
        onSave={() => {
          // The save is handled by the DatasetMetadataEditor component itself
          // We just need to close the modal
          console.log('✅ Dataset metadata updated');
        }}
      />
    </div>
  );
};
