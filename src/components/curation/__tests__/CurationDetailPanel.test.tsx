import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CurationDetailPanel } from '../CurationDetailPanel';
import { makeResult } from '../../../test-utils/result';

// Focused tests for the status bar portion of CurationDetailPanel: confirm
// that the FailurePill replaces the legacy verdict + auto-fail badges.

function baseProps() {
  return {
    onPrev: vi.fn(),
    onNext: vi.fn(),
    hasPrev: false,
    hasNext: false,
  };
}

describe('CurationDetailPanel status bar', () => {
  it('renders FailurePill in status bar for FAIL', () => {
    const result = makeResult({
      failure: { category: 'timeout', group: 'retry', stage: 'generate_answer', reason: 'gone' },
    });
    render(<CurationDetailPanel result={result} {...baseProps()} />);
    expect(screen.getByText('FAIL')).toBeInTheDocument();
    expect(screen.getByTestId('failure-chip')).toHaveTextContent('timeout');
  });

  it('renders PASS pill when failure is null', () => {
    const result = makeResult({ failure: null });
    render(<CurationDetailPanel result={result} {...baseProps()} />);
    expect(screen.getByText('PASS')).toBeInTheDocument();
  });
});
