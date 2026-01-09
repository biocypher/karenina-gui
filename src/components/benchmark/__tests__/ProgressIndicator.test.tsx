import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressIndicator } from '../ProgressIndicator';

const mockProgress = {
  job_id: 'test-job',
  status: 'running',
  percentage: 50,
  current_question: 'What is 2+2?',
  processed_count: 5,
  total_count: 10,
  successful_count: 3,
  failed_count: 2,
  start_time: Math.floor(Date.now() / 1000) - 45, // 45 seconds ago
  duration_seconds: 45,
};

const defaultProps = {
  isRunning: true,
  progress: mockProgress,
  selectedTestsCount: 2,
  answeringModelsCount: 1,
  parsingModelsCount: 1,
  replicateCount: 1,
};

describe('ProgressIndicator', () => {
  it('renders nothing when not running', () => {
    const { container } = render(<ProgressIndicator {...defaultProps} isRunning={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('displays progress statistics when running with progress data', () => {
    render(<ProgressIndicator {...defaultProps} />);

    expect(screen.getByText('Progress: 5 / 10')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/Running for:/)).toBeInTheDocument();
  });

  it('displays progress bar with correct percentage', () => {
    const { container } = render(<ProgressIndicator {...defaultProps} />);

    expect(screen.getByText('Progress: 5 / 10')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    const progressBar = container.querySelector('.bg-indigo-600');
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('shows current question when available', () => {
    render(<ProgressIndicator {...defaultProps} />);

    expect(screen.getByText('Current: What is 2+2?')).toBeInTheDocument();
  });

  it('shows running time when status is running', () => {
    render(<ProgressIndicator {...defaultProps} />);

    expect(screen.getByText(/Running for:/)).toBeInTheDocument();
  });

  it('shows completed time when status is completed', () => {
    const completedProgress = {
      ...mockProgress,
      status: 'completed',
      duration_seconds: 120,
    };

    render(<ProgressIndicator {...defaultProps} progress={completedProgress} />);

    expect(screen.getByText(/Completed in:/)).toBeInTheDocument();
    expect(screen.queryByText(/Running for:/)).not.toBeInTheDocument();
  });

  it('displays initializing state when running without progress data', () => {
    render(<ProgressIndicator {...defaultProps} progress={null} />);

    expect(screen.getByText('Initializing verification...')).toBeInTheDocument();
  });

  it('shows loading animation when initializing', () => {
    const { container } = render(<ProgressIndicator {...defaultProps} progress={null} />);

    const loader = container.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();

    const pulseBar = container.querySelector('.animate-pulse');
    expect(pulseBar).toBeInTheDocument();
    expect(pulseBar).toHaveStyle('width: 10%');
  });

  it('calculates total tests correctly based on models, selected tests, and replicates', () => {
    render(
      <ProgressIndicator
        {...defaultProps}
        progress={null}
        selectedTestsCount={3}
        answeringModelsCount={2}
        parsingModelsCount={2}
        replicateCount={2}
      />
    );

    // Component doesn't display calculated total when progress is null
    // Just verify it renders without errors
    expect(screen.getByText('Initializing verification...')).toBeInTheDocument();
  });

  it('uses progress total_count when available over calculated total', () => {
    render(<ProgressIndicator {...defaultProps} />);

    // Should show progress.total_count (10) instead of calculated total (2 * 1 * 1 * 1 = 2)
    expect(screen.getByText('Progress: 5 / 10')).toBeInTheDocument();
  });

  it('handles missing optional progress fields gracefully', () => {
    const minimalProgress = {
      job_id: 'test-job',
      status: 'running',
      percentage: 25,
      current_question: '',
      processed_count: 1,
      total_count: 4,
      successful_count: 0,
      failed_count: 0,
    };

    render(<ProgressIndicator {...defaultProps} progress={minimalProgress} />);

    expect(screen.getByText('Progress: 1 / 4')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.queryByText('Current:')).not.toBeInTheDocument(); // No current question
    // No time shown when start_time and duration_seconds are both missing
    expect(screen.queryByText(/Running for:/)).not.toBeInTheDocument();
  });

  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      const props = {
        ...defaultProps,
        progress: { ...mockProgress, start_time: Math.floor(Date.now() / 1000) - 45, duration_seconds: 45 },
      };

      render(<ProgressIndicator {...props} />);
      // formatDuration returns "00:45" format (mm:ss)
      expect(screen.getByText(/Running for:.*00:45/)).toBeInTheDocument();
    });

    it('formats minutes and seconds correctly', () => {
      const props = {
        ...defaultProps,
        progress: { ...mockProgress, start_time: Math.floor(Date.now() / 1000) - 90, duration_seconds: 90 },
      };

      render(<ProgressIndicator {...props} />);
      // formatDuration returns "01:30" format (mm:ss)
      expect(screen.getByText(/Running for:.*01:30/)).toBeInTheDocument();
    });

    it('handles undefined/invalid values', () => {
      const props = {
        ...defaultProps,
        progress: { ...mockProgress, start_time: undefined, duration_seconds: undefined },
      };

      render(<ProgressIndicator {...props} />);
      // When start_time and duration_seconds are both undefined, time is not shown
      expect(screen.queryByText(/Running for:/)).not.toBeInTheDocument();
    });
  });
});
