import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BenchmarkCard } from '../BenchmarkCard';

describe('BenchmarkCard', () => {
  const mockOnClick = vi.fn();

  const defaultProps = {
    id: 'test-benchmark-1',
    name: 'Test Benchmark',
    totalQuestions: 10,
    finishedCount: 7,
    unfinishedCount: 3,
    isSelected: false,
    onClick: mockOnClick,
  };

  it('renders benchmark information correctly', () => {
    render(<BenchmarkCard {...defaultProps} />);

    expect(screen.getByText('Test Benchmark')).toBeInTheDocument();
    expect(screen.getByText(/10 questions/)).toBeInTheDocument();
    expect(screen.getByText(/7 finished/)).toBeInTheDocument();
    expect(screen.getByText(/3 unfinished/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    render(<BenchmarkCard {...defaultProps} />);

    const card = screen.getByText('Test Benchmark').closest('button');
    expect(card).toBeInTheDocument();

    if (card) {
      await user.click(card);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it('shows selected state when isSelected is true', () => {
    const { container } = render(<BenchmarkCard {...defaultProps} isSelected={true} />);

    // Check for selected state classes
    const card = container.querySelector('button');
    expect(card).toHaveClass('border-blue-500');
  });

  it('shows unselected state when isSelected is false', () => {
    const { container } = render(<BenchmarkCard {...defaultProps} isSelected={false} />);

    // Check for unselected state classes
    const card = container.querySelector('button');
    expect(card).toHaveClass('border-gray-200');
  });

  it('displays last modified timestamp when provided', () => {
    const timestamp = '2025-01-01T12:00:00Z';
    render(<BenchmarkCard {...defaultProps} lastModified={timestamp} />);

    // Should show relative time (depends on formatDistanceToNow)
    expect(screen.getByText(/Last modified:/)).toBeInTheDocument();
  });

  it('does not show last modified when not provided', () => {
    render(<BenchmarkCard {...defaultProps} />);

    expect(screen.queryByText(/Last modified:/)).not.toBeInTheDocument();
  });

  it('handles zero questions correctly', () => {
    render(<BenchmarkCard {...defaultProps} totalQuestions={0} finishedCount={0} unfinishedCount={0} />);

    expect(screen.getByText(/0 questions/)).toBeInTheDocument();
  });

  it('is accessible with keyboard', async () => {
    const user = userEvent.setup();
    render(<BenchmarkCard {...defaultProps} />);

    const card = screen.getByText('Test Benchmark').closest('button');
    expect(card).toBeInTheDocument();

    if (card) {
      card.focus();
      expect(card).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it('shows CheckCircle icon when selected', () => {
    render(<BenchmarkCard {...defaultProps} isSelected={true} />);

    // CheckCircle icon should be visible
    const card = screen.getByText('Test Benchmark').closest('button');
    expect(card?.querySelector('svg')).toBeInTheDocument();
  });
});
