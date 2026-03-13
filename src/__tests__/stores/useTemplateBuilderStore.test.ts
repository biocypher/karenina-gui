import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTemplateBuilderStore } from '../../stores/useTemplateBuilderStore';

// Reset store state between tests
beforeEach(() => {
  useTemplateBuilderStore.getState().reset();
  vi.restoreAllMocks();
});

describe('useTemplateBuilderStore', () => {
  describe('initial state', () => {
    it('starts with empty spec', () => {
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.fields).toHaveLength(0);
      expect(state.spec.verify_strategy).toBeNull();
      expect(state.spec.class_name).toBe('Answer');
      expect(state.selectedFieldIndex).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.lastError).toBeNull();
      expect(state.generatedCode).toBeNull();
      expect(state.validationResult).toBeNull();
      expect(state.testResult).toBeNull();
      expect(state.mode).toBe('verified');
      expect(state.availablePrimitives).toHaveLength(0);
    });
  });

  describe('field CRUD', () => {
    it('adds a field with default values', () => {
      useTemplateBuilderStore.getState().addField();
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.fields).toHaveLength(1);
      expect(state.spec.fields[0].name).toBe('new_field');
      expect(state.spec.fields[0].type).toBe('str');
      expect(state.spec.fields[0].verify_with.type).toBe('ExactMatch');
      expect(state.spec.fields[0].weight).toBe(1.0);
      expect(state.spec.fields[0].is_trace).toBe(false);
      expect(state.selectedFieldIndex).toBe(0);
      expect(state.isDirty).toBe(true);
    });

    it('generates unique names for subsequent fields', () => {
      const { addField } = useTemplateBuilderStore.getState();
      addField();
      addField();
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.fields).toHaveLength(2);
      expect(state.spec.fields[0].name).toBe('new_field');
      expect(state.spec.fields[1].name).toBe('new_field_1');
    });

    it('generates incrementing names when many fields exist', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      store.addField();
      store.addField();
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.fields).toHaveLength(3);
      expect(state.spec.fields[2].name).toBe('new_field_2');
    });

    it('removes a field and adjusts selection downward', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      store.addField();
      store.selectField(1);
      store.removeField(0);
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.fields).toHaveLength(1);
      // Selection was at index 1, removed index 0, so selection shifts to 0
      expect(state.selectedFieldIndex).toBe(0);
    });

    it('clears selection when selected field is removed', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      store.selectField(0);
      store.removeField(0);
      expect(useTemplateBuilderStore.getState().selectedFieldIndex).toBeNull();
    });

    it('keeps selection unchanged when removing field after selection', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      store.addField();
      store.addField();
      store.selectField(0);
      store.removeField(2);
      expect(useTemplateBuilderStore.getState().selectedFieldIndex).toBe(0);
    });

    it('marks dirty on remove', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      // Reset dirty to isolate the remove action
      useTemplateBuilderStore.setState({ isDirty: false });
      store.removeField(0);
      expect(useTemplateBuilderStore.getState().isDirty).toBe(true);
    });

    it('updates field properties', () => {
      useTemplateBuilderStore.getState().addField();
      useTemplateBuilderStore.getState().updateField(0, { name: 'target', type: 'bool' });
      const field = useTemplateBuilderStore.getState().spec.fields[0];
      expect(field.name).toBe('target');
      expect(field.type).toBe('bool');
    });

    it('partially updates a field without overwriting other properties', () => {
      useTemplateBuilderStore.getState().addField();
      useTemplateBuilderStore.getState().updateField(0, { name: 'target' });
      useTemplateBuilderStore.getState().updateField(0, { description: 'A description' });
      const field = useTemplateBuilderStore.getState().spec.fields[0];
      expect(field.name).toBe('target');
      expect(field.description).toBe('A description');
    });

    it('moves fields by reordering', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      store.updateField(0, { name: 'first' });
      store.addField();
      store.updateField(1, { name: 'second' });
      store.moveField(0, 1);
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.fields[0].name).toBe('second');
      expect(state.spec.fields[1].name).toBe('first');
    });

    it('moveField marks dirty', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      store.addField();
      useTemplateBuilderStore.setState({ isDirty: false });
      store.moveField(0, 1);
      expect(useTemplateBuilderStore.getState().isDirty).toBe(true);
    });
  });

  describe('selectField', () => {
    it('sets selectedFieldIndex', () => {
      useTemplateBuilderStore.getState().addField();
      useTemplateBuilderStore.getState().selectField(0);
      expect(useTemplateBuilderStore.getState().selectedFieldIndex).toBe(0);
    });

    it('can set selection to null', () => {
      useTemplateBuilderStore.getState().addField();
      useTemplateBuilderStore.getState().selectField(0);
      useTemplateBuilderStore.getState().selectField(null);
      expect(useTemplateBuilderStore.getState().selectedFieldIndex).toBeNull();
    });
  });

  describe('strategy', () => {
    it('sets verify strategy and marks dirty', () => {
      useTemplateBuilderStore.getState().setStrategy({
        type: 'all_of',
        conditions: [],
      });
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.verify_strategy).not.toBeNull();
      expect(state.spec.verify_strategy?.type).toBe('all_of');
      expect(state.isDirty).toBe(true);
    });

    it('can clear verify strategy by setting null', () => {
      useTemplateBuilderStore.getState().setStrategy({
        type: 'any_of',
        conditions: [],
      });
      useTemplateBuilderStore.getState().setStrategy(null);
      expect(useTemplateBuilderStore.getState().spec.verify_strategy).toBeNull();
    });
  });

  describe('spec management', () => {
    it('setSpec replaces spec, clears dirty and generatedCode', () => {
      useTemplateBuilderStore.getState().addField(); // makes dirty
      useTemplateBuilderStore.setState({ generatedCode: 'old code' });
      useTemplateBuilderStore.getState().setSpec({
        fields: [],
        verify_strategy: null,
        class_name: 'CustomAnswer',
      });
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.class_name).toBe('CustomAnswer');
      expect(state.spec.fields).toHaveLength(0);
      expect(state.isDirty).toBe(false);
      expect(state.generatedCode).toBeNull();
    });

    it('setClassName updates class name and marks dirty', () => {
      useTemplateBuilderStore.getState().setClassName('MyTemplate');
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.class_name).toBe('MyTemplate');
      expect(state.isDirty).toBe(true);
    });

    it('reset restores initial state', () => {
      const store = useTemplateBuilderStore.getState();
      store.addField();
      store.selectField(0);
      store.setStrategy({ type: 'all_of', conditions: [] });
      useTemplateBuilderStore.setState({
        generatedCode: 'some code',
        lastError: 'some error',
        validationResult: { success: true, valid: true, errors: [], ground_truth_check: true, verify_check: true },
        testResult: {
          success: true,
          parsed_fields: {},
          verify_result: true,
          verify_granular: 1.0,
          field_results: {},
          error: null,
        },
      });
      store.reset();
      const state = useTemplateBuilderStore.getState();
      expect(state.spec.fields).toHaveLength(0);
      expect(state.spec.verify_strategy).toBeNull();
      expect(state.spec.class_name).toBe('Answer');
      expect(state.selectedFieldIndex).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.generatedCode).toBeNull();
      expect(state.lastError).toBeNull();
      expect(state.validationResult).toBeNull();
      expect(state.testResult).toBeNull();
    });
  });

  describe('getters', () => {
    it('getSelectedField returns null when no selection', () => {
      expect(useTemplateBuilderStore.getState().getSelectedField()).toBeNull();
    });

    it('getSelectedField returns the selected field', () => {
      useTemplateBuilderStore.getState().addField();
      useTemplateBuilderStore.getState().updateField(0, { name: 'target' });
      useTemplateBuilderStore.getState().selectField(0);
      const field = useTemplateBuilderStore.getState().getSelectedField();
      expect(field?.name).toBe('target');
    });

    it('getSelectedField returns null when index is out of bounds', () => {
      useTemplateBuilderStore.getState().addField();
      useTemplateBuilderStore.setState({ selectedFieldIndex: 5 });
      expect(useTemplateBuilderStore.getState().getSelectedField()).toBeNull();
    });

    it('getApplicablePrimitives filters by type', () => {
      useTemplateBuilderStore.setState({
        availablePrimitives: [
          { name: 'BooleanMatch', description: '', parameters: {}, applies_to: ['bool'], is_trace: false },
          { name: 'ExactMatch', description: '', parameters: {}, applies_to: ['str', 'int'], is_trace: false },
          { name: 'NumericExact', description: '', parameters: {}, applies_to: ['int'], is_trace: false },
        ],
      });
      const boolPrims = useTemplateBuilderStore.getState().getApplicablePrimitives('bool');
      expect(boolPrims).toHaveLength(1);
      expect(boolPrims[0].name).toBe('BooleanMatch');

      const intPrims = useTemplateBuilderStore.getState().getApplicablePrimitives('int');
      expect(intPrims).toHaveLength(2);
      expect(intPrims.map((p) => p.name)).toEqual(['ExactMatch', 'NumericExact']);
    });

    it('getApplicablePrimitives returns empty array when no match', () => {
      useTemplateBuilderStore.setState({
        availablePrimitives: [
          { name: 'BooleanMatch', description: '', parameters: {}, applies_to: ['bool'], is_trace: false },
        ],
      });
      const prims = useTemplateBuilderStore.getState().getApplicablePrimitives('float');
      expect(prims).toHaveLength(0);
    });
  });

  describe('API actions', () => {
    it('parseCode calls endpoint and sets spec on success', async () => {
      const mockSpec = {
        fields: [
          {
            name: 'target',
            type: 'str',
            description: 'test',
            ground_truth: 'BCL2',
            verify_with: { type: 'ExactMatch' },
            weight: 1.0,
            is_trace: false,
          },
        ],
        verify_strategy: null,
        class_name: 'Answer',
      };
      vi.mocked(global.fetch).mockResolvedValue({
        json: () => Promise.resolve({ success: true, mode: 'verified', spec: mockSpec, error: null }),
      } as Response);

      const result = await useTemplateBuilderStore.getState().parseCode('some code');
      expect(result.success).toBe(true);
      expect(result.mode).toBe('verified');
      expect(useTemplateBuilderStore.getState().spec.fields).toHaveLength(1);
      expect(useTemplateBuilderStore.getState().spec.fields[0].name).toBe('target');
      expect(useTemplateBuilderStore.getState().mode).toBe('verified');
      expect(useTemplateBuilderStore.getState().isDirty).toBe(false);
      expect(useTemplateBuilderStore.getState().isLoading).toBe(false);
    });

    it('parseCode returns error result on failure response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        json: () => Promise.resolve({ success: false, mode: 'unknown', spec: null, error: 'Parse failed' }),
      } as Response);

      const result = await useTemplateBuilderStore.getState().parseCode('bad code');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Parse failed');
      // Spec should remain empty since success was false
      expect(useTemplateBuilderStore.getState().spec.fields).toHaveLength(0);
    });

    it('parseCode handles network error gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network failure'));

      const result = await useTemplateBuilderStore.getState().parseCode('some code');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
      expect(useTemplateBuilderStore.getState().lastError).toBe('Network failure');
      expect(useTemplateBuilderStore.getState().isLoading).toBe(false);
    });

    it('generateCode caches result in generatedCode', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        json: () => Promise.resolve({ success: true, code: 'class Answer(BaseAnswer):\n  pass' }),
      } as Response);

      const code = await useTemplateBuilderStore.getState().generateCode();
      expect(code).toBe('class Answer(BaseAnswer):\n  pass');
      expect(useTemplateBuilderStore.getState().generatedCode).toBe('class Answer(BaseAnswer):\n  pass');
      expect(useTemplateBuilderStore.getState().isLoading).toBe(false);
    });

    it('generateCode returns null on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: 'Generation failed' }),
      } as Response);

      const code = await useTemplateBuilderStore.getState().generateCode();
      expect(code).toBeNull();
      expect(useTemplateBuilderStore.getState().lastError).toBe('Generation failed');
    });

    it('generateCode returns null on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Timeout'));

      const code = await useTemplateBuilderStore.getState().generateCode();
      expect(code).toBeNull();
      expect(useTemplateBuilderStore.getState().lastError).toBe('Timeout');
    });

    it('validateTemplate uses cached generatedCode first', async () => {
      // Pre-set cached generated code
      useTemplateBuilderStore.setState({ generatedCode: 'cached code' });

      vi.mocked(global.fetch).mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            valid: true,
            errors: [],
            ground_truth_check: true,
            verify_check: true,
          }),
      } as Response);

      const result = await useTemplateBuilderStore.getState().validateTemplate();
      expect(result).not.toBeNull();
      expect(result?.valid).toBe(true);
      expect(useTemplateBuilderStore.getState().validationResult?.valid).toBe(true);

      // Should have called fetch only once (validate), not twice (generate + validate)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain('/validate');
    });

    it('validateTemplate generates code when none cached', async () => {
      // First call: generateCode, second call: validateTemplate
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, code: 'generated code' }),
        } as Response)
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              valid: true,
              errors: [],
              ground_truth_check: null,
              verify_check: null,
            }),
        } as Response);

      const result = await useTemplateBuilderStore.getState().validateTemplate();
      expect(result).not.toBeNull();
      expect(result?.valid).toBe(true);
      // Should have called fetch twice: generate then validate
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('validateTemplate returns null when code generation fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: 'Cannot generate' }),
      } as Response);

      const result = await useTemplateBuilderStore.getState().validateTemplate();
      expect(result).toBeNull();
    });

    it('testTemplate calls endpoint with code, response, and question', async () => {
      useTemplateBuilderStore.setState({ generatedCode: 'cached code' });

      vi.mocked(global.fetch).mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            parsed_fields: { target: 'BCL2' },
            verify_result: true,
            verify_granular: 1.0,
            field_results: { target: true },
            error: null,
          }),
      } as Response);

      const result = await useTemplateBuilderStore.getState().testTemplate('BCL2', 'What is the target?');
      expect(result).not.toBeNull();
      expect(result?.verify_result).toBe(true);
      expect(result?.parsed_fields?.target).toBe('BCL2');
      expect(useTemplateBuilderStore.getState().testResult).toEqual(result);
    });

    it('fetchPrimitives stores result on success', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            primitives: [
              {
                name: 'BooleanMatch',
                description: 'Match booleans',
                parameters: {},
                applies_to: ['bool'],
                is_trace: false,
              },
              {
                name: 'ExactMatch',
                description: 'Exact string match',
                parameters: {},
                applies_to: ['str'],
                is_trace: false,
              },
            ],
          }),
      } as Response);

      await useTemplateBuilderStore.getState().fetchPrimitives();
      expect(useTemplateBuilderStore.getState().availablePrimitives).toHaveLength(2);
      expect(useTemplateBuilderStore.getState().availablePrimitives[0].name).toBe('BooleanMatch');
    });

    it('fetchPrimitives warns on error without throwing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(global.fetch).mockRejectedValue(new Error('Server down'));

      await useTemplateBuilderStore.getState().fetchPrimitives();
      expect(warnSpy).toHaveBeenCalledWith('Failed to fetch primitives:', expect.any(Error));
      // Primitives should remain empty
      expect(useTemplateBuilderStore.getState().availablePrimitives).toHaveLength(0);
    });

    it('fetchPrimitives does not update store when response is not successful', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        json: () => Promise.resolve({ success: false }),
      } as Response);

      await useTemplateBuilderStore.getState().fetchPrimitives();
      expect(useTemplateBuilderStore.getState().availablePrimitives).toHaveLength(0);
    });
  });
});
