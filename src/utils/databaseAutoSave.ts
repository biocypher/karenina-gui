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

  // Only proceed if connected to database
  if (!isConnectedToDatabase || !storageUrl || !currentBenchmarkName) {
    console.log('⏭️ Skipping database auto-save: not connected to database');
    return;
  }

  console.log('💾 Auto-saving to database...');
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

    // Call the save-benchmark API
    const response = await fetch('/api/database/save-benchmark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storage_url: storageUrl,
        benchmark_name: currentBenchmarkName,
        checkpoint_data: checkpointData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save to database');
    }

    const data = await response.json();

    // Update last saved timestamp
    setLastSaved(data.last_modified || new Date().toISOString());

    console.log('✅ Auto-saved to database successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to auto-save to database:', errorMessage);
    setSaveError(errorMessage);

    // Show error notification but don't block user workflow
    // The error will be displayed in the UI via the store state
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
