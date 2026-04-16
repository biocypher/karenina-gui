import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CurationJudgmentRow } from '../../components/curation/CurationJudgmentRow';

const defaultProps = {
  name: 'capital_city',
  verdictLabel: 'Pass',
  verdictPassed: true,
  detailLine: 'GT: "Paris" | LLM: "Paris"',
  metaLine: 'ExactMatch, weight: 1.0',
  judgment: null as import('../../types/curation').TraitJudgment | null,
  onJudgmentChange: vi.fn(),
  onJudgmentClear: vi.fn(),
};

describe('CurationJudgmentRow', () => {
  it('renders field name and verdict', () => {
    render(<CurationJudgmentRow {...defaultProps} />);
    expect(screen.getByText('capital_city')).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
  });

  it('calls onJudgmentChange when Agree is clicked', () => {
    const onChange = vi.fn();
    render(<CurationJudgmentRow {...defaultProps} onJudgmentChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /(?<!dis)agree/i }));
    expect(onChange).toHaveBeenCalledWith({
      judgment: 'agree',
      confidence: null,
      note: null,
    });
  });

  it('calls onJudgmentClear when active judgment is clicked again', () => {
    const onClear = vi.fn();
    const judgment = { judgment: 'agree' as const, confidence: null, note: null };
    render(<CurationJudgmentRow {...defaultProps} judgment={judgment} onJudgmentClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /(?<!dis)agree/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it('shows confidence widget when expanded', () => {
    const judgment = { judgment: 'disagree' as const, confidence: null, note: null };
    render(<CurationJudgmentRow {...defaultProps} judgment={judgment} />);
    fireEvent.click(screen.getByText(/confidence/i));
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });
});
