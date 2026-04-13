import { create } from 'zustand';
import type { Curator, TraitJudgment, CurationFilters, CurationStatus } from '../types/curation';
import type { VerificationResult } from '../types/verification';
import type { ScenarioDefinition, ScenarioExecutionResult } from '../types/scenario';
import type { Checkpoint } from '../types/checkpoint';

interface CurationState {
  // Data inputs
  checkpoint: Checkpoint | null;
  results: VerificationResult[];
  scenarioDefinitions: ScenarioDefinition[];
  scenarioResults: ScenarioExecutionResult[];
  sourceMetadata: { checkpointName: string; jobId: string; kareninaVersion: string } | null;

  // Curator management
  curators: Curator[];
  activeCuratorId: string | null;

  // QA judgments: [curatorId][resultId][fieldOrTraitName]
  templateJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  rubricJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  curatedFlags: Record<string, Record<string, boolean>>;

  // Scenario judgments: [curatorId][scenarioId][nodeId][fieldOrTraitName]
  scenarioTemplateJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioRubricJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioCuratedFlags: Record<string, Record<string, boolean>>;

  // Export tracking
  hasBeenExported: boolean;

  // UI state
  selectedResultId: string | null;
  selectedScenarioId: string | null;
  selectedNodeId: string | null;
  activeTab: 'template' | 'rubric';
  filters: CurationFilters;
  currentPage: number;
  pageSize: number;

  // Actions: curator management
  addCurator: (name: string, metadata: Record<string, string>) => void;
  removeCurator: (curatorId: string) => void;
  setActiveCurator: (curatorId: string) => void;
  updateCuratorMetadata: (curatorId: string, metadata: Record<string, string>) => void;

  // Actions: data loading
  loadData: (
    checkpoint: Checkpoint,
    results: VerificationResult[],
    scenarioDefinitions: ScenarioDefinition[],
    scenarioResults: ScenarioExecutionResult[],
    sourceMetadata: CurationState['sourceMetadata']
  ) => void;

  // Actions: QA judgments
  setTemplateJudgment: (resultId: string, fieldName: string, judgment: TraitJudgment) => void;
  clearTemplateJudgment: (resultId: string, fieldName: string) => void;
  setRubricJudgment: (resultId: string, traitName: string, judgment: TraitJudgment) => void;
  clearRubricJudgment: (resultId: string, traitName: string) => void;
  toggleCurated: (resultId: string) => void;

  // Actions: scenario judgments
  setScenarioTemplateJudgment: (scenarioId: string, nodeId: string, fieldName: string, judgment: TraitJudgment) => void;
  clearScenarioTemplateJudgment: (scenarioId: string, nodeId: string, fieldName: string) => void;
  setScenarioRubricJudgment: (scenarioId: string, nodeId: string, traitName: string, judgment: TraitJudgment) => void;
  clearScenarioRubricJudgment: (scenarioId: string, nodeId: string, traitName: string) => void;
  toggleScenarioCurated: (scenarioId: string) => void;

  // Actions: UI state
  setSelectedResult: (resultId: string | null) => void;
  setSelectedScenario: (scenarioId: string | null) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setActiveTab: (tab: 'template' | 'rubric') => void;
  setFilters: (filters: Partial<CurationFilters>) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Actions: export
  markExported: () => void;

  // Actions: import previous curation
  importCuration: (
    curators: Curator[],
    templateJudgments: CurationState['templateJudgments'],
    rubricJudgments: CurationState['rubricJudgments'],
    curatedFlags: CurationState['curatedFlags'],
    scenarioTemplateJudgments: CurationState['scenarioTemplateJudgments'],
    scenarioRubricJudgments: CurationState['scenarioRubricJudgments'],
    scenarioCuratedFlags: CurationState['scenarioCuratedFlags']
  ) => void;

  // Actions: computed
  getResultStatus: (resultId: string) => CurationStatus;

  // Actions: reset
  reset: () => void;
}

const DEFAULT_FILTERS: CurationFilters = {
  status: 'all',
  passStatus: 'all',
  answeringModel: null,
  parsingModel: null,
  searchQuery: '',
};

function generateId(): string {
  return crypto.randomUUID();
}

