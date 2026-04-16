import type { CurationStatus } from '../../types/curation';

const BADGE_STYLES: Record<CurationStatus, string> = {
  curated: 'bg-green-600 dark:bg-green-600',
  partial: 'bg-amber-500 dark:bg-amber-500',
  pending: 'bg-red-500/80 dark:bg-red-500/80',
};

const BADGE_LABELS: Record<CurationStatus, string> = {
  curated: 'C',
  partial: 'PA',
  pending: 'PE',
};

const BADGE_TOOLTIPS: Record<CurationStatus, string> = {
  curated: 'Flagged as curated',
  partial: 'Some judgments entered',
  pending: 'No judgments yet',
};

export function CurationStatusBadge({ status }: { status: CurationStatus }) {
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center w-5 h-4 rounded text-[9px] font-bold leading-none text-white ${BADGE_STYLES[status]}`}
      title={BADGE_TOOLTIPS[status]}
    >
      {BADGE_LABELS[status]}
    </div>
  );
}
