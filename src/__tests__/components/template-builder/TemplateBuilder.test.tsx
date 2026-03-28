import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateBuilder } from '../../../components/template-builder';
import { useTemplateBuilderStore } from '../../../stores/useTemplateBuilderStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal successful parse response (no fields, verified mode). */
function makeParseResponse(spec?: Record<string, unknown>) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        mode: 'verified',
        spec: spec ?? null,
        error: null,
      }),
  } as unknown as Response;
}

/** Build a minimal successful primitives response. */
function makePrimitivesResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        primitives: [
          {
            name: 'ExactMatch',
            description: 'Exact string match',
            parameters: {},
            applies_to: ['str', 'literal'],
            is_trace: false,
          },
          { name: 'BooleanMatch', description: 'Boolean match', parameters: {}, applies_to: ['bool'], is_trace: false },
          {
            name: 'NumericExact',
            description: 'Numeric exact match',
            parameters: {},
            applies_to: ['int'],
            is_trace: false,
          },
        ],
      }),
  } as unknown as Response;
}

/** Build a minimal validation response. */
function makeValidateResponse(valid = true) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        valid,
        errors: [],
        ground_truth_check: valid,
        verify_check: valid,
      }),
  } as unknown as Response;
}

/** Build a minimal generate-code response. */
function makeGenerateResponse(code = 'class Answer(BaseAnswer):\n    pass') {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        code,
      }),
  } as unknown as Response;
}

/**
 * Route fetch calls to the correct mock response based on URL.
 *
 * The TemplateBuilder component fires two requests on mount:
 *   1. POST /api/v2/templates/builder/parse   (parseCode)
 *   2. GET  /api/v2/templates/builder/primitives (fetchPrimitives)
 */
