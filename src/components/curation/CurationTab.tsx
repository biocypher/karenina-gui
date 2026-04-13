import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurationStore } from '../../stores/useCurationStore';
import { computeResultStatus, resolveVerdict } from '../../utils/curation';
import { parseCurationJSON } from '../../utils/curation/importCuration';
import { groupScenarioResults } from '../../utils/curation/groupScenarioResults';
import { parseVerificationResultsJSON } from '../../utils/import';
import { isJsonLdCheckpoint } from '../../utils/checkpoint/validators';
import { jsonLdToV2 } from '../../utils/checkpoint/converter';
import { extractScenarioDefinitions } from '../../utils/checkpoint/scenarioExtractor';
import { CurationHeader } from './CurationHeader';
import { CurationResultList } from './CurationResultList';
import { CurationDetailPanel } from './CurationDetailPanel';
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

  const handleLoadCheckpoint = useCallback(() => {
    checkpointInputRef.current?.click();
  }, []);

  const handleLoadResults = useCallback(() => {
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
      try {
        const text = await file.text();
        const parsed = parseVerificationResultsJSON(text);
        const resultsArray = Object.values(parsed.results) as VerificationResult[];
        const { standaloneResults, scenarioResults } = groupScenarioResults(resultsArray);

        store.loadData(
          loadedCheckpoint.current?.checkpoint ?? ({} as Checkpoint),
          standaloneResults,
          loadedCheckpoint.current?.scenarioDefinitions ?? [],
          scenarioResults,
          {
            checkpointName: loadedCheckpoint.current?.name ?? 'unknown',
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

  // Filter results
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
      if (store.filters.passStatus === 'error' && r.metadata.completed_without_errors) return false;
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

  const selectedResult = store.selectedResultId
    ? (store.results.find((r) => (r.metadata.result_id ?? r.metadata.template_id) === store.selectedResultId) ?? null)
    : null;

  const selectedIndex = selectedResult ? filteredResults.indexOf(selectedResult) : -1;

  const navigateResult = (delta: number) => {
    const newIndex = selectedIndex + delta;
    if (newIndex >= 0 && newIndex < filteredResults.length) {
      const r = filteredResults[newIndex];
      store.setSelectedResult(r.metadata.result_id ?? r.metadata.template_id);
    }
  };

  return (
    <div className="p-4">
      <input
        ref={checkpointInputRef}
        type="file"
        accept=".json,.jsonld"
        className="hidden"
        onChange={handleCheckpointFile}
      />
      <input ref={resultsInputRef} type="file" accept=".json" className="hidden" onChange={handleResultsFile} />
      <input ref={curationInputRef} type="file" accept=".json" className="hidden" onChange={handleCurationFile} />

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-3 text-xs text-red-300 flex justify-between">
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
        onExport={() => setExportOpen(true)}
        checkpointLoaded={checkpointLoaded}
        resultsLoaded={store.results.length > 0 || store.scenarioResults.length > 0}
      />

      {store.results.length === 0 && store.scenarioResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <div className="text-lg mb-2">No data loaded</div>
          <div className="text-xs">
            Load a checkpoint + results file, or a previous curation session to get started.
          </div>
        </div>
      ) : (
        <>
          {store.scenarioResults.length > 0 && <CurationScenarioSection />}
          {store.results.length > 0 && (
            <>
              <CurationResultList filteredResults={filteredResults} />
              {selectedResult && (
                <CurationDetailPanel
                  result={selectedResult}
                  onPrev={() => navigateResult(-1)}
                  onNext={() => navigateResult(1)}
                  hasPrev={selectedIndex > 0}
                  hasNext={selectedIndex < filteredResults.length - 1}
                />
              )}
            </>
          )}
        </>
      )}

      <CurationExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
