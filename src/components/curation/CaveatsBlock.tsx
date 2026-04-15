import type { Caveat, VerificationResultMetadata } from '../../types/verification';

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

// Token / agent / pipeline fields live on VerificationResultTemplate, not
// VerificationResultMetadata, so we cannot surface them here from the
// metadata subobject alone; keep the slots but leave them blank. They
// render as "--" via the InfoLine fallback.
function formatTokens(): string {
  return '';
}

function formatAgent(): string {
  return '';
}

function formatPipeline(): string {
  // Same reasoning as above: the pipeline toggles (deep_judgment_enabled,
  // abstention_check_performed, sufficiency_check_performed,
  // embedding_check_performed) live on VerificationResultTemplate.
  return '';
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
}

export function CaveatsBlock({ caveats, metadata, expanded }: CaveatsBlockProps) {
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
          <InfoLine testId="caveat-info-tokens" labelColor="blue" label="Tokens" value={formatTokens()} />
          <InfoLine testId="caveat-info-agent" labelColor="blue" label="Agent" value={formatAgent()} />
          <InfoLine testId="caveat-info-pipeline" labelColor="blue" label="Pipeline" value={formatPipeline()} />
          <InfoLine testId="caveat-info-run" labelColor="blue" label="Run" value={formatRun(metadata)} />
        </>
      )}
    </div>
  );
}
