import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';
import { computeStatusCounts } from '../../utils/curation';
import { CuratorManager } from './CuratorManager';

interface CurationHeaderProps {
  resultIds: string[];
  onLoadCheckpoint: () => void;
  onLoadResults: () => void;
  onLoadCuration: () => void;
  onExport: () => void;
  checkpointLoaded: boolean;
  resultsLoaded: boolean;
}

export function CurationHeader({
  resultIds,
  onLoadCheckpoint,
  onLoadResults,
  onLoadCuration,
  onExport,
  checkpointLoaded,
  resultsLoaded,
}: CurationHeaderProps) {
  const { activeCuratorId, templateJudgments, rubricJudgments, curatedFlags, filters, setFilters, results } =
    useCurationStore(
      useShallow((s) => ({
        activeCuratorId: s.activeCuratorId,
        templateJudgments: s.templateJudgments,
        rubricJudgments: s.rubricJudgments,
        curatedFlags: s.curatedFlags,
        filters: s.filters,
        setFilters: s.setFilters,
        results: s.results,
      }))
    );

  const counts = activeCuratorId
    ? computeStatusCounts(resultIds, activeCuratorId, templateJudgments, rubricJudgments, curatedFlags)
    : { curated: 0, partial: 0, pending: 0 };

  const answeringModels = [...new Set(results.map((r) => r.metadata.answering.model_name))];
  const parsingModels = [...new Set(results.map((r) => r.metadata.parsing.model_name))];

  return (
    <div data-testid="curation-header" className="bg-white dark:bg-gray-800 rounded p-3 mb-3">
      {/* Row 1: Upload buttons + curator selector */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={onLoadCheckpoint}
            className={`px-3 py-1.5 text-xs rounded border hover:border-slate-400 dark:hover:border-gray-400 ${
              checkpointLoaded
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                : 'bg-blue-50 dark:bg-blue-900/50 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-600'
            }`}
          >
            {checkpointLoaded ? 'Checkpoint loaded' : 'Load Checkpoint'}
          </button>
          <button
            onClick={onLoadResults}
            className={`px-3 py-1.5 text-xs rounded border hover:border-slate-400 dark:hover:border-gray-400 ${
              resultsLoaded
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                : 'bg-blue-50 dark:bg-blue-900/50 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-600'
            }`}
          >
            {resultsLoaded ? 'Results loaded' : 'Load Results'}
          </button>
          <button
            onClick={onLoadCuration}
            className="bg-blue-50 dark:bg-blue-900/50 text-slate-700 dark:text-gray-300 px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-gray-600 hover:border-slate-400 dark:hover:border-gray-400"
          >
            Load Previous Curation
          </button>
          {results.length > 0 && (
            <button
              onClick={onExport}
              className="bg-green-50 dark:bg-green-900/50 text-slate-700 dark:text-gray-300 px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-gray-600 hover:border-slate-400 dark:hover:border-gray-400"
            >
              Export Curation
            </button>
          )}
        </div>
        <div className="relative">
          <CuratorManager />
        </div>
      </div>

      {/* Row 2: Status counters + filters */}
      {results.length > 0 && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex gap-3">
            <span>
              Curated: <span className="text-green-400">{counts.curated}</span>
            </span>
            <span>
              Partial: <span className="text-amber-400">{counts.partial}</span>
            </span>
            <span>
              Pending: <span className="text-red-400">{counts.pending}</span>
            </span>
          </div>
          <span className="text-slate-400 dark:text-gray-600">|</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as typeof filters.status })}
            className="bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs text-slate-700 dark:text-gray-300"
          >
            <option value="all">All Status</option>
            <option value="curated">Curated</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={filters.passStatus}
            onChange={(e) => setFilters({ passStatus: e.target.value as typeof filters.passStatus })}
            className="bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs text-slate-700 dark:text-gray-300"
          >
            <option value="all">All Results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="error">Error</option>
          </select>
          <select
            value={filters.answeringModel ?? ''}
            onChange={(e) => setFilters({ answeringModel: e.target.value || null })}
            className="bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs text-slate-700 dark:text-gray-300"
          >
            <option value="">All Answering Models</option>
            {answeringModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filters.parsingModel ?? ''}
            onChange={(e) => setFilters({ parsingModel: e.target.value || null })}
            className="bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs text-slate-700 dark:text-gray-300"
          >
            <option value="">All Parsing Models</option>
            {parsingModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            placeholder="Search questions..."
            className="bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs text-slate-700 dark:text-gray-300 placeholder-slate-400 dark:placeholder-gray-500 w-48"
          />
          {(filters.status !== 'all' ||
            filters.passStatus !== 'all' ||
            filters.answeringModel ||
            filters.parsingModel ||
            filters.searchQuery) && (
            <button
              onClick={() =>
                setFilters({
                  status: 'all',
                  passStatus: 'all',
                  answeringModel: null,
                  parsingModel: null,
                  searchQuery: '',
                })
              }
              className="text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 text-xs"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
