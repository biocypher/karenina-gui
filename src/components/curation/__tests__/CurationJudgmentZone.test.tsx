import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CurationJudgmentZone } from '../CurationJudgmentZone';
import { useCurationStore } from '../../../stores/useCurationStore';
import { makeResult } from '../../../test-utils/result';

describe('CurationJudgmentZone auto-fail detection', () => {
  beforeEach(() => {
    useCurationStore.getState().reset();
  });

  it('flags auto-fail in the empty state for recursion_limit', () => {
    const r = makeResult({
      failure: {
        category: 'recursion_limit',
        group: 'autofail',
        stage: 'RecursionLimitAutoFail',
        reason: '',
      },
    });
    render(<CurationJudgmentZone result={r} />);
    expect(screen.getByText(/auto-failed/i)).toBeInTheDocument();
    expect(screen.getByText(/recursion limit/i)).toBeInTheDocument();
  });

  it('flags auto-fail for trace_validation', () => {
    const r = makeResult({
      failure: {
        category: 'trace_validation',
        group: 'autofail',
        stage: 'TraceValidationAutoFail',
        reason: '',
      },
    });
    render(<CurationJudgmentZone result={r} />);
    expect(screen.getByText(/auto-failed/i)).toBeInTheDocument();
    expect(screen.getByText(/trace validation/i)).toBeInTheDocument();
  });

  it('does not flag auto-fail for content-group failures', () => {
    const r = makeResult({
      failure: {
        category: 'content',
        group: 'content',
        stage: 'verify_template',
        reason: '',
      },
    });
    render(<CurationJudgmentZone result={r} />);
    expect(screen.queryByText(/auto-failed/i)).toBeNull();
  });

  it('does not flag auto-fail when failure is null', () => {
    const r = makeResult({ failure: null });
    render(<CurationJudgmentZone result={r} />);
    expect(screen.queryByText(/auto-failed/i)).toBeNull();
  });
});
