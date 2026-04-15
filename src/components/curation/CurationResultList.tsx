import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';
import { computeResultStatus } from '../../utils/curation';
import { CurationDetailPanel } from './CurationDetailPanel';
import { CurationStatusBadge } from './CurationStatusBadge';
import { FailurePill } from './FailurePill';
import type { VerificationResult } from '../../types/verification';

interface CurationResultListProps {
  filteredResults: VerificationResult[];
}

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
    checkpoint,
  } = useCurationStore(
    useShallow((s) => ({
      activeCuratorId: s.activeCuratorId,
      templateJudgments: s.templateJudgments,
      rubricJudgments: s.rubricJudgments,
      curatedFlags: s.curatedFlags,
      selectedResultId: s.selectedResultId,
      setSelectedResult: s.setSelectedResult,
      currentPage: s.currentPage,
      pageSize: s.pageSize,
      setCurrentPage: s.setCurrentPage,
      checkpoint: s.checkpoint,
    }))
  );

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const pageResults = filteredResults.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div data-testid="curation-result-list" className="bg-white dark:bg-gray-800 rounded mb-3">
      <table className="w-full text-xs table-fixed">
        <thead>
          <tr className="text-slate-400 dark:text-gray-500 border-b border-slate-200 dark:border-gray-700">
            <th className="text-left p-2 w-12">Status</th>
            <th className="text-left p-2">Question</th>
            <th className="text-left p-2 w-40">Model</th>
            <th data-col="result" className="text-left p-2 w-40">
              Result
            </th>
            <th className="text-left p-2 w-16">Curated</th>
          </tr>
        </thead>
        <tbody>
          {pageResults.map((result, idx) => {
            const resultId = result.metadata.result_id ?? result.metadata.template_id;
            const status = activeCuratorId
              ? computeResultStatus(resultId, activeCuratorId, templateJudgments, rubricJudgments, curatedFlags)
              : 'pending';
            const isSelected = selectedResultId === resultId;

            const selectedIndex = isSelected ? pageResults.indexOf(result) : -1;

            return (
              <React.Fragment key={resultId}>
                <tr
                  tabIndex={0}
                  role="row"
                  onClick={() => setSelectedResult(isSelected ? null : resultId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedResult(isSelected ? null : resultId);
                    }
                  }}
                  className={`border-b border-slate-200/60 dark:border-gray-700/50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-200/60 dark:bg-gray-700/50' : 'hover:bg-slate-100 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <td className="p-2">
                    <CurationStatusBadge status={status} />
                  </td>
                  <td className="p-2 text-slate-700 dark:text-gray-300 truncate max-w-md">
                    {result.metadata.question_text}
                  </td>
                  <td className="p-2 text-slate-500 dark:text-gray-400">{result.metadata.answering.model_name}</td>
                  <td data-testid={`result-cell-row-${idx}`} className="p-2">
                    <FailurePill failure={result.metadata.failure} size="sm" />
                  </td>
                  <td className="p-2">
                    {curatedFlags[activeCuratorId ?? '']?.[resultId] ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-slate-400 dark:text-gray-600">{'\u2014'}</span>
                    )}
                  </td>
                </tr>
                {isSelected && (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <CurationDetailPanel
                        result={result}
                        answerTemplateSource={
                          checkpoint?.[result.metadata.question_id]?.answer_template ??
                          checkpoint?.[result.metadata.question_id.replace(/^urn:uuid:/, '')]?.answer_template
                        }
                        rawAnswer={
                          result.raw_answer ??
                          checkpoint?.[result.metadata.question_id]?.raw_answer ??
                          checkpoint?.[result.metadata.question_id.replace(/^urn:uuid:/, '')]?.raw_answer
                        }
                        onPrev={() => {
                          if (selectedIndex > 0) {
                            const prev = pageResults[selectedIndex - 1];
                            setSelectedResult(prev.metadata.result_id ?? prev.metadata.template_id);
                          }
                        }}
                        onNext={() => {
                          if (selectedIndex < pageResults.length - 1) {
                            const next = pageResults[selectedIndex + 1];
                            setSelectedResult(next.metadata.result_id ?? next.metadata.template_id);
                          }
                        }}
                        hasPrev={selectedIndex > 0}
                        hasNext={selectedIndex < pageResults.length - 1}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 p-2 text-xs text-slate-500 dark:text-gray-400">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="hover:text-slate-800 dark:hover:text-gray-200 disabled:opacity-30"
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
                className={`px-2 py-0.5 rounded ${page === currentPage ? 'bg-slate-300 dark:bg-gray-600 text-slate-800 dark:text-gray-200' : 'hover:text-slate-800 dark:hover:text-gray-200'}`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="hover:text-slate-800 dark:hover:text-gray-200 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
