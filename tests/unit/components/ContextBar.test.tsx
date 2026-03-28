import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextBar } from '../../../src/components/ContextBar';

describe('ContextBar', () => {
  const defaultProps = {
    question: 'What is the mechanism of action of metformin in type 2 diabetes?',
    rawAnswer: 'Metformin primarily acts by reducing hepatic glucose production through AMPK activation.',
    answerNotes: null as string | null,
    onEditQuestion: vi.fn(),
    onDelete: vi.fn(),
    onClone: vi.fn(),
    disabled: false,
  };

  it('renders truncated question and answer text', () => {
    render(<ContextBar {...defaultProps} />);
    expect(screen.getByText(defaultProps.question)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.rawAnswer)).toBeInTheDocument();
  });

  it('renders delete and clone buttons', () => {
    render(<ContextBar {...defaultProps} />);
    expect(screen.getByTitle('Clone question')).toBeInTheDocument();
    expect(screen.getByTitle('Delete question')).toBeInTheDocument();
  });

  it('expands question text on click', () => {
    render(<ContextBar {...defaultProps} />);
    const questionText = screen.getByText(defaultProps.question);
    fireEvent.click(questionText);
    expect(questionText.closest('[data-expanded]')).toHaveAttribute('data-expanded', 'true');
  });

  it('renders answer notes section when provided', () => {
    render(<ContextBar {...defaultProps} answerNotes="Important: check dosage" />);
    expect(screen.getByText('Important: check dosage')).toBeInTheDocument();
  });

  it('does not render answer notes when null', () => {
    render(<ContextBar {...defaultProps} answerNotes={null} />);
    // No "N" badge should be present
    const nBadges = screen.queryAllByText('N');
    expect(nBadges.length).toBe(0);
  });

  it('calls onDelete when delete button clicked', () => {
    render(<ContextBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Delete question'));
    expect(defaultProps.onDelete).toHaveBeenCalledOnce();
  });

  it('calls onClone when clone button clicked', () => {
    render(<ContextBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Clone question'));
    expect(defaultProps.onClone).toHaveBeenCalledOnce();
  });
});