function setupDefaultFetchMock() {
  vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/parse')) return Promise.resolve(makeParseResponse());
    if (url.includes('/primitives')) return Promise.resolve(makePrimitivesResponse());
    if (url.includes('/validate')) return Promise.resolve(makeValidateResponse());
    if (url.includes('/generate')) return Promise.resolve(makeGenerateResponse());

    // Fallback: return a generic success
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as unknown as Response);
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  useTemplateBuilderStore.getState().reset();
  vi.restoreAllMocks();
  setupDefaultFetchMock();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TemplateBuilder integration', () => {
  // -----------------------------------------------------------------------
  // 1. Renders empty builder (from scratch)
  // -----------------------------------------------------------------------
  describe('renders empty builder', () => {
    it('shows "Fields (0)" heading and "Add Field" button', async () => {
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Add Field/ })).toBeInTheDocument();
    });

    it('shows empty state message when there are no fields', async () => {
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/No fields yet/)).toBeInTheDocument();
      });
    });

    it('shows placeholder for field editor', async () => {
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Select a field to edit its properties/)).toBeInTheDocument();
      });
    });

    it('does not render a class name input (hidden from visual builder)', async () => {
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      expect(screen.queryByPlaceholderText('MyAnswer')).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 2. Add field, verify it appears in field list
  // -----------------------------------------------------------------------
  describe('adding a field', () => {
    it('adds a field and shows it in the list', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Field/ }));

      expect(screen.getByText('Fields (1)')).toBeInTheDocument();
      expect(screen.getByText('new_field')).toBeInTheDocument();
    });

    it('shows the field type badge', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Field/ }));

      // The default type is 'str'
      expect(screen.getByText('str')).toBeInTheDocument();
    });

    it('adds multiple fields with unique names', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Field/ }));
      await user.click(screen.getByRole('button', { name: /Add Field/ }));

      expect(screen.getByText('Fields (2)')).toBeInTheDocument();
      expect(screen.getByText('new_field')).toBeInTheDocument();
      expect(screen.getByText('new_field_1')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 3. Select field, verify detail editor shows field properties
  // -----------------------------------------------------------------------
  describe('selecting a field', () => {
    it('shows field properties editor when a field is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      // Add a field (auto-selects it)
      await user.click(screen.getByRole('button', { name: /Add Field/ }));

      // The VerifiedFieldEditor should now show "Field Properties"
      expect(screen.getByText('Field Properties')).toBeInTheDocument();
      // Should display the field name input with value "new_field"
      expect(screen.getByPlaceholderText('field_name')).toHaveValue('new_field');
    });

    it('shows the type selector for the selected field', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Field/ }));

      // The type selector should be visible with the current type 'str' -> 'String'
      const typeSelect = screen.getByDisplayValue('String');
      expect(typeSelect).toBeInTheDocument();
    });

    it('shows description, ground truth, and weight controls', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Field/ }));

      expect(screen.getByPlaceholderText('Description for the judge LLM...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Expected correct value')).toBeInTheDocument();
      // Weight label shows the current weight value
      expect(screen.getByText(/Weight/)).toBeInTheDocument();
    });

    it('switches editor content when clicking a different field', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      // Add two fields
      await user.click(screen.getByRole('button', { name: /Add Field/ }));
      await user.click(screen.getByRole('button', { name: /Add Field/ }));

      // Second field is auto-selected; verify it
      expect(screen.getByPlaceholderText('field_name')).toHaveValue('new_field_1');

      // Click the first field in the list
      await user.click(screen.getByText('new_field'));

      // Editor should now show the first field's name
      expect(screen.getByPlaceholderText('field_name')).toHaveValue('new_field');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Remove field, verify list updates
  // -----------------------------------------------------------------------
  describe('removing a field', () => {
    it('removes a field from the list', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      // Add two fields
      await user.click(screen.getByRole('button', { name: /Add Field/ }));
      await user.click(screen.getByRole('button', { name: /Add Field/ }));
      expect(screen.getByText('Fields (2)')).toBeInTheDocument();

      // Remove buttons have title "Remove field"
      const removeButtons = screen.getAllByTitle('Remove field');
      expect(removeButtons).toHaveLength(2);

      // Remove the first field
      await user.click(removeButtons[0]);

      expect(screen.getByText('Fields (1)')).toBeInTheDocument();
      // Only "new_field_1" should remain
      expect(screen.queryByText('new_field')).not.toBeInTheDocument();
      expect(screen.getByText('new_field_1')).toBeInTheDocument();
    });

    it('clears selection and shows placeholder when selected field is removed', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      // Add a single field (auto-selected)
      await user.click(screen.getByRole('button', { name: /Add Field/ }));
      expect(screen.getByText('Field Properties')).toBeInTheDocument();

      // Remove the only field
      const removeButton = screen.getByTitle('Remove field');
      await user.click(removeButton);

      // Should show empty state and no field editor
      expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      expect(screen.getByText(/Select a field to edit its properties/)).toBeInTheDocument();
    });

    it('returns to the empty state message after removing all fields', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (0)')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Add Field/ }));
      expect(screen.getByText('Fields (1)')).toBeInTheDocument();

      await user.click(screen.getByTitle('Remove field'));

      expect(screen.getByText(/No fields yet/)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 5. Validation modal opens when Validate button clicked
  // -----------------------------------------------------------------------
  describe('validation modal', () => {
    it('opens validation modal when Validate button is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="class Answer: pass" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Validate')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Validate'));

      // The ValidationModal renders a heading "Template Validation"
      expect(screen.getByText('Template Validation')).toBeInTheDocument();
    });

    it('shows validation tabs inside the modal', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="class Answer: pass" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Validate')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Validate'));

      expect(screen.getByText('Quick Check')).toBeInTheDocument();
      expect(screen.getByText('Test with Response')).toBeInTheDocument();
      expect(screen.getByText('Judge Preview')).toBeInTheDocument();
    });

    it('closes validation modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="class Answer: pass" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Validate')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Validate'));
      expect(screen.getByText('Template Validation')).toBeInTheDocument();

      // The modal has a close button with title "Close"
      const modalCloseButton = within(
        screen.getByText('Template Validation').closest('div')!.parentElement!
      ).getByTitle('Close');
      await user.click(modalCloseButton);

      expect(screen.queryByText('Template Validation')).not.toBeInTheDocument();
    });

    it('triggers validate API call when modal opens', async () => {
      const user = userEvent.setup();
      render(<TemplateBuilder code="class Answer: pass" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Validate')).toBeInTheDocument();
      });

      // Clear mock call counts from initial mount requests
      vi.mocked(global.fetch).mockClear();
      setupDefaultFetchMock();

      await user.click(screen.getByText('Validate'));

      // The ValidationModal calls validateTemplate on open, which first
      // calls generateCode (if no generatedCode), then validate
      await waitFor(() => {
        const calls = vi.mocked(global.fetch).mock.calls;
        const validateCalls = calls.filter((c) => typeof c[0] === 'string' && c[0].includes('/validate'));
        expect(validateCalls.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // -----------------------------------------------------------------------
  // Additional integration scenarios
  // -----------------------------------------------------------------------
  describe('optional props', () => {
    it('renders close button when onClose is provided', () => {
      render(<TemplateBuilder code="" onChange={vi.fn()} onClose={vi.fn()} />);

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<TemplateBuilder code="" onChange={vi.fn()} onClose={onClose} />);

      await user.click(screen.getByLabelText('Close'));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('parseCode on mount', () => {
    it('calls parseCode with the provided code prop', async () => {
      const sampleCode = 'class CustomAnswer(BaseAnswer):\n    name: str';
      render(<TemplateBuilder code={sampleCode} onChange={vi.fn()} />);

      await waitFor(() => {
        const calls = vi.mocked(global.fetch).mock.calls;
        const parseCalls = calls.filter((c) => typeof c[0] === 'string' && c[0].includes('/parse'));
        expect(parseCalls).toHaveLength(1);
        // Verify the body contains our code
        const body = JSON.parse(parseCalls[0][1]?.body as string);
        expect(body.code).toBe(sampleCode);
      });
    });

    it('populates fields from a successful parse response', async () => {
      const specWithFields = {
        fields: [
          {
            name: 'gene_name',
            type: 'str',
            description: 'The gene symbol',
            extraction_hint: null,
            ground_truth: 'BRCA1',
            literal_values: null,
            verify_with: { type: 'ExactMatch' },
            weight: 1.0,
            is_trace: false,
          },
        ],
        verify_strategy: null,
        class_name: 'GeneAnswer',
      };

      vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/parse')) return Promise.resolve(makeParseResponse(specWithFields));
        if (url.includes('/primitives')) return Promise.resolve(makePrimitivesResponse());
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) } as unknown as Response);
      });

      render(<TemplateBuilder code="class GeneAnswer: pass" onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fields (1)')).toBeInTheDocument();
        expect(screen.getByText('gene_name')).toBeInTheDocument();
      });
    });
  });

  describe('onChange propagation', () => {
    it('calls onChange when generatedCode updates', async () => {
      const onChange = vi.fn();

      // First set up: parse succeeds, then when code is generated it propagates
      vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/parse')) return Promise.resolve(makeParseResponse());
        if (url.includes('/primitives')) return Promise.resolve(makePrimitivesResponse());
        if (url.includes('/generate'))
          return Promise.resolve(makeGenerateResponse('class Generated(BaseAnswer):\n    pass'));
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) } as unknown as Response);
      });

      render(<TemplateBuilder code="class X: pass" onChange={onChange} />);

      // Wait for initial parse to complete
      await waitFor(() => {
        expect(vi.mocked(global.fetch)).toHaveBeenCalled();
      });

      // Trigger code generation through the store
      await useTemplateBuilderStore.getState().generateCode();

      // The useEffect watching generatedCode should call onChange
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('class Generated(BaseAnswer):\n    pass');
      });
    });
  });
});
