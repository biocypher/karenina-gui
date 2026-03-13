/**
 * useTemplateBuilderStore - Zustand store for the template builder GUI.
 *
 * Manages the visual template spec (fields, strategy, class name),
 * communicates with the server for code generation, validation, and
 * test execution, and tracks UI state such as field selection and
 * loading/error indicators.
 */

import { create } from 'zustand';
import { API_ENDPOINTS, HEADERS } from '../constants/api';
import { DEFAULT_FIELD, DEFAULT_PRIMITIVES } from '../types';
import type {
  TemplateSpec,
  TemplateField,
  VerifyStrategy,
  TemplateMode,
  PrimitiveInfo,
  TemplateParseResult,
  TemplateValidateResult,
  TemplateTestResult,
} from '../types';

// Re-export DEFAULT_PRIMITIVES so components can import from the store barrel
export { DEFAULT_PRIMITIVES };

interface TemplateBuilderState {
  // State
  spec: TemplateSpec;
  selectedFieldIndex: number | null;
  mode: TemplateMode;
  availablePrimitives: PrimitiveInfo[];
  validationResult: TemplateValidateResult | null;
  testResult: TemplateTestResult | null;
  isDirty: boolean;
  isLoading: boolean;
  lastError: string | null;
  generatedCode: string | null;

  // Field CRUD
  addField: () => void;
  removeField: (index: number) => void;
  updateField: (index: number, updates: Partial<TemplateField>) => void;
  moveField: (fromIndex: number, toIndex: number) => void;
  selectField: (index: number | null) => void;

  // Strategy
  setStrategy: (strategy: VerifyStrategy | null) => void;

  // Spec management
  setSpec: (spec: TemplateSpec) => void;
  setClassName: (name: string) => void;
  reset: () => void;

  // API actions
  parseCode: (code: string) => Promise<TemplateParseResult>;
  generateCode: () => Promise<string | null>;
  validateTemplate: () => Promise<TemplateValidateResult | null>;
  testTemplate: (sampleResponse: string, questionText: string) => Promise<TemplateTestResult | null>;
  fetchPrimitives: () => Promise<void>;

  // Getters
  getSelectedField: () => TemplateField | null;
  getApplicablePrimitives: (fieldType: string) => PrimitiveInfo[];
}

const EMPTY_SPEC: TemplateSpec = {
  fields: [],
  verify_strategy: null,
  class_name: 'Answer',
};

