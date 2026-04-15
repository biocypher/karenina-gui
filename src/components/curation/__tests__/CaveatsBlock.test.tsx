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

  it('formats token totals from template.usage_metadata, excluding the synthetic total stage', () => {
    render(
      <CaveatsBlock
        caveats={[]}
        metadata={makeMetadata()}
        expanded={true}
        template={{
          raw_llm_response: '',
          usage_metadata: {
            answering: { input_tokens: 1000, output_tokens: 500, total_tokens: 1500 },
            parsing: { input_tokens: 200, output_tokens: 50, total_tokens: 250 },
            // 'total' is a synthetic aggregate emitted by some pipelines; it
            // must not be double-counted here.
            total: { input_tokens: 1200, output_tokens: 550, total_tokens: 1750 },
          },
        }}
      />
    );
    const tokens = screen.getByTestId('caveat-info-tokens');
    expect(tokens).toHaveTextContent('1,200 in');
    expect(tokens).toHaveTextContent('550 out');
  });

  it('formats agent metrics from template.agent_metrics', () => {
    render(
      <CaveatsBlock
        caveats={[]}
        metadata={makeMetadata()}
        expanded={true}
        template={{
          raw_llm_response: '',
          agent_metrics: { iterations: 5, tool_calls: 3 },
        }}
      />
    );
    const agent = screen.getByTestId('caveat-info-agent');
    expect(agent).toHaveTextContent('5 iter');
    expect(agent).toHaveTextContent('3 tools');
  });

  it('lists performed pipeline stages from template flags', () => {
    render(
      <CaveatsBlock
        caveats={[]}
        metadata={makeMetadata()}
        expanded={true}
        template={{
          raw_llm_response: '',
          embedding_check_performed: true,
          abstention_check_performed: true,
          sufficiency_check_performed: false,
        }}
      />
    );
    const pipeline = screen.getByTestId('caveat-info-pipeline');
    expect(pipeline).toHaveTextContent('embedding check');
    expect(pipeline).toHaveTextContent('abstention check');
    expect(pipeline).not.toHaveTextContent('sufficiency check');
  });

  it('shows the standard template stage when template verification ran', () => {
    render(
      <CaveatsBlock
        caveats={[]}
        metadata={makeMetadata()}
        expanded={true}
        template={{ raw_llm_response: '', template_verification_performed: true }}
      />
    );
    expect(screen.getByTestId('caveat-info-pipeline')).toHaveTextContent('template');
  });

  it('shows the rubric stage when rubric evaluation ran', () => {
    render(
      <CaveatsBlock
        caveats={[]}
        metadata={makeMetadata()}
        expanded={true}
        rubric={{ rubric_evaluation_performed: true }}
      />
    );
    expect(screen.getByTestId('caveat-info-pipeline')).toHaveTextContent('rubric');
  });

  it('includes deep judgment in pipeline stages when performed', () => {
    render(
      <CaveatsBlock
        caveats={[]}
        metadata={makeMetadata()}
        expanded={true}
        template={{ raw_llm_response: '' }}
        deepJudgment={{ deep_judgment_performed: true }}
      />
    );
    const pipeline = screen.getByTestId('caveat-info-pipeline');
    expect(pipeline).toHaveTextContent('deep judgment');
  });
});
