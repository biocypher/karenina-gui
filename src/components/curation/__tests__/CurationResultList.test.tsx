import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CurationResultList } from '../CurationResultList';
import { useCurationStore } from '../../../stores/useCurationStore';
import { makeResult } from '../../../test-utils/result';

describe('CurationResultList result column', () => {
  beforeEach(() => {
    useCurationStore.getState().reset();
  });

  it('renders FailurePill with subcategory chip on FAIL', () => {
    const row = makeResult({
      failure: { category: 'content', group: 'content', stage: 'verify_template', reason: '' },
    });
    render(<CurationResultList filteredResults={[row]} />);
    const cell = screen.getByTestId('result-cell-row-0');
    expect(cell).toHaveTextContent('FAIL');
    expect(cell).toHaveTextContent('content');
  });

  it('uses w-40 column width', () => {
    const { container } = render(<CurationResultList filteredResults={[makeResult({ failure: null })]} />);
    const th = container.querySelector("th[data-col='result']");
    expect(th).not.toBeNull();
    expect(th!.className).toMatch(/w-40/);
  });

  it('renders PASS pill when failure is null', () => {
    const row = makeResult({ failure: null });
    render(<CurationResultList filteredResults={[row]} />);
    const cell = screen.getByTestId('result-cell-row-0');
    expect(cell).toHaveTextContent('PASS');
  });
});
