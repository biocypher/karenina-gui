import { Checkpoint } from '../types';
import { useDatasetStore } from '../stores/useDatasetStore';
import { useRubricStore } from '../stores/useRubricStore';

/**
 * Auto-save the current checkpoint to the connected database.
 * This function is called automatically after verification runs or when downloading checkpoints.
 */
export async function autoSaveToDatabase(checkpoint: Checkpoint): Promise<void> {
  const { isConnectedToDatabase, storageUrl, currentBenchmarkName, metadata, setIsSaving, setLastSaved, setSaveError } =
    useDatasetStore.getState();

  console.log('🔍 autoSaveToDatabase called', {
    isConnectedToDatabase,
    hasStorageUrl: !!storageUrl,
    currentBenchmarkName,
    checkpointSize: Object.keys(checkpoint).length,
  });

  // Only proceed if connected to database
  if (!isConnectedToDatabase || !storageUrl || !currentBenchmarkName) {
    const reason = !isConnectedToDatabase
      ? 'not connected to database'
      : !storageUrl
        ? 'no storage URL'
        : 'no benchmark name';
    console.warn(`⏭️ Skipping database auto-save: ${reason}`, {
      isConnectedToDatabase,
      storageUrl,
      currentBenchmarkName,
    });
    return;
  }

  console.log('💾 Auto-saving to database...', {
    benchmarkName: currentBenchmarkName,
    storageUrl: storageUrl.substring(0, 30) + '...',
  });
  setIsSaving(true);
  setSaveError(null);

  try {
    // Get global rubric
    const { currentRubric } = useRubricStore.getState();

    // Create checkpoint data in the same format used for loading
    const checkpointData = {
      dataset_metadata: metadata,
      questions: checkpoint,
      global_rubric: currentRubric,
    };

    // Call the save-benchmark API with detect_duplicates=false
    // This allows updating existing questions without triggering duplicate detection
    const response = await fetch('/api/database/save-benchmark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storage_url: storageUrl,
        benchmark_name: currentBenchmarkName,
        checkpoint_data: checkpointData,
        detect_duplicates: false, // Skip duplicate detection for auto-save
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.detail || 'Failed to save to database';
      console.error('❌ Database save failed with HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Update last saved timestamp
    setLastSaved(data.last_modified || new Date().toISOString());

    console.log('✅ Auto-saved to database successfully', {
      benchmarkName: currentBenchmarkName,
      lastModified: data.last_modified,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to auto-save to database:', {
      error: errorMessage,
      fullError: error,
    });
    setSaveError(errorMessage);

    // Check if it's a duplicate question error
    if (errorMessage.includes('UNIQUE constraint failed: questions.question_text')) {
      const betterError = new Error(
        'Cannot save: A question with this text already exists in the database.\n\n' +
          'This can happen when:\n' +
          '• You loaded a benchmark and added a question that already exists\n' +
          '• The question was previously saved to the database\n\n' +
          'To resolve:\n' +
          '1. Use "Export current quest. to Benchmark" button in Database Manager for proper duplicate handling\n' +
          '2. Or modify the question text to make it unique\n' +
          '3. Or download the checkpoint locally instead'
      );
      throw betterError;
    }

    // Re-throw the error so the caller can handle it (e.g., show alert)
    throw error;
  } finally {
    setIsSaving(false);
  }
}

/**
 * Show a toast notification for database save events.
 * This is a helper function for displaying user feedback.
 */
export function showSaveNotification(type: 'success' | 'error', message: string): void {
  // For now, use browser alerts. In the future, this can be replaced with a toast library
  if (type === 'success') {
    // Success notifications can be less intrusive
    console.log(`✅ ${message}`);
  } else {
    // Error notifications should be visible
    console.error(`❌ ${message}`);
    alert(`Error: ${message}`);
  }
}
