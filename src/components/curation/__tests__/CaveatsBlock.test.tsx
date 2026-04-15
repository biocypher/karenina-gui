import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CaveatsBlock } from '../CaveatsBlock';
import { makeMetadata } from '../../../test-utils/metadata';

describe('CaveatsBlock', () => {
  it('renders one labeled line per caveat', () => {
    render(<CaveatsBlock caveats={['retries_used', 'partial_content']} metadata={makeMetadata()} expanded={false} />);
    expect(screen.getByText('Retries used')).toBeInTheDocument();
    expect(screen.getByText('Partial content')).toBeInTheDocument();
  });

  it('renders nothing when no caveats and not expanded', () => {
    const { container } = render(<CaveatsBlock caveats={[]} metadata={makeMetadata()} expanded={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows all four info groups when expanded', () => {
    render(<CaveatsBlock caveats={[]} metadata={makeMetadata()} expanded={true} />);
    ['Tokens', 'Agent', 'Pipeline', 'Run'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('collapses empty info groups to --', () => {
    // Default makeMetadata() leaves run_name/job_id/replicate/etc. undefined,
    // which is the "no provenance" baseline we want to exercise here.
    render(<CaveatsBlock caveats={[]} expanded={true} metadata={makeMetadata()} />);
    expect(screen.getByTestId('caveat-info-run')).toHaveTextContent('--');
    expect(screen.getByTestId('caveat-info-tokens')).toHaveTextContent('--');
    expect(screen.getByTestId('caveat-info-agent')).toHaveTextContent('--');
    expect(screen.getByTestId('caveat-info-pipeline')).toHaveTextContent('--');
  });

  it('formats run metadata when fields are populated', () => {
    render(
      <CaveatsBlock
        caveats={[]}
        expanded={true}
        metadata={makeMetadata({ run_name: 'demo-run', job_id: 'abc123', replicate: 2 })}
      />
    );
    expect(screen.getByTestId('caveat-info-run')).toHaveTextContent('demo-run');
    expect(screen.getByTestId('caveat-info-run')).toHaveTextContent('job abc123');
    expect(screen.getByTestId('caveat-info-run')).toHaveTextContent('replicate 2');
  });

  it('renders retry budgets in the caveat detail', () => {
    render(
      <CaveatsBlock
        caveats={['retries_used']}
        metadata={makeMetadata({ retry_counts: { generate_answer: { used: 2, budget: 3 } } })}
        expanded={false}
      />
    );
    expect(screen.getByTestId('caveat-retries_used')).toHaveTextContent('generate_answer 2/3');
  });

  it('reports partial content length when set', () => {
    render(
      <CaveatsBlock
        caveats={['partial_content']}
        metadata={makeMetadata({ partial_content: 'partial response' })}
        expanded={false}
      />
    );
    expect(screen.getByTestId('caveat-partial_content')).toHaveTextContent('16 chars');
  });
});
