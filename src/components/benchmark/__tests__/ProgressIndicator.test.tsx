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
  estimated_time_remaining: 120,
};

const defaultProps = {
  isRunning: true,
  progress: mockProgress,
  selectedTestsCount: 2,
  answeringModelsCount: 1,
  parsingModelsCount: 1,
};

describe('ProgressIndicator', () => {
  it('renders nothing when not running', () => {
    const { container } = render(
      <ProgressIndicator {...defaultProps} isRunning={false} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('displays progress statistics when running with progress data', () => {
    render(<ProgressIndicator {...defaultProps} />);

    expect(screen.getByText('10')).toBeInTheDocument(); // Total tests
    expect(screen.getByText('Total Tests')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Successful count
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Failed count
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('2m 0s')).toBeInTheDocument(); // Estimated time
    expect(screen.getByText('Estimated Time')).toBeInTheDocument();
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

  it('shows estimated time remaining when status is not completed', () => {
    render(<ProgressIndicator {...defaultProps} />);

    expect(screen.getByText('Estimated time remaining: 2m 0s')).toBeInTheDocument();
  });

  it('does not show estimated time remaining when status is completed', () => {
    const completedProgress = {
      ...mockProgress,
      status: 'completed',
    };

    render(
      <ProgressIndicator 
        {...defaultProps} 
        progress={completedProgress} 
      />
    );

    expect(screen.queryByText('Estimated time remaining: 2m 0s')).not.toBeInTheDocument();
  });

  it('displays initializing state when running without progress data', () => {
    render(
      <ProgressIndicator 
        {...defaultProps} 
        progress={null} 
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // Calculated total tests (2 * 1 * 1)
    expect(screen.getByText('Total Tests')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2); // Successful and Failed both show 0
    expect(screen.getByText('Starting...')).toBeInTheDocument();
    expect(screen.getByText('Initializing verification...')).toBeInTheDocument();
  });

  it('shows loading animation when initializing', () => {
    const { container } = render(
      <ProgressIndicator 
        {...defaultProps} 
        progress={null} 
      />
    );

    const loader = container.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();

    const pulseBar = container.querySelector('.animate-pulse');
    expect(pulseBar).toBeInTheDocument();
    expect(pulseBar).toHaveStyle('width: 10%');
  });

  it('calculates total tests correctly based on models and selected tests', () => {
    render(
      <ProgressIndicator 
        {...defaultProps} 
        progress={null}
        selectedTestsCount={3}
        answeringModelsCount={2}
        parsingModelsCount={2}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument(); // 3 * 2 * 2 = 12
  });

  it('uses progress total_count when available over calculated total', () => {
    render(<ProgressIndicator {...defaultProps} />);

    // Should show progress.total_count (10) instead of calculated total (2)
    expect(screen.getByText('10')).toBeInTheDocument();
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

    render(
      <ProgressIndicator 
        {...defaultProps} 
        progress={minimalProgress} 
      />
    );

    expect(screen.getByText('Progress: 1 / 4')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument(); // Estimated time
    expect(screen.queryByText('Current:')).not.toBeInTheDocument(); // No current question
    expect(screen.queryByText('Estimated time remaining:')).not.toBeInTheDocument();
  });

  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      const props = {
        ...defaultProps,
        progress: { ...mockProgress, estimated_time_remaining: 45 },
      };

      render(<ProgressIndicator {...props} />);
      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('formats minutes and seconds correctly', () => {
      const props = {
        ...defaultProps,
        progress: { ...mockProgress, estimated_time_remaining: 90 },
      };

      render(<ProgressIndicator {...props} />);
      expect(screen.getByText('1m 30s')).toBeInTheDocument();
    });

    it('handles undefined/invalid values', () => {
      const props = {
        ...defaultProps,
        progress: { ...mockProgress, estimated_time_remaining: undefined },
      };

      render(<ProgressIndicator {...props} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });
});