/** Return a shallow copy of `obj` without the given `key`. */
function omitKey<T extends Record<string, unknown>>(obj: T, key: string): T {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

export const useCurationStore = create<CurationState>((set, get) => ({
  // Initial state
  checkpoint: null,
  results: [],
  scenarioDefinitions: [],
  scenarioResults: [],
  sourceMetadata: null,
  curators: [],
  activeCuratorId: null,
  templateJudgments: {},
  rubricJudgments: {},
  curatedFlags: {},
  scenarioTemplateJudgments: {},
  scenarioRubricJudgments: {},
  scenarioCuratedFlags: {},
  hasBeenExported: false,
  selectedResultId: null,
  selectedScenarioId: null,
  selectedNodeId: null,
  activeTab: 'template',
  filters: { ...DEFAULT_FILTERS },
  currentPage: 1,
  pageSize: 25,

  addCurator: (name, metadata) => {
    const id = generateId();
    set((state) => ({
      curators: [...state.curators, { id, name, metadata }],
      activeCuratorId: state.activeCuratorId ?? id,
    }));
  },

  removeCurator: (curatorId) => {
    set((state) => {
      const newCurators = state.curators.filter((c) => c.id !== curatorId);
      return {
        curators: newCurators,
        activeCuratorId: state.activeCuratorId === curatorId ? (newCurators[0]?.id ?? null) : state.activeCuratorId,
        templateJudgments: omitKey(state.templateJudgments, curatorId),
        rubricJudgments: omitKey(state.rubricJudgments, curatorId),
        curatedFlags: omitKey(state.curatedFlags, curatorId),
        scenarioTemplateJudgments: omitKey(state.scenarioTemplateJudgments, curatorId),
        scenarioRubricJudgments: omitKey(state.scenarioRubricJudgments, curatorId),
        scenarioCuratedFlags: omitKey(state.scenarioCuratedFlags, curatorId),
      };
    });
  },

  setActiveCurator: (curatorId) => set({ activeCuratorId: curatorId }),

  updateCuratorMetadata: (curatorId, metadata) => {
    set((state) => ({
      curators: state.curators.map((c) => (c.id === curatorId ? { ...c, metadata } : c)),
    }));
  },

  loadData: (checkpoint, results, scenarioDefinitions, scenarioResults, sourceMetadata) => {
    set({
      checkpoint,
      results,
      scenarioDefinitions,
      scenarioResults,
      sourceMetadata,
      selectedResultId: null,
      selectedScenarioId: null,
      selectedNodeId: null,
      currentPage: 1,
    });
  },

  setTemplateJudgment: (resultId, fieldName, judgment) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => ({
      hasBeenExported: false,
      templateJudgments: {
        ...state.templateJudgments,
        [activeCuratorId]: {
          ...state.templateJudgments[activeCuratorId],
          [resultId]: {
            ...state.templateJudgments[activeCuratorId]?.[resultId],
            [fieldName]: judgment,
          },
        },
      },
    }));
  },

  clearTemplateJudgment: (resultId, fieldName) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => {
      const curatorJudgments = { ...state.templateJudgments[activeCuratorId] };
      if (curatorJudgments[resultId]) {
        curatorJudgments[resultId] = omitKey(curatorJudgments[resultId], fieldName);
      }
      return {
        hasBeenExported: false,
        templateJudgments: {
          ...state.templateJudgments,
          [activeCuratorId]: curatorJudgments,
        },
      };
    });
  },

  setRubricJudgment: (resultId, traitName, judgment) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => ({
      hasBeenExported: false,
      rubricJudgments: {
        ...state.rubricJudgments,
        [activeCuratorId]: {
          ...state.rubricJudgments[activeCuratorId],
          [resultId]: {
            ...state.rubricJudgments[activeCuratorId]?.[resultId],
            [traitName]: judgment,
          },
        },
      },
    }));
  },

  clearRubricJudgment: (resultId, traitName) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => {
      const curatorJudgments = { ...state.rubricJudgments[activeCuratorId] };
      if (curatorJudgments[resultId]) {
        curatorJudgments[resultId] = omitKey(curatorJudgments[resultId], traitName);
      }
      return {
        hasBeenExported: false,
        rubricJudgments: {
          ...state.rubricJudgments,
          [activeCuratorId]: curatorJudgments,
        },
      };
    });
  },

  toggleCurated: (resultId) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => ({
      hasBeenExported: false,
      curatedFlags: {
        ...state.curatedFlags,
        [activeCuratorId]: {
          ...state.curatedFlags[activeCuratorId],
          [resultId]: !state.curatedFlags[activeCuratorId]?.[resultId],
        },
      },
    }));
  },

  setScenarioTemplateJudgment: (scenarioId, nodeId, fieldName, judgment) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => ({
      hasBeenExported: false,
      scenarioTemplateJudgments: {
        ...state.scenarioTemplateJudgments,
        [activeCuratorId]: {
          ...state.scenarioTemplateJudgments[activeCuratorId],
          [scenarioId]: {
            ...state.scenarioTemplateJudgments[activeCuratorId]?.[scenarioId],
            [nodeId]: {
              ...state.scenarioTemplateJudgments[activeCuratorId]?.[scenarioId]?.[nodeId],
              [fieldName]: judgment,
            },
          },
        },
      },
    }));
  },

  clearScenarioTemplateJudgment: (scenarioId, nodeId, fieldName) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => {
      const cur = { ...state.scenarioTemplateJudgments[activeCuratorId] };
      if (cur[scenarioId]?.[nodeId]) {
        cur[scenarioId] = {
          ...cur[scenarioId],
          [nodeId]: omitKey(cur[scenarioId][nodeId], fieldName),
        };
      }
      return {
        hasBeenExported: false,
        scenarioTemplateJudgments: {
          ...state.scenarioTemplateJudgments,
          [activeCuratorId]: cur,
        },
      };
    });
  },

  setScenarioRubricJudgment: (scenarioId, nodeId, traitName, judgment) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => ({
      hasBeenExported: false,
      scenarioRubricJudgments: {
        ...state.scenarioRubricJudgments,
        [activeCuratorId]: {
          ...state.scenarioRubricJudgments[activeCuratorId],
          [scenarioId]: {
            ...state.scenarioRubricJudgments[activeCuratorId]?.[scenarioId],
            [nodeId]: {
              ...state.scenarioRubricJudgments[activeCuratorId]?.[scenarioId]?.[nodeId],
              [traitName]: judgment,
            },
          },
        },
      },
    }));
  },

  clearScenarioRubricJudgment: (scenarioId, nodeId, traitName) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => {
      const cur = { ...state.scenarioRubricJudgments[activeCuratorId] };
      if (cur[scenarioId]?.[nodeId]) {
        cur[scenarioId] = {
          ...cur[scenarioId],
          [nodeId]: omitKey(cur[scenarioId][nodeId], traitName),
        };
      }
      return {
        hasBeenExported: false,
        scenarioRubricJudgments: {
          ...state.scenarioRubricJudgments,
          [activeCuratorId]: cur,
        },
      };
    });
  },

  toggleScenarioCurated: (scenarioId) => {
    const { activeCuratorId } = get();
    if (!activeCuratorId) return;
    set((state) => ({
      hasBeenExported: false,
      scenarioCuratedFlags: {
        ...state.scenarioCuratedFlags,
        [activeCuratorId]: {
          ...state.scenarioCuratedFlags[activeCuratorId],
          [scenarioId]: !state.scenarioCuratedFlags[activeCuratorId]?.[scenarioId],
        },
      },
    }));
  },

  setSelectedResult: (resultId) => set({ selectedResultId: resultId, selectedScenarioId: null, selectedNodeId: null }),
  setSelectedScenario: (scenarioId) =>
    set({ selectedScenarioId: scenarioId, selectedResultId: null, selectedNodeId: null }),
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters }, currentPage: 1 })),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

  markExported: () => set({ hasBeenExported: true }),

  importCuration: (
    curators,
    templateJudgments,
    rubricJudgments,
    curatedFlags,
    scenarioTemplateJudgments,
    scenarioRubricJudgments,
    scenarioCuratedFlags
  ) => {
    set({
      curators,
      activeCuratorId: curators[0]?.id ?? null,
      templateJudgments,
      rubricJudgments,
      curatedFlags,
      scenarioTemplateJudgments,
      scenarioRubricJudgments,
      scenarioCuratedFlags,
      hasBeenExported: true, // imported data is already "saved"
    });
  },

  getResultStatus: (resultId) => {
    const { activeCuratorId, curatedFlags, templateJudgments, rubricJudgments } = get();
    if (!activeCuratorId) return 'pending';
    if (curatedFlags[activeCuratorId]?.[resultId]) return 'curated';
    const hasTemplateJ = Object.keys(templateJudgments[activeCuratorId]?.[resultId] ?? {}).length > 0;
    const hasRubricJ = Object.keys(rubricJudgments[activeCuratorId]?.[resultId] ?? {}).length > 0;
    if (hasTemplateJ || hasRubricJ) return 'partial';
    return 'pending';
  },

  reset: () =>
    set({
      checkpoint: null,
      results: [],
      scenarioDefinitions: [],
      scenarioResults: [],
      sourceMetadata: null,
      curators: [],
      activeCuratorId: null,
      templateJudgments: {},
      rubricJudgments: {},
      curatedFlags: {},
      scenarioTemplateJudgments: {},
      scenarioRubricJudgments: {},
      scenarioCuratedFlags: {},
      hasBeenExported: false,
      selectedResultId: null,
      selectedScenarioId: null,
      selectedNodeId: null,
      activeTab: 'template',
      filters: { ...DEFAULT_FILTERS },
      currentPage: 1,
      pageSize: 25,
    }),
}));
