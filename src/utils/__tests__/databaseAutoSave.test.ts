import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoSaveToDatabase } from '../databaseAutoSave';
import { useDatasetStore } from '../../stores/useDatasetStore';
import type { UnifiedCheckpoint } from '../../types';

// Mock the store
vi.mock('../../stores/useDatasetStore');

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

const mockUseDatasetStore = vi.mocked(useDatasetStore);

describe('databaseAutoSave', () => {
  const mockSetLastSaved = vi.fn();
  const mockSetSaving = vi.fn();
  const mockSetSaveError = vi.fn();

  const mockCheckpoint: UnifiedCheckpoint = {
    version: '2.0',
    dataset_metadata: {
      name: 'Test Benchmark',
      description: 'Test description',
      version: '1.0.0',
      creator: 'Test User',
    },
    checkpoint: {
      q1: {
        id: 'q1',
        question: 'What is 2+2?',
        raw_answer: '4',
        answer_template: 'class Answer(BaseModel): result: int',
        finished: true,
        tags: [],
      },
    },
    global_rubric: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Default mock implementation
    mockUseDatasetStore.getState = vi.fn().mockReturnValue({
      isConnectedToDatabase: true,
      storageUrl: 'sqlite:///test.db',
      currentBenchmarkName: 'Test Benchmark',
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetSaving,
      setSaveError: mockSetSaveError,
    });
  });

  it('does nothing when not connected to database', async () => {
    mockUseDatasetStore.getState = vi.fn().mockReturnValue({
      isConnectedToDatabase: false,
      storageUrl: null,
      currentBenchmarkName: null,
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetSaving,
      setSaveError: mockSetSaveError,
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSetSaving).not.toHaveBeenCalled();
  });

  it('does nothing when storageUrl is missing', async () => {
    mockUseDatasetStore.getState = vi.fn().mockReturnValue({
      isConnectedToDatabase: true,
      storageUrl: null,
      currentBenchmarkName: 'Test',
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetSaving,
      setSaveError: mockSetSaveError,
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does nothing when benchmarkName is missing', async () => {
    mockUseDatasetStore.getState = vi.fn().mockReturnValue({
      isConnectedToDatabase: true,
      storageUrl: 'sqlite:///test.db',
      currentBenchmarkName: null,
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetSaving,
      setSaveError: mockSetSaveError,
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('saves checkpoint when all conditions are met', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockSetSaving).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/database/save-benchmark',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test Benchmark'),
      })
    );
    expect(mockSetLastSaved).toHaveBeenCalledWith('2025-01-01T00:00:00Z');
    expect(mockSetSaving).toHaveBeenCalledWith(false);
    expect(mockSetSaveError).toHaveBeenCalledWith(null);
  });

  it('sends correct checkpoint data structure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(mockCheckpoint);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody).toEqual({
      storage_url: 'sqlite:///test.db',
      benchmark_name: 'Test Benchmark',
      checkpoint_data: {
        dataset_metadata: mockCheckpoint.dataset_metadata,
        questions: mockCheckpoint.checkpoint,
        global_rubric: null,
      },
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Database error' }),
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockSetSaveError).toHaveBeenCalledWith('Database error');
    expect(mockSetSaving).toHaveBeenCalledWith(false);
    expect(mockConsoleError).toHaveBeenCalledWith(
      '❌ Failed to auto-save to database:',
      expect.stringContaining('Database error')
    );
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network failure'));

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockSetSaveError).toHaveBeenCalledWith('Network failure');
    expect(mockSetSaving).toHaveBeenCalledWith(false);
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to auto-save to database:', expect.any(String));
  });

  it('handles checkpoint with global rubric', async () => {
    const checkpointWithRubric: UnifiedCheckpoint = {
      ...mockCheckpoint,
      global_rubric: {
        id: 'test-rubric',
        name: 'Test Rubric',
        traits: [
          {
            name: 'Accuracy',
            description: 'Answer is accurate',
            kind: 'score',
            min_score: 1,
            max_score: 5,
          },
        ],
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(checkpointWithRubric);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.checkpoint_data.global_rubric).toEqual(checkpointWithRubric.global_rubric);
  });

  it('logs success message on successful save', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockConsoleLog).toHaveBeenCalledWith('💾 Auto-saved to database: Test Benchmark');
  });

  it('resets saving state even on error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Save failed'));

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockSetSaving).toHaveBeenNthCalledWith(1, true);
    expect(mockSetSaving).toHaveBeenNthCalledWith(2, false);
  });

  it('handles empty checkpoint data', async () => {
    const emptyCheckpoint: UnifiedCheckpoint = {
      version: '2.0',
      dataset_metadata: {
        name: 'Empty Benchmark',
      },
      checkpoint: {},
      global_rubric: null,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(emptyCheckpoint);

    expect(global.fetch).toHaveBeenCalled();
    expect(mockSetSaveError).toHaveBeenCalledWith(null);
  });
});
