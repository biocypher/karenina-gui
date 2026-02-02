import { create } from 'zustand';
import { DatasetMetadata, SchemaOrgPerson, SchemaOrgOrganization } from '../types';

// Define the dataset store state interface
interface DatasetState {
  // Dataset metadata
  metadata: DatasetMetadata;

  // Database storage URL (for auto-save functionality)
  storageUrl: string | null;

  // Benchmark lifecycle tracking
  isBenchmarkInitialized: boolean;

  // Database connection state
  isConnectedToDatabase: boolean;
  currentBenchmarkName: string | null;
  lastSaved: string | null;
  isSaving: boolean;
  saveError: string | null;

  // Actions
  setMetadata: (metadata: DatasetMetadata) => void;
  setStorageUrl: (url: string | null) => void;
  updateField: <K extends keyof DatasetMetadata>(field: K, value: DatasetMetadata[K]) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  addCustomProperty: (key: string, value: string) => void;
  removeCustomProperty: (key: string) => void;
  updateCustomProperty: (key: string, value: string) => void;
  resetMetadata: () => void;
  markBenchmarkAsInitialized: () => void;
  resetBenchmarkState: () => void;

  // Helper actions for complex fields
  setCreator: (creator: SchemaOrgPerson | SchemaOrgOrganization) => void;
  setPublisher: (publisher: SchemaOrgOrganization) => void;

  // Database connection actions
  connectDatabase: (url: string, benchmarkName: string | null) => void;
  disconnectDatabase: () => void;
  setCurrentBenchmarkName: (name: string | null) => void;
  setLastSaved: (timestamp: string | null) => void;
  setIsSaving: (isSaving: boolean) => void;
  setSaveError: (error: string | null) => void;
}

// Default metadata structure
const getDefaultMetadata = (): DatasetMetadata => ({
  name: '',
  description: '',
  version: '1.0.0',
  license: '',
  keywords: [],
  dateCreated: new Date().toISOString(),
  custom_properties: {},
});

// Create the store
export const useDatasetStore = create<DatasetState>((set) => ({
  // Initial state
  metadata: getDefaultMetadata(),
  storageUrl: null,
  isBenchmarkInitialized: false,

  // Database connection initial state
  isConnectedToDatabase: false,
  currentBenchmarkName: null,
  lastSaved: null,
  isSaving: false,
  saveError: null,

  // Actions
  setMetadata: (metadata: DatasetMetadata) => {
    set(() => ({
      metadata: {
        ...getDefaultMetadata(),
        ...metadata,
        // Ensure arrays and objects are properly initialized
        keywords: metadata.keywords || [],
        custom_properties: metadata.custom_properties || {},
        // Preserve existing timestamps if provided, otherwise use defaults
        dateCreated: metadata.dateCreated || getDefaultMetadata().dateCreated,
        // Only set dateModified if it was explicitly provided
        dateModified: metadata.dateModified,
      },
    }));
  },

  setStorageUrl: (url: string | null) => {
    set({ storageUrl: url });
  },

  updateField: <K extends keyof DatasetMetadata>(field: K, value: DatasetMetadata[K]) => {
    set((state) => ({
      metadata: {
        ...state.metadata,
        [field]: value,
        dateModified: new Date().toISOString(),
      },
    }));
  },

  addKeyword: (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    set((state) => {
      const currentKeywords = state.metadata.keywords || [];
      if (currentKeywords.includes(trimmed)) return state;

      return {
        metadata: {
          ...state.metadata,
          keywords: [...currentKeywords, trimmed],
          dateModified: new Date().toISOString(),
        },
      };
    });
  },

  removeKeyword: (keyword: string) => {
    set((state) => ({
      metadata: {
        ...state.metadata,
        keywords: (state.metadata.keywords || []).filter((k) => k !== keyword),
        dateModified: new Date().toISOString(),
      },
    }));
  },

  addCustomProperty: (key: string, value: string) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;

    set((state) => ({
      metadata: {
        ...state.metadata,
        custom_properties: {
          ...state.metadata.custom_properties,
          [trimmedKey]: value,
        },
        dateModified: new Date().toISOString(),
      },
    }));
  },

  removeCustomProperty: (key: string) => {
    set((state) => {
      const newCustomProperties = { ...state.metadata.custom_properties };
      delete newCustomProperties[key];

      return {
        metadata: {
          ...state.metadata,
          custom_properties: newCustomProperties,
          dateModified: new Date().toISOString(),
        },
      };
    });
  },

  updateCustomProperty: (key: string, value: string) => {
    set((state) => ({
      metadata: {
        ...state.metadata,
        custom_properties: {
          ...state.metadata.custom_properties,
          [key]: value,
        },
        dateModified: new Date().toISOString(),
      },
    }));
  },

  resetMetadata: () => {
    set(() => ({
      metadata: getDefaultMetadata(),
    }));
  },

  markBenchmarkAsInitialized: () => {
    set(() => ({
      isBenchmarkInitialized: true,
    }));
  },

  resetBenchmarkState: () => {
    set(() => ({
      isBenchmarkInitialized: false,
    }));
  },

  setCreator: (creator: SchemaOrgPerson | SchemaOrgOrganization) => {
    set((state) => ({
      metadata: {
        ...state.metadata,
        creator,
        dateModified: new Date().toISOString(),
      },
    }));
  },

  setPublisher: (publisher: SchemaOrgOrganization) => {
    set((state) => ({
      metadata: {
        ...state.metadata,
        publisher,
        dateModified: new Date().toISOString(),
      },
    }));
  },

  // Database connection actions
  connectDatabase: (url: string, benchmarkName: string | null) => {
    set(() => ({
      isConnectedToDatabase: true,
      storageUrl: url,
      currentBenchmarkName: benchmarkName,
      saveError: null,
    }));
  },

  disconnectDatabase: () => {
    set(() => ({
      isConnectedToDatabase: false,
      storageUrl: null,
      currentBenchmarkName: null,
      lastSaved: null,
      saveError: null,
    }));
  },

  setCurrentBenchmarkName: (name: string | null) => {
    set(() => ({
      currentBenchmarkName: name,
    }));
  },

  setLastSaved: (timestamp: string | null) => {
    set(() => ({
      lastSaved: timestamp,
    }));
  },

  setIsSaving: (isSaving: boolean) => {
    set(() => ({
      isSaving,
    }));
  },

  setSaveError: (error: string | null) => {
    set(() => ({
      saveError: error,
    }));
  },
}));