export const useTemplateBuilderStore = create<TemplateBuilderState>((set, get) => ({
  // Initial state
  spec: { ...EMPTY_SPEC },
  selectedFieldIndex: null,
  mode: 'verified',
  availablePrimitives: [],
  validationResult: null,
  testResult: null,
  isDirty: false,
  isLoading: false,
  lastError: null,
  generatedCode: null,

  // Field CRUD
  addField: () => {
    const { spec } = get();
    const existingNames = new Set(spec.fields.map((f) => f.name));
    let name = 'new_field';
    let counter = 1;
    while (existingNames.has(name)) {
      name = `new_field_${counter}`;
      counter++;
    }
    const newField: TemplateField = {
      ...DEFAULT_FIELD,
      name,
    };
    set({
      spec: { ...spec, fields: [...spec.fields, newField] },
      selectedFieldIndex: spec.fields.length,
      isDirty: true,
    });
  },

  removeField: (index: number) => {
    const { spec, selectedFieldIndex } = get();
    const newFields = spec.fields.filter((_, i) => i !== index);
    let newSelected = selectedFieldIndex;
    if (selectedFieldIndex !== null) {
      if (selectedFieldIndex === index) newSelected = null;
      else if (selectedFieldIndex > index) newSelected = selectedFieldIndex - 1;
    }
    set({
      spec: { ...spec, fields: newFields },
      selectedFieldIndex: newSelected,
      isDirty: true,
    });
  },

  updateField: (index: number, updates: Partial<TemplateField>) => {
    const { spec } = get();
    const newFields = [...spec.fields];
    newFields[index] = { ...newFields[index], ...updates };
    set({ spec: { ...spec, fields: newFields }, isDirty: true });
  },

  moveField: (fromIndex: number, toIndex: number) => {
    const { spec } = get();
    const newFields = [...spec.fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, moved);
    set({ spec: { ...spec, fields: newFields }, isDirty: true });
  },

  selectField: (index: number | null) => set({ selectedFieldIndex: index }),

  // Strategy
  setStrategy: (strategy: VerifyStrategy | null) => {
    const { spec } = get();
    set({ spec: { ...spec, verify_strategy: strategy }, isDirty: true });
  },

  // Spec management
  setSpec: (spec: TemplateSpec) => set({ spec, isDirty: false, generatedCode: null }),

  setClassName: (name: string) => {
    const { spec } = get();
    set({ spec: { ...spec, class_name: name }, isDirty: true });
  },

  reset: () =>
    set({
      spec: { ...EMPTY_SPEC },
      selectedFieldIndex: null,
      validationResult: null,
      testResult: null,
      isDirty: false,
      generatedCode: null,
      lastError: null,
    }),

  // API actions
  parseCode: async (code: string): Promise<TemplateParseResult> => {
    set({ isLoading: true, lastError: null });
    try {
      const response = await fetch(API_ENDPOINTS.TEMPLATE_BUILDER_PARSE, {
        method: 'POST',
        headers: HEADERS.CONTENT_TYPE_JSON,
        body: JSON.stringify({ code }),
      });
      const data: TemplateParseResult = await response.json();
      if (data.success && data.spec) {
        set({ spec: data.spec as TemplateSpec, mode: data.mode, isDirty: false });
      }
      set({ mode: data.mode, isLoading: false });
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      set({ lastError: msg, isLoading: false });
      return { success: false, mode: 'unknown', spec: null, error: msg };
    }
  },

  generateCode: async (): Promise<string | null> => {
    set({ isLoading: true, lastError: null });
    try {
      const { spec } = get();
      const response = await fetch(API_ENDPOINTS.TEMPLATE_BUILDER_GENERATE, {
        method: 'POST',
        headers: HEADERS.CONTENT_TYPE_JSON,
        body: JSON.stringify({ spec }),
      });
      const data = await response.json();
      if (data.success) {
        set({ generatedCode: data.code, isLoading: false });
        return data.code;
      }
      set({ lastError: data.error, isLoading: false });
      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      set({ lastError: msg, isLoading: false });
      return null;
    }
  },

  validateTemplate: async (): Promise<TemplateValidateResult | null> => {
    set({ isLoading: true, lastError: null });
    try {
      const code = get().generatedCode ?? (await get().generateCode());
      if (!code) {
        set({ isLoading: false });
        return null;
      }

      const response = await fetch(API_ENDPOINTS.TEMPLATE_BUILDER_VALIDATE, {
        method: 'POST',
        headers: HEADERS.CONTENT_TYPE_JSON,
        body: JSON.stringify({ code }),
      });
      const data: TemplateValidateResult = await response.json();
      set({ validationResult: data, isLoading: false });
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      set({ lastError: msg, isLoading: false });
      return null;
    }
  },

  testTemplate: async (sampleResponse: string, questionText: string): Promise<TemplateTestResult | null> => {
    set({ isLoading: true, lastError: null });
    try {
      const code = get().generatedCode ?? (await get().generateCode());
      if (!code) {
        set({ isLoading: false });
        return null;
      }

      const response = await fetch(API_ENDPOINTS.TEMPLATE_BUILDER_TEST, {
        method: 'POST',
        headers: HEADERS.CONTENT_TYPE_JSON,
        body: JSON.stringify({
          code,
          sample_response: sampleResponse,
          question_text: questionText,
        }),
      });
      const data: TemplateTestResult = await response.json();
      set({ testResult: data, isLoading: false });
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      set({ lastError: msg, isLoading: false });
      return null;
    }
  },

  fetchPrimitives: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.TEMPLATE_BUILDER_PRIMITIVES);
      const data = await response.json();
      if (data.success) {
        set({ availablePrimitives: data.primitives });
      }
    } catch (error) {
      console.warn('Failed to fetch primitives:', error);
    }
  },

  // Getters
  getSelectedField: () => {
    const { spec, selectedFieldIndex } = get();
    if (selectedFieldIndex === null || selectedFieldIndex >= spec.fields.length) return null;
    return spec.fields[selectedFieldIndex];
  },

  getApplicablePrimitives: (fieldType: string) => {
    const { availablePrimitives } = get();
    return availablePrimitives.filter((p) => p.applies_to.includes(fieldType));
  },
}));
