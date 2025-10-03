import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoSaveToDatabase } from '../databaseAutoSave';
import { useDatasetStore } from '../../stores/useDatasetStore';
import { useRubricStore } from '../../stores/useRubricStore';
import type { Checkpoint } from '../../types';

// Mock the stores
vi.mock('../../stores/useDatasetStore');
vi.mock('../../stores/useRubricStore');

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

const mockUseDatasetStore = vi.mocked(useDatasetStore);
const mockUseRubricStore = vi.mocked(useRubricStore);

describe('databaseAutoSave', () => {
  const mockSetLastSaved = vi.fn();
  const mockSetIsSaving = vi.fn();
  const mockSetSaveError = vi.fn();

  const mockCheckpoint: Checkpoint = {
    q1: {
      id: 'q1',
      question: 'What is 2+2?',
      raw_answer: '4',
      answer_template: 'class Answer(BaseModel): result: int',
      finished: true,
      tags: [],
    },
  };

  const mockMetadata = {
    name: 'Test Benchmark',
    description: 'Test description',
    version: '1.0.0',
    creator: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Default mock implementation for useDatasetStore
    mockUseDatasetStore.getState = vi.fn().mockReturnValue({
      isConnectedToDatabase: true,
      storageUrl: 'sqlite:///test.db',
      currentBenchmarkName: 'Test Benchmark',
      metadata: mockMetadata,
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetIsSaving,
      setSaveError: mockSetSaveError,
    });

    // Default mock implementation for useRubricStore
    mockUseRubricStore.getState = vi.fn().mockReturnValue({
      currentRubric: null,
    });
  });

  it('does nothing when not connected to database', async () => {
    mockUseDatasetStore.getState = vi.fn().mockReturnValue({
      isConnectedToDatabase: false,
      storageUrl: null,
      currentBenchmarkName: null,
      metadata: mockMetadata,
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetIsSaving,
      setSaveError: mockSetSaveError,
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSetIsSaving).not.toHaveBeenCalled();
  });

  it('does nothing when storageUrl is missing', async () => {
    mockUseDatasetStore.getState = vi.fn().mockReturnValue({
      isConnectedToDatabase: true,
      storageUrl: null,
      currentBenchmarkName: 'Test',
      metadata: mockMetadata,
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetIsSaving,
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
      metadata: mockMetadata,
      setLastSaved: mockSetLastSaved,
      setIsSaving: mockSetIsSaving,
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

    expect(mockSetIsSaving).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/database/save-benchmark',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test Benchmark'),
      })
    );
    expect(mockSetLastSaved).toHaveBeenCalledWith('2025-01-01T00:00:00Z');
    expect(mockSetIsSaving).toHaveBeenCalledWith(false);
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
        dataset_metadata: mockMetadata,
        questions: mockCheckpoint,
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
    expect(mockSetIsSaving).toHaveBeenCalledWith(false);
    expect(mockConsoleError).toHaveBeenCalledWith(
      '❌ Failed to auto-save to database:',
      expect.stringContaining('Database error')
    );
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network failure'));

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockSetSaveError).toHaveBeenCalledWith('Network failure');
    expect(mockSetIsSaving).toHaveBeenCalledWith(false);
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to auto-save to database:', expect.any(String));
  });

  it('handles checkpoint with global rubric', async () => {
    const testRubric = {
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
    };

    // Mock rubric store to return test rubric
    mockUseRubricStore.getState = vi.fn().mockReturnValue({
      currentRubric: testRubric,
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(mockCheckpoint);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.checkpoint_data.global_rubric).toEqual(testRubric);
  });

  it('logs success message on successful save', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockConsoleLog).toHaveBeenCalledWith('✅ Auto-saved to database successfully');
  });

  it('resets saving state even on error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Save failed'));

    await autoSaveToDatabase(mockCheckpoint);

    expect(mockSetIsSaving).toHaveBeenNthCalledWith(1, true);
    expect(mockSetIsSaving).toHaveBeenNthCalledWith(2, false);
  });

  it('handles empty checkpoint data', async () => {
    const emptyCheckpoint: Checkpoint = {};

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, last_modified: '2025-01-01T00:00:00Z' }),
    });

    await autoSaveToDatabase(emptyCheckpoint);

    expect(global.fetch).toHaveBeenCalled();
    expect(mockSetSaveError).toHaveBeenCalledWith(null);
  });
});
