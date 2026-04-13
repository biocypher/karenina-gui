import { useCurationStore } from '../../stores/useCurationStore';
import { computeResultStatus, resolveVerdict } from '../../utils/curation';
import type { VerificationResult } from '../../types/verification';
import type { CurationStatus } from '../../types/curation';

interface CurationResultListProps {
  filteredResults: VerificationResult[];
}

const STATUS_COLORS: Record<CurationStatus, string> = {
  curated: 'bg-green-500',
  partial: 'bg-amber-500',
  pending: 'bg-red-500',
};

const STATUS_TOOLTIPS: Record<CurationStatus, string> = {
  curated: 'Flagged as curated',
  partial: 'Some judgments entered but not flagged as curated',
  pending: 'No judgments yet',
};

export function CurationResultList({ filteredResults }: CurationResultListProps) {
  const {
    activeCuratorId,
    templateJudgments,
    rubricJudgments,
    curatedFlags,
    selectedResultId,
    setSelectedResult,
    currentPage,
    pageSize,
    setCurrentPage,
  } = useCurationStore();

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const pageResults = filteredResults.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-gray-800 rounded mb-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700">
            <th className="text-left p-2 w-12">Status</th>
            <th className="text-left p-2">Question</th>
            <th className="text-left p-2 w-40">Model</th>
            <th className="text-left p-2 w-16">Result</th>
            <th className="text-left p-2 w-16">Curated</th>
          </tr>
        </thead>
        <tbody>
          {pageResults.map((result) => {
            const resultId = result.metadata.result_id ?? result.metadata.template_id;
            const status = activeCuratorId
              ? computeResultStatus(resultId, activeCuratorId, templateJudgments, rubricJudgments, curatedFlags)
              : 'pending';
            const isSelected = selectedResultId === resultId;
            const passed = resolveVerdict(result);

            return (
              <tr
                key={resultId}
                onClick={() => setSelectedResult(isSelected ? null : resultId)}
                className={`border-b border-gray-700/50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'
                }`}
              >
                <td className="p-2">
                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status]}`} title={STATUS_TOOLTIPS[status]} />
                </td>
                <td className="p-2 text-gray-300 truncate max-w-md">{result.metadata.question_text}</td>
                <td className="p-2 text-gray-400">{result.metadata.answering.model_name}</td>
                <td className="p-2">
                  {!result.metadata.completed_without_errors ? (
                    <span className="text-amber-400">Error</span>
                  ) : passed === true ? (
                    <span className="text-green-400">Pass</span>
                  ) : passed === false ? (
                    <span className="text-red-400">Fail</span>
                  ) : (
                    <span className="text-gray-500">{'\u2014'}</span>
                  )}
                </td>
                <td className="p-2">
                  {curatedFlags[activeCuratorId ?? '']?.[resultId] ? (
                    <span className="text-green-400">Yes</span>
                  ) : (
                    <span className="text-gray-600">{'\u2014'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 p-2 text-xs text-gray-400">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="hover:text-gray-200 disabled:opacity-30"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const page =
              totalPages <= 7
                ? i + 1
                : currentPage <= 4
                  ? i + 1
                  : currentPage >= totalPages - 3
                    ? totalPages - 6 + i
                    : currentPage - 3 + i;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2 py-0.5 rounded ${page === currentPage ? 'bg-gray-600 text-gray-200' : 'hover:text-gray-200'}`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="hover:text-gray-200 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
