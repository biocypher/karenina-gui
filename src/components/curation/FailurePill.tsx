import type { Failure } from '../../types/verification';
import { groupPillClasses, humanizeCategory } from '../../utils/failure';

interface Props {
  failure: Failure | null;
  size?: 'sm' | 'md';
}

export function FailurePill({ failure, size = 'md' }: Props) {
  const base = 'inline-flex items-center rounded-full border font-semibold';
  const sz = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  if (failure === null) {
    return (
      <span
        className={`${base} ${sz} bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700`}
      >
        PASS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${base} ${sz} bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700`}
      >
        FAIL
      </span>
      <span data-testid="failure-chip" className={`${base} ${sz} ${groupPillClasses[failure.group]}`}>
        {humanizeCategory(failure.category)}
      </span>
    </span>
  );
}
