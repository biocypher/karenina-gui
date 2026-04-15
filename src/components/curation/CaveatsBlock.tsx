import type {
  Caveat,
  VerificationResultDeepJudgment,
  VerificationResultMetadata,
  VerificationResultRubric,
  VerificationResultTemplate,
} from '../../types/verification';

const CAVEAT_LABEL: Record<Caveat, string> = {
  retries_used: 'Retries used',
  partial_content: 'Partial content',
  embedding_override: 'Embedding override',
};

function caveatDetail(c: Caveat, md: VerificationResultMetadata): string {
  switch (c) {
    case 'retries_used': {
      const rc = md.retry_counts ?? {};
      const parts = Object.entries(rc)
        .filter(([, v]) => v.used > 0)
        .map(([k, v]) => `${k} ${v.used}/${v.budget}`);
      return parts.length ? parts.join(', ') : 'retries observed';
    }
    case 'partial_content':
      return md.partial_content
        ? `response truncated at ${md.partial_content.length} chars, verification ran on partial input`
        : 'partial content on record';
    case 'embedding_override':
      return 'embedding similarity override applied to verdict';
  }
}

function formatTokens(template: VerificationResultTemplate | undefined): string {
  const usage = template?.usage_metadata;
  if (!usage) return '';
  // The pipeline may emit a synthetic 'total' aggregate alongside per-stage
  // entries; skip it so we don't double-count.
  const entries = Object.entries(usage).filter(([stage]) => stage.toLowerCase() !== 'total');
  if (entries.length === 0) return '';
  const totals = entries.reduce(
    (acc, [, m]) => ({
      input: acc.input + (m.input_tokens ?? 0),
      output: acc.output + (m.output_tokens ?? 0),
    }),
    { input: 0, output: 0 }
  );
  if (totals.input === 0 && totals.output === 0) return '';
  return `${totals.input.toLocaleString()} in \u00b7 ${totals.output.toLocaleString()} out`;
}

function formatAgent(template: VerificationResultTemplate | undefined): string {
  const m = template?.agent_metrics;
  if (!m) return '';
  const parts: string[] = [];
  if (m.iterations != null) parts.push(`${m.iterations} iter`);
  if (m.tool_calls != null) parts.push(`${m.tool_calls} tools`);
  if ((m.suspect_failed_tool_calls ?? 0) > 0) parts.push(`${m.suspect_failed_tool_calls} failed`);
  return parts.join(' \u00b7 ');
}

// Listed in pipeline-execution order so the joined string reads as a
// timeline of what actually ran for this result.
const TEMPLATE_PIPELINE_LABELS: Array<[keyof VerificationResultTemplate, string]> = [
  ['abstention_check_performed', 'abstention check'],
  ['sufficiency_check_performed', 'sufficiency check'],
  ['template_verification_performed', 'template'],
  ['embedding_check_performed', 'embedding check'],
  ['regex_validations_performed', 'regex checks'],
];

function formatPipeline(
  template: VerificationResultTemplate | undefined,
  rubric: VerificationResultRubric | undefined,
  deepJudgment: VerificationResultDeepJudgment | undefined
): string {
  const parts: string[] = [];
  if (template) {
    for (const [flag, label] of TEMPLATE_PIPELINE_LABELS) {
      if (template[flag]) parts.push(label);
    }
  }
  if (deepJudgment?.deep_judgment_performed) parts.push('deep judgment');
  if (rubric?.rubric_evaluation_performed) parts.push('rubric');
  return parts.join(' \u00b7 ');
}

function formatRun(md: VerificationResultMetadata): string {
  const parts: string[] = [];
  if (md.run_name) parts.push(md.run_name);
  if (md.job_id) parts.push(`job ${md.job_id}`);
  if (md.replicate != null) parts.push(`replicate ${md.replicate}`);
  return parts.join(' \u00b7 ');
}

interface InfoLineProps {
  testId: string;
  label: string;
  value: string;
  labelColor: 'amber' | 'blue';
}

function InfoLine({ testId, label, value, labelColor }: InfoLineProps) {
  const colorClass = labelColor === 'amber' ? 'text-amber-500' : 'text-blue-400';
  return (
    <div data-testid={testId} className="flex items-baseline gap-2 text-xs text-slate-400">
      <span className={`min-w-24 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>{label}</span>
      <span className="text-slate-300">{value || '--'}</span>
    </div>
  );
}

interface CaveatsBlockProps {
  caveats: Caveat[];
  metadata: VerificationResultMetadata;
  expanded: boolean;
  template?: VerificationResultTemplate;
  rubric?: VerificationResultRubric;
  deepJudgment?: VerificationResultDeepJudgment;
}

export function CaveatsBlock({ caveats, metadata, expanded, template, rubric, deepJudgment }: CaveatsBlockProps) {
  const hasCaveats = caveats.length > 0;
  if (!hasCaveats && !expanded) return null;
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-slate-700 flex flex-col gap-1">
      {caveats.map((c) => (
        <InfoLine
          key={c}
          testId={`caveat-${c}`}
          labelColor="amber"
          label={CAVEAT_LABEL[c]}
          value={caveatDetail(c, metadata)}
        />
      ))}
      {expanded && (
        <>
          <InfoLine testId="caveat-info-tokens" labelColor="blue" label="Tokens" value={formatTokens(template)} />
          <InfoLine testId="caveat-info-agent" labelColor="blue" label="Agent" value={formatAgent(template)} />
          <InfoLine
            testId="caveat-info-pipeline"
            labelColor="blue"
            label="Pipeline"
            value={formatPipeline(template, rubric, deepJudgment)}
          />
          <InfoLine testId="caveat-info-run" labelColor="blue" label="Run" value={formatRun(metadata)} />
        </>
      )}
    </div>
  );
}
