import { create } from 'zustand';
import { DatasetMetadata, SchemaOrgPerson, SchemaOrgOrganization } from '../types';

// Define the dataset store state interface
interface DatasetState {
  // Dataset metadata
  metadata: DatasetMetadata;

  // Actions
  setMetadata: (metadata: DatasetMetadata) => void;
  updateField: <K extends keyof DatasetMetadata>(field: K, value: DatasetMetadata[K]) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  addCustomProperty: (key: string, value: string) => void;
  removeCustomProperty: (key: string) => void;
  updateCustomProperty: (key: string, value: string) => void;
  resetMetadata: () => void;

  // Helper actions for complex fields
  setCreator: (creator: SchemaOrgPerson | SchemaOrgOrganization) => void;
  setPublisher: (publisher: SchemaOrgOrganization) => void;
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

  // Actions
  setMetadata: (metadata: DatasetMetadata) => {
    set(() => ({
      metadata: {
        ...getDefaultMetadata(),
        ...metadata,
        // Ensure arrays and objects are properly initialized
        keywords: metadata.keywords || [],
        custom_properties: metadata.custom_properties || {},
      },
    }));
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
    if (!keyword.trim()) return;

    set((state) => {
      const currentKeywords = state.metadata.keywords || [];
      if (currentKeywords.includes(keyword.trim())) return state;

      return {
        metadata: {
          ...state.metadata,
          keywords: [...currentKeywords, keyword.trim()],
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
    if (!key.trim()) return;

    set((state) => ({
      metadata: {
        ...state.metadata,
        custom_properties: {
          ...state.metadata.custom_properties,
          [key.trim()]: value,
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
}));
