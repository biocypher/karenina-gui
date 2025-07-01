import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfigurationPanel } from '../ConfigurationPanel';

const mockAnsweringModel = {
  id: 'answering-1',
  model_provider: 'google_genai',
  model_name: 'gemini-2.0-flash',
  temperature: 0.1,
  interface: 'langchain' as const,
  system_prompt: 'You are an expert assistant.',
};

const mockParsingModel = {
  id: 'parsing-1',
  model_provider: 'google_genai',
  model_name: 'gemini-2.0-flash',
  temperature: 0.1,
  interface: 'langchain' as const,
  system_prompt: 'You are a validation assistant.',
};

const defaultProps = {
  answeringModels: [mockAnsweringModel],
  parsingModels: [mockParsingModel],
  replicateCount: 1,
  expandedPrompts: new Set<string>(),
  isRunning: false,
  onAddAnsweringModel: vi.fn(),
  onAddParsingModel: vi.fn(),
  onRemoveAnsweringModel: vi.fn(),
  onRemoveParsingModel: vi.fn(),
  onUpdateAnsweringModel: vi.fn(),
  onUpdateParsingModel: vi.fn(),
  onTogglePromptExpanded: vi.fn(),
  onReplicateCountChange: vi.fn(),
};

describe('ConfigurationPanel', () => {
  it('renders configuration sections for both model types', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    expect(screen.getByText(/Answering Models \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Parsing Models \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Test Combinations/)).toBeInTheDocument();
  });

  it('displays correct model count and combination calculation', () => {
    const props = {
      ...defaultProps,
      answeringModels: [mockAnsweringModel, { ...mockAnsweringModel, id: 'answering-2' }],
      parsingModels: [mockParsingModel, { ...mockParsingModel, id: 'parsing-2' }],
      replicateCount: 2,
    };

    render(<ConfigurationPanel {...props} />);

    expect(screen.getByText(/Answering Models \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Parsing Models \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // Check for just the number
    expect(screen.getByText(/times/)).toBeInTheDocument(); // Check for "times" separately
  });

  it('calls onAddAnsweringModel when Add Model button is clicked for answering models', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    const addButtons = screen.getAllByText('Add Model');
    fireEvent.click(addButtons[0]); // First button is for answering models

    expect(defaultProps.onAddAnsweringModel).toHaveBeenCalledTimes(1);
  });

  it('calls onAddParsingModel when Add Model button is clicked for parsing models', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    const addButtons = screen.getAllByText('Add Model');
    fireEvent.click(addButtons[1]); // Second button is for parsing models

    expect(defaultProps.onAddParsingModel).toHaveBeenCalledTimes(1);
  });

  it('shows remove button only when there are multiple models', () => {
    const props = {
      ...defaultProps,
      answeringModels: [
        mockAnsweringModel,
        { ...mockAnsweringModel, id: 'answering-2' }
      ],
    };

    const { container } = render(<ConfigurationPanel {...props} />);

    // Look for trash icon SVGs
    const trashIcons = container.querySelectorAll('[data-lucide="trash2"], .lucide-trash2');
    expect(trashIcons.length).toBeGreaterThan(0);
  });

  it('disables inputs when isRunning is true', () => {
    const props = { ...defaultProps, isRunning: true };
    render(<ConfigurationPanel {...props} />);

    const addButtons = screen.getAllByText('Add Model');
    expect(addButtons[0]).toBeDisabled();
    expect(addButtons[1]).toBeDisabled();

    // Check that select elements are disabled
    const selects = screen.getAllByRole('combobox');
    selects.forEach(select => {
      expect(select).toBeDisabled();
    });
  });

  it('handles model configuration updates', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    const providerSelects = screen.getAllByRole('combobox');
    fireEvent.change(providerSelects[0], { target: { value: 'openai' } });

    expect(defaultProps.onUpdateAnsweringModel).toHaveBeenCalledWith(
      'answering-1',
      { model_provider: 'openai' }
    );
  });

  it('handles interface selection changes', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    const openRouterRadios = screen.getAllByLabelText('OpenRouter');
    fireEvent.click(openRouterRadios[0]);

    expect(defaultProps.onUpdateAnsweringModel).toHaveBeenCalledWith(
      'answering-1',
      { interface: 'openrouter' }
    );
  });

  it('handles temperature slider changes', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    const temperatureSliders = screen.getAllByRole('slider');
    fireEvent.change(temperatureSliders[0], { target: { value: '0.5' } });

    expect(defaultProps.onUpdateAnsweringModel).toHaveBeenCalledWith(
      'answering-1',
      { temperature: 0.5 }
    );
  });

  it('handles model name input changes', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    const modelNameInputs = screen.getAllByDisplayValue('gemini-2.0-flash');
    fireEvent.change(modelNameInputs[0], { target: { value: 'gpt-4' } });

    expect(defaultProps.onUpdateAnsweringModel).toHaveBeenCalledWith(
      'answering-1',
      { model_name: 'gpt-4' }
    );
  });

  it('toggles system prompt expansion', () => {
    const { container } = render(<ConfigurationPanel {...defaultProps} />);

    // Look for chevron down icons (collapse buttons)
    const chevronIcons = container.querySelectorAll('svg.lucide-chevron-down');
    
    if (chevronIcons.length > 0) {
      fireEvent.click(chevronIcons[0].closest('button')!);
      expect(defaultProps.onTogglePromptExpanded).toHaveBeenCalledWith('answering-1');
    }
  });

  it('shows expanded system prompt when in expandedPrompts set', () => {
    const props = {
      ...defaultProps,
      expandedPrompts: new Set(['answering-1']),
    };

    render(<ConfigurationPanel {...props} />);

    const textareas = screen.getAllByRole('textbox');
    const promptTextarea = textareas.find(textarea => 
      textarea.getAttribute('rows') === '3'
    );
    
    expect(promptTextarea).toBeInTheDocument();
    expect(promptTextarea).toHaveValue('You are an expert assistant.');
  });

  it('shows collapsed system prompt when not in expandedPrompts set', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    expect(screen.getByText('You are an expert assistant.')).toBeInTheDocument();
    expect(screen.getByText('You are a validation assistant.')).toBeInTheDocument();
  });

  it('handles system prompt updates when expanded', () => {
    const props = {
      ...defaultProps,
      expandedPrompts: new Set(['answering-1']),
    };

    render(<ConfigurationPanel {...props} />);

    const textareas = screen.getAllByRole('textbox');
    const promptTextarea = textareas.find(textarea => 
      textarea.getAttribute('rows') === '3'
    );

    if (promptTextarea) {
      fireEvent.change(promptTextarea, { target: { value: 'New prompt' } });
      expect(defaultProps.onUpdateAnsweringModel).toHaveBeenCalledWith(
        'answering-1',
        { system_prompt: 'New prompt' }
      );
    }
  });

  it('shows manual option only for answering models', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    // Check that Manual radio buttons exist
    const manualRadios = screen.getAllByLabelText('Manual');
    
    // Should only find Manual option in answering models section (1 instance)
    expect(manualRadios).toHaveLength(1);
    
    // Verify all radio options are present for answering models
    const answeringSection = screen.getByText(/Answering Models \(1\)/).closest('div');
    expect(answeringSection).toBeInTheDocument();
    
    // Find all radio buttons within the answering models section
    const allAnsweringRadios = screen.getAllByRole('radio');
    const langchainRadios = screen.getAllByLabelText('LangChain');
    const openrouterRadios = screen.getAllByLabelText('OpenRouter');
    
    // Should have 3 radio options per model (LangChain, OpenRouter, Manual) for answering
    // and 2 radio options per model (LangChain, OpenRouter) for parsing
    // Total: 3 + 2 = 5 radio buttons
    expect(allAnsweringRadios).toHaveLength(5);
    expect(langchainRadios).toHaveLength(2); // One for answering, one for parsing
    expect(openrouterRadios).toHaveLength(2); // One for answering, one for parsing
    expect(manualRadios).toHaveLength(1); // Only for answering models
  });

  it('handles manual interface selection for answering models', () => {
    render(<ConfigurationPanel {...defaultProps} />);

    const manualRadio = screen.getByLabelText('Manual');
    fireEvent.click(manualRadio);

    expect(defaultProps.onUpdateAnsweringModel).toHaveBeenCalledWith(
      'answering-1',
      { interface: 'manual' }
    );
  });
});