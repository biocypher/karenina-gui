import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FailurePill } from '../FailurePill';

describe('FailurePill', () => {
  it('renders PASS when failure is null', () => {
    render(<FailurePill failure={null} />);
    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.queryByTestId('failure-chip')).toBeNull();
  });

  it('renders FAIL + group-colored subcategory chip', () => {
    render(
      <FailurePill
        failure={{
          category: 'timeout',
          group: 'retry',
          stage: 'generate_answer',
          reason: 'gone',
        }}
      />
    );
    expect(screen.getByText('FAIL')).toBeInTheDocument();
    const chip = screen.getByTestId('failure-chip');
    expect(chip).toHaveTextContent('timeout');
    expect(chip.className).toMatch(/amber/);
  });

  it('humanizes snake_case categories', () => {
    render(
      <FailurePill
        failure={{
          category: 'recursion_limit',
          group: 'autofail',
          stage: 'x',
          reason: '',
        }}
      />
    );
    expect(screen.getByTestId('failure-chip')).toHaveTextContent('recursion limit');
  });
});
