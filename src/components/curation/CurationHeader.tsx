import { Download, Upload, FolderOpen, FileCheck, FileJson } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';
import { computeStatusCounts, computeScenarioStatusCounts } from '../../utils/curation';
import { CuratorManager } from './CuratorManager';

interface CurationHeaderProps {
  resultIds: string[];
  onLoadCheckpoint: () => void;
  onLoadResults: () => void;
  onLoadCuration: () => void;
  onLoadSession: () => void;
  onDownloadSession: () => void;
  onExport: () => void;
  checkpointLoaded: boolean;
  resultsLoaded: boolean;
  hasUnsavedChanges: boolean;
}

export function CurationHeader({
  resultIds,
  onLoadCheckpoint,
  onLoadResults,
  onLoadCuration,
  onLoadSession,
  onDownloadSession,
  onExport,
  checkpointLoaded,
  resultsLoaded,
  hasUnsavedChanges,
}: CurationHeaderProps) {
  const {
    activeCuratorId,
    templateJudgments,
    rubricJudgments,
    curatedFlags,
    scenarioTemplateJudgments,
    scenarioRubricJudgments,
    scenarioCuratedFlags,
    filters,
    setFilters,
    results,
    scenarioResults,
    sourceMetadata,
  } = useCurationStore(
    useShallow((s) => ({
      activeCuratorId: s.activeCuratorId,
      templateJudgments: s.templateJudgments,
      rubricJudgments: s.rubricJudgments,
      curatedFlags: s.curatedFlags,
      scenarioTemplateJudgments: s.scenarioTemplateJudgments,
      scenarioRubricJudgments: s.scenarioRubricJudgments,
      scenarioCuratedFlags: s.scenarioCuratedFlags,
      filters: s.filters,
      setFilters: s.setFilters,
      results: s.results,
      scenarioResults: s.scenarioResults,
      sourceMetadata: s.sourceMetadata,
    }))
  );

  const resultCounts = activeCuratorId
    ? computeStatusCounts(resultIds, activeCuratorId, templateJudgments, rubricJudgments, curatedFlags)
    : { curated: 0, partial: 0, pending: resultIds.length };

  const scenarioIds = scenarioResults.map((s) => s.scenario_id);
  const scenarioCounts = activeCuratorId
    ? computeScenarioStatusCounts(
        scenarioIds,
        activeCuratorId,
        scenarioTemplateJudgments,
        scenarioRubricJudgments,
        scenarioCuratedFlags
      )
    : { curated: 0, partial: 0, pending: scenarioIds.length };

  const counts = {
    curated: resultCounts.curated + scenarioCounts.curated,
    partial: resultCounts.partial + scenarioCounts.partial,
    pending: resultCounts.pending + scenarioCounts.pending,
  };

  const answeringModels = [...new Set(results.map((r) => r.metadata.answering.model_name))];
  const parsingModels = [...new Set(results.map((r) => r.metadata.parsing.model_name))];

  const dataLoaded = results.length > 0 || scenarioResults.length > 0;

  return (
    <div data-testid="curation-header" className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
      {/* Row 1: Loading + Curator */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          {dataLoaded ? (
            <>
              {/* When data is loaded: full control set for swapping data */}
              <button
                onClick={onLoadSession}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-teal-600 hover:bg-teal-500 text-white transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open Session
              </button>
              <span className="text-[10px] text-slate-400 dark:text-gray-500 mx-1">or</span>
              <button
                onClick={onLoadCheckpoint}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border transition-colors ${
                  checkpointLoaded
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                    : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-300 dark:border-gray-600 hover:border-slate-400 dark:hover:border-gray-400'
                }`}
              >
                <FileJson className="w-3 h-3" />
                {checkpointLoaded ? 'Checkpoint loaded' : '1. Checkpoint'}
              </button>
              <button
                onClick={onLoadResults}
                disabled={!checkpointLoaded}
                title={!checkpointLoaded ? 'Load a checkpoint first' : 'Load verification results'}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border transition-colors ${
                  !checkpointLoaded
                    ? 'opacity-40 cursor-not-allowed bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-300 dark:border-gray-600'
                    : resultsLoaded
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                      : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-300 dark:border-gray-600 hover:border-slate-400 dark:hover:border-gray-400'
                }`}
              >
                <FileCheck className="w-3 h-3" />
                {resultsLoaded ? 'Results loaded' : '2. Results'}
              </button>
            </>
          ) : (
            /* When empty: just the title, loading is in the empty state cards */
            <span className="text-sm font-medium text-slate-600 dark:text-gray-300">Curation Review</span>
          )}
        </div>
        <CuratorManager />
      </div>

      {/* Row 2: Session actions (when data loaded) */}
      {dataLoaded && (
        <div className="flex justify-between items-center">
          <button
            onClick={onLoadCuration}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:border-slate-400 dark:hover:border-gray-400 bg-white dark:bg-gray-700 transition-colors"
          >
            <Upload className="w-3 h-3" />
            Import Judgments
          </button>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}
            <button
              onClick={onDownloadSession}
              title="Download session (checkpoint + results + judgments)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-teal-700 hover:bg-teal-600 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Save Session
            </button>
            <button
              onClick={onExport}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-gray-600 text-slate-500 dark:text-gray-400 hover:border-slate-400 dark:hover:border-gray-400 bg-white dark:bg-gray-700 transition-colors"
            >
              Export Judgments...
            </button>
          </div>
        </div>
      )}

      {/* Row 3: Source metadata bar */}
      {dataLoaded && sourceMetadata && (
        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-gray-500 border-t border-slate-100 dark:border-gray-700 pt-2">
          <span className="font-medium text-slate-500 dark:text-gray-400">{sourceMetadata.checkpointName}</span>
          {sourceMetadata.jobId !== 'unknown' && (
            <>
              <span className="text-slate-300 dark:text-gray-600">|</span>
              <span>Job: {sourceMetadata.jobId}</span>
            </>
          )}
          {sourceMetadata.kareninaVersion !== 'unknown' && (
            <>
              <span className="text-slate-300 dark:text-gray-600">|</span>
              <span>v{sourceMetadata.kareninaVersion}</span>
            </>
          )}
          <span className="text-slate-300 dark:text-gray-600">|</span>
          <span>
            {results.length} result{results.length !== 1 ? 's' : ''}
            {scenarioResults.length > 0 &&
              `, ${scenarioResults.length} scenario${scenarioResults.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}

      {/* Row 4: Status counters + filters */}
      {dataLoaded && (
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-gray-300 border-t border-slate-100 dark:border-gray-700 pt-2">
          <div className="flex gap-3">
            <span>
              Curated: <span className="font-medium text-green-600 dark:text-green-400">{counts.curated}</span>
            </span>
            <span>
              Partial: <span className="font-medium text-amber-600 dark:text-amber-400">{counts.partial}</span>
            </span>
            <span>
              Pending: <span className="font-medium text-red-600 dark:text-red-400">{counts.pending}</span>
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
