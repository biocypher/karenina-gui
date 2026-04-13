import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';
import { computeStatusCounts } from '../../utils/curation';
import { CuratorManager } from './CuratorManager';

interface CurationHeaderProps {
  resultIds: string[];
  onLoadCheckpointAndResults: () => void;
  onLoadCuration: () => void;
  onExport: () => void;
}

export function CurationHeader({
  resultIds,
  onLoadCheckpointAndResults,
  onLoadCuration,
  onExport,
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
    <div className="bg-gray-800 rounded p-3 mb-3">
      {/* Row 1: Upload buttons + curator selector */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <button
            onClick={onLoadCheckpointAndResults}
            className="bg-blue-900/50 text-gray-300 px-3 py-1.5 text-xs rounded border border-gray-600 hover:border-gray-400"
          >
            Load Checkpoint + Results
          </button>
          <button
            onClick={onLoadCuration}
            className="bg-blue-900/50 text-gray-300 px-3 py-1.5 text-xs rounded border border-gray-600 hover:border-gray-400"
          >
            Load Previous Curation
          </button>
          {results.length > 0 && (
            <button
              onClick={onExport}
              className="bg-green-900/50 text-gray-300 px-3 py-1.5 text-xs rounded border border-gray-600 hover:border-gray-400"
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
          <span className="text-gray-600">|</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as typeof filters.status })}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-300"
          >
            <option value="all">All Status</option>
            <option value="curated">Curated</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={filters.passStatus}
            onChange={(e) => setFilters({ passStatus: e.target.value as typeof filters.passStatus })}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-300"
          >
            <option value="all">All Results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="error">Error</option>
          </select>
          <select
            value={filters.answeringModel ?? ''}
            onChange={(e) => setFilters({ answeringModel: e.target.value || null })}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-300"
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
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-300"
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
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-300 placeholder-gray-500 w-48"
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
              className="text-gray-400 hover:text-gray-200 text-xs"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
