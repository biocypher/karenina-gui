import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusMetadataBar } from '../../../src/components/StatusMetadataBar';

describe('StatusMetadataBar', () => {
  const defaultProps = {
    finished: false,
    modified: false,
    fewShotExamplesCount: 0,
    onToggleFinished: vi.fn(),
    onEditMetadata: vi.fn(),
    onEditFewShotExamples: vi.fn(),
    lastModified: null as string | null,
    unsavedQuestionNumbers: [] as number[],
  };

  it('renders StatusBadge and no timestamp when lastModified is null', () => {
    render(<StatusMetadataBar {...defaultProps} />);
    expect(screen.getByText('Not Finished')).toBeInTheDocument();
    expect(screen.queryByText(/Last modified/)).not.toBeInTheDocument();
  });

  it('renders timestamp when lastModified is provided', () => {
    render(<StatusMetadataBar {...defaultProps} lastModified="2026-03-27T10:00:00Z" />);
    expect(screen.getByText(/Last modified/)).toBeInTheDocument();
  });

  it('renders unsaved changes indicator when there are unsaved questions', () => {
    render(<StatusMetadataBar {...defaultProps} unsavedQuestionNumbers={[1, 3, 5]} />);
    expect(screen.getByText(/Unsaved session changes/)).toBeInTheDocument();
    expect(screen.getByText('1, 3, 5')).toBeInTheDocument();
  });

  it('does not render unsaved indicator when no unsaved questions', () => {
    render(<StatusMetadataBar {...defaultProps} unsavedQuestionNumbers={[]} />);
    expect(screen.queryByText(/Unsaved session changes/)).not.toBeInTheDocument();
  });
});
