import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseManagerModal } from '../src/components/DatabaseManagerModal';

// Mock fetch globally
global.fetch = vi.fn();

describe('DatabaseManagerModal', () => {
  const mockOnClose = vi.fn();
  const mockOnLoadCheckpoint = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onLoadCheckpoint: mockOnLoadCheckpoint,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<DatabaseManagerModal {...defaultProps} />);

      expect(screen.getByText('Database Manager')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/sqlite:\/\/\//)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<DatabaseManagerModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Database Manager')).not.toBeInTheDocument();
    });

    it('displays storage URL input field', () => {
      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('displays browse button for file selection', () => {
      render(<DatabaseManagerModal {...defaultProps} />);

      const browseButton = screen.getByTitle('Browse for SQLite database file');
      expect(browseButton).toBeInTheDocument();
    });

    it('displays connect button', () => {
      render(<DatabaseManagerModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeInTheDocument();
    });
  });

  describe('Database Connection', () => {
    it('disables connect button when storage URL is empty', () => {
      render(<DatabaseManagerModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeDisabled();
    });

    it('enables connect button when storage URL is provided', async () => {
      const user = userEvent.setup();
      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).not.toBeDisabled();
    });

    it('shows loading state while connecting', async () => {
      const user = userEvent.setup();

      // Mock slow response
      vi.mocked(global.fetch).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 1000))
      );

      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('successfully connects to database and displays benchmarks', async () => {
      const user = userEvent.setup();

      const mockBenchmarks = [
        { id: '1', name: 'Benchmark 1', total_questions: 10, finished_count: 5, unfinished_count: 5 },
        { id: '2', name: 'Benchmark 2', total_questions: 20, finished_count: 15, unfinished_count: 5 },
      ];

      // Mock successful connection
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            storage_url: 'sqlite:///test.db',
            benchmark_count: 2,
            message: 'Connected',
          }),
        } as Response)
        // Mock benchmarks list
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            benchmarks: mockBenchmarks,
            count: 2,
          }),
        } as Response);

      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/connected successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/found 2 benchmark/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Benchmark 1')).toBeInTheDocument();
      expect(screen.getByText('Benchmark 2')).toBeInTheDocument();
      expect(screen.getByText(/10 questions/)).toBeInTheDocument();
      expect(screen.getByText(/20 questions/)).toBeInTheDocument();
    });

    it('displays error message on connection failure', async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Connection failed' }),
      } as Response);

      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///invalid.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });

    it('requires storage URL before connecting', () => {
      render(<DatabaseManagerModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });

      // Button should be disabled when URL is empty
      expect(connectButton).toBeDisabled();
    });
  });

  describe('Benchmark Selection', () => {
    beforeEach(() => {
      const mockBenchmarks = [
        { id: '1', name: 'Test Benchmark', total_questions: 10, finished_count: 5, unfinished_count: 5 },
      ];

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, storage_url: 'sqlite:///test.db', benchmark_count: 1 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, benchmarks: mockBenchmarks, count: 1 }),
        } as Response);
    });

    it('allows selecting a benchmark', async () => {
      const user = userEvent.setup();
      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Test Benchmark')).toBeInTheDocument();
      });

      const benchmarkButton = screen.getByText('Test Benchmark').closest('button');
      await user.click(benchmarkButton!);

      // Load button should be enabled after selection
      const loadButton = screen.getByRole('button', { name: /load benchmark/i });
      expect(loadButton).not.toBeDisabled();
    });

    it('disables load button when no benchmark is selected', async () => {
      const user = userEvent.setup();
      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Test Benchmark')).toBeInTheDocument();
      });

      const loadButton = screen.getByRole('button', { name: /load benchmark/i });
      expect(loadButton).toBeDisabled();
    });
  });

  describe('Loading Benchmark', () => {
    it('successfully loads benchmark and calls onLoadCheckpoint', async () => {
      const user = userEvent.setup();

      const mockCheckpointData = {
        dataset_metadata: {
          name: 'Test Benchmark',
          description: 'Test description',
          version: '1.0.0',
          creator: 'Test User',
        },
        questions: {
          q1: { id: 'q1', question: 'Q1?', raw_answer: 'A1' },
        },
        global_rubric: null,
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, storage_url: 'sqlite:///test.db', benchmark_count: 1 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            benchmarks: [
              { id: '1', name: 'Test Benchmark', total_questions: 1, finished_count: 0, unfinished_count: 1 },
            ],
            count: 1,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            benchmark_name: 'Test Benchmark',
            checkpoint_data: mockCheckpointData,
            storage_url: 'sqlite:///test.db',
          }),
        } as Response);

      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Test Benchmark')).toBeInTheDocument();
      });

      const benchmarkButton = screen.getByText('Test Benchmark').closest('button');
      await user.click(benchmarkButton!);

      const loadButton = screen.getByRole('button', { name: /load benchmark/i });
      await user.click(loadButton);

      await waitFor(() => {
        expect(mockOnLoadCheckpoint).toHaveBeenCalledWith(
          expect.objectContaining({
            dataset_metadata: mockCheckpointData.dataset_metadata,
            questions: mockCheckpointData.questions,
            global_rubric: null,
          }),
          'sqlite:///test.db'
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('displays error message when loading fails', async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, storage_url: 'sqlite:///test.db', benchmark_count: 1 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            benchmarks: [
              { id: '1', name: 'Test Benchmark', total_questions: 1, finished_count: 0, unfinished_count: 1 },
            ],
            count: 1,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Benchmark not found' }),
        } as Response);

      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Test Benchmark')).toBeInTheDocument();
      });

      const benchmarkButton = screen.getByText('Test Benchmark').closest('button');
      await user.click(benchmarkButton!);

      const loadButton = screen.getByRole('button', { name: /load benchmark/i });
      await user.click(loadButton);

      await waitFor(() => {
        expect(screen.getByText(/benchmark not found/i)).toBeInTheDocument();
      });

      expect(mockOnLoadCheckpoint).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Modal Controls', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<DatabaseManagerModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets state when modal is closed', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///test.db');

      expect(input).toHaveValue('sqlite:///test.db');

      // Close and reopen
      rerender(<DatabaseManagerModal {...defaultProps} isOpen={false} />);
      rerender(<DatabaseManagerModal {...defaultProps} isOpen={true} />);

      const newInput = screen.getByPlaceholderText(/sqlite:\/\/\//);
      expect(newInput).toHaveValue('');
    });
  });

  describe('Empty Database', () => {
    it('displays message when database has no benchmarks', async () => {
      const user = userEvent.setup();

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, storage_url: 'sqlite:///empty.db', benchmark_count: 0 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, benchmarks: [], count: 0 }),
        } as Response);

      render(<DatabaseManagerModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/sqlite:\/\/\//);
      await user.type(input, 'sqlite:///empty.db');

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/no benchmarks found/i)).toBeInTheDocument();
      });
    });
  });
});
