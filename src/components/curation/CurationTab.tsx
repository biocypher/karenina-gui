import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, FilePlus2 } from 'lucide-react';
import { useCurationStore } from '../../stores/useCurationStore';
import { computeResultStatus, resolveVerdict, buildSessionExport } from '../../utils/curation';
import { parseCurationJSON, parseSessionJSON } from '../../utils/curation/importCuration';
import { groupScenarioResults } from '../../utils/curation/groupScenarioResults';
import { parseVerificationResultsJSON } from '../../utils/import';
import { isJsonLdCheckpoint } from '../../utils/checkpoint/validators';
import { jsonLdToV2 } from '../../utils/checkpoint/converter';
import { extractScenarioDefinitions } from '../../utils/checkpoint/scenarioExtractor';
import { downloadFile } from '../../utils/fileDownload';
import { CurationHeader } from './CurationHeader';
import { CurationResultList } from './CurationResultList';
import { CurationExportDialog } from './CurationExportDialog';
import { CurationScenarioSection } from './CurationScenarioSection';
import type { VerificationResult } from '../../types/verification';
import type { ScenarioDefinition } from '../../types/scenario';
import type { Checkpoint } from '../../types/checkpoint';

export function CurationTab() {
  const store = useCurationStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkpointInputRef = useRef<HTMLInputElement>(null);
  const resultsInputRef = useRef<HTMLInputElement>(null);
  const curationInputRef = useRef<HTMLInputElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const hasJudgments =
        Object.keys(store.templateJudgments).length > 0 ||
        Object.keys(store.rubricJudgments).length > 0 ||
        Object.keys(store.scenarioTemplateJudgments).length > 0 ||
        Object.keys(store.scenarioRubricJudgments).length > 0;
      if (hasJudgments && !store.hasBeenExported) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [
    store.templateJudgments,
    store.rubricJudgments,
    store.scenarioTemplateJudgments,
    store.scenarioRubricJudgments,
    store.hasBeenExported,
  ]);

  // Loaded checkpoint stored in ref, with state flag for UI feedback
  const loadedCheckpoint = useRef<{
    checkpoint: Checkpoint;
    name: string;
    scenarioDefinitions: ScenarioDefinition[];
  } | null>(null);
  const [checkpointLoaded, setCheckpointLoaded] = useState(false);

  // --- Loading handlers ---

  const handleLoadCheckpoint = useCallback(() => {
    checkpointInputRef.current?.click();
  }, []);

  const handleLoadResults = useCallback(() => {
    if (!loadedCheckpoint.current) {
      setError('Please load a checkpoint file first.');
      return;
    }
    resultsInputRef.current?.click();
  }, []);

  const handleCheckpointFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isJsonLdCheckpoint(parsed)) {
        setError('Invalid checkpoint file: expected JSON-LD format with @context');
        return;
      }
      const converted = jsonLdToV2(parsed);
      const scenarioDefinitions = extractScenarioDefinitions(parsed);
      loadedCheckpoint.current = {
        checkpoint: converted.checkpoint,
        name: parsed.name ?? file.name,
        scenarioDefinitions,
      };
      setCheckpointLoaded(true);
      setError(null);
    } catch (err) {
      setError(`Failed to parse checkpoint: ${err instanceof Error ? err.message : String(err)}`);
    }
    e.target.value = '';
  }, []);

  const handleResultsFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!loadedCheckpoint.current) {
        setError('Please load a checkpoint file first.');
        e.target.value = '';
        return;
      }
      try {
        const text = await file.text();
        const parsed = parseVerificationResultsJSON(text);
        const resultsArray = Object.values(parsed.results) as VerificationResult[];
        const { standaloneResults, scenarioResults } = groupScenarioResults(resultsArray, parsed.scenarioOutcomes);

        store.loadData(
          loadedCheckpoint.current.checkpoint,
          standaloneResults,
          loadedCheckpoint.current.scenarioDefinitions,
          scenarioResults,
          {
            checkpointName: loadedCheckpoint.current.name,
            jobId: parsed.metadata?.job_id ?? 'unknown',
            kareninaVersion: parsed.metadata?.karenina_version ?? 'unknown',
          }
        );

        setError(null);
      } catch (err) {
        setError(`Failed to parse results: ${err instanceof Error ? err.message : String(err)}`);
      }
      e.target.value = '';
    },
    [store]
  );

  const handleLoadCuration = useCallback(() => {
    curationInputRef.current?.click();
  }, []);

  const handleCurationFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseCurationJSON(text);
        store.importCuration(
          parsed.curators,
          parsed.templateJudgments,
          parsed.rubricJudgments,
          parsed.curatedFlags,
          parsed.scenarioTemplateJudgments,
          parsed.scenarioRubricJudgments,
          parsed.scenarioCuratedFlags
        );
        setError(null);
      } catch (err) {
        setError(`Failed to parse curation file: ${err instanceof Error ? err.message : String(err)}`);
      }
      e.target.value = '';
    },
    [store]
  );

  const handleLoadSession = useCallback(() => {
    sessionInputRef.current?.click();
  }, []);

  const handleSessionFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseSessionJSON(text);

        store.loadSession(
          parsed.sessionData.checkpoint,
          parsed.sessionData.results,
          parsed.sessionData.scenarioDefinitions,
          parsed.sessionData.scenarioResults,
          parsed.sourceMetadata,
          parsed.curators,
          parsed.templateJudgments,
          parsed.rubricJudgments,
          parsed.curatedFlags,
          parsed.scenarioTemplateJudgments,
          parsed.scenarioRubricJudgments,
          parsed.scenarioCuratedFlags
        );

        // Mark checkpoint as loaded for consistency with fresh-start path
        loadedCheckpoint.current = {
          checkpoint: parsed.sessionData.checkpoint,
          name: parsed.sourceMetadata.checkpointName,
          scenarioDefinitions: parsed.sessionData.scenarioDefinitions,
        };
        setCheckpointLoaded(true);
        setError(null);
      } catch (err) {
        setError(`Failed to load session: ${err instanceof Error ? err.message : String(err)}`);
      }
      e.target.value = '';
    },
    [store]
  );

  const handleDownloadSession = useCallback(() => {
    const exportData = buildSessionExport({
      curators: store.curators,
      templateJudgments: store.templateJudgments,
      rubricJudgments: store.rubricJudgments,
      curatedFlags: store.curatedFlags,
      scenarioTemplateJudgments: store.scenarioTemplateJudgments,
      scenarioRubricJudgments: store.scenarioRubricJudgments,
      scenarioCuratedFlags: store.scenarioCuratedFlags,
      sourceMetadata: store.sourceMetadata,
      checkpoint: store.checkpoint ?? ({} as Checkpoint),
      results: store.results,
      scenarioDefinitions: store.scenarioDefinitions,
      scenarioResults: store.scenarioResults,
    });
    const json = JSON.stringify(exportData, null, 2);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(json, `curation_session_${date}.json`, 'application/json');
    store.markExported();
  }, [store]);

  // --- Filtering ---

  const filteredResults = store.results.filter((r) => {
    const resultId = r.metadata.result_id ?? r.metadata.template_id;

    if (store.filters.status !== 'all' && store.activeCuratorId) {
      const status = computeResultStatus(
        resultId,
        store.activeCuratorId,
        store.templateJudgments,
        store.rubricJudgments,
        store.curatedFlags
      );
      if (status !== store.filters.status) return false;
    }

    if (store.filters.passStatus !== 'all') {
      const passed = resolveVerdict(r);
      // Legacy: r.metadata.completed_without_errors -> r.metadata.failure === null.
      // The "error" pass-status filter keeps rows whose pipeline did not complete
      // cleanly, i.e. any row carrying a failure.
      if (store.filters.passStatus === 'error' && r.metadata.failure === null) return false;
      if (store.filters.passStatus === 'pass' && passed !== true) return false;
      if (store.filters.passStatus === 'fail' && passed !== false) return false;
    }

    if (store.filters.answeringModel && r.metadata.answering.model_name !== store.filters.answeringModel) return false;
    if (store.filters.parsingModel && r.metadata.parsing.model_name !== store.filters.parsingModel) return false;

    if (store.filters.searchQuery) {
      const q = store.filters.searchQuery.toLowerCase();
      if (!r.metadata.question_text.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const allResultIds = store.results.map((r) => r.metadata.result_id ?? r.metadata.template_id);
  const dataLoaded = store.results.length > 0 || store.scenarioResults.length > 0;

  const hasUnsavedChanges =
    !store.hasBeenExported &&
    (Object.keys(store.templateJudgments).length > 0 ||
      Object.keys(store.rubricJudgments).length > 0 ||
      Object.keys(store.scenarioTemplateJudgments).length > 0 ||
      Object.keys(store.scenarioRubricJudgments).length > 0);

  return (
    <div className="p-4">
      {/* Hidden file inputs */}
      <input
        ref={checkpointInputRef}
        type="file"
        accept=".json,.jsonld"
        className="hidden"
        onChange={handleCheckpointFile}
      />
      <input ref={resultsInputRef} type="file" accept=".json" className="hidden" onChange={handleResultsFile} />
      <input ref={curationInputRef} type="file" accept=".json" className="hidden" onChange={handleCurationFile} />
      <input ref={sessionInputRef} type="file" accept=".json" className="hidden" onChange={handleSessionFile} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-2 mb-3 text-xs text-red-300 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      <CurationHeader
        resultIds={allResultIds}
        onLoadCheckpoint={handleLoadCheckpoint}
        onLoadResults={handleLoadResults}
        onLoadCuration={handleLoadCuration}
        onLoadSession={handleLoadSession}
        onDownloadSession={handleDownloadSession}
        onExport={() => setExportOpen(true)}
        checkpointLoaded={checkpointLoaded}
        resultsLoaded={dataLoaded}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Curator nudge: shown when data is loaded but no curator exists */}
      {dataLoaded && store.curators.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded p-3 mb-3 flex items-center justify-between">
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-medium">Add a curator to start reviewing.</span> Each curator's judgments are recorded
            independently to avoid anchoring bias.
          </div>
        </div>
      )}

      {!dataLoaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
          {/* Resume session card */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <FolderOpen className="w-8 h-8 mx-auto mb-3 text-teal-500 dark:text-teal-400" />
            <h3 className="text-sm font-medium text-slate-800 dark:text-gray-200 mb-1">Resume Session</h3>
            <p className="text-xs text-slate-400 dark:text-gray-500 mb-4">
              Load a saved curation session to continue where you left off.
            </p>
            <button
              onClick={handleLoadSession}
              className="px-4 py-2 text-xs font-medium rounded bg-teal-600 hover:bg-teal-500 text-white transition-colors"
            >
              Open Session File
            </button>
          </div>
          {/* Start fresh card */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <FilePlus2 className="w-8 h-8 mx-auto mb-3 text-blue-500 dark:text-blue-400" />
            <h3 className="text-sm font-medium text-slate-800 dark:text-gray-200 mb-1">Start New Session</h3>
            {checkpointLoaded ? (
              <>
                <p className="text-xs text-green-500 dark:text-green-400 mb-1">Checkpoint loaded</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 mb-4">
                  Now load verification results to begin curation.
                </p>
                <button
                  onClick={handleLoadResults}
                  className="px-4 py-2 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Load Results
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 dark:text-gray-500 mb-4">
                  Load a checkpoint (.jsonld) then verification results to begin curation.
                </p>
                <button
                  onClick={handleLoadCheckpoint}
                  className="px-4 py-2 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Load Checkpoint
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {store.scenarioResults.length > 0 && <CurationScenarioSection />}
          {store.results.length > 0 && <CurationResultList filteredResults={filteredResults} />}
        </>
      )}

      <CurationExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
