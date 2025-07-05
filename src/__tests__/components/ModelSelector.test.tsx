import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModelSelector } from '../../components/ModelSelector';
import { RubricTraitGenerationConfig } from '../../types';

describe('ModelSelector', () => {
  const defaultConfig: RubricTraitGenerationConfig = {
    model_provider: 'google_genai',
    model_name: 'gemini-2.0-flash',
    temperature: 0.1,
    interface: 'langchain',
  };

  it('renders interface selection options', () => {
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={defaultConfig} onConfigChange={mockOnConfigChange} />);

    expect(screen.getByLabelText(/LangChain \(requires provider\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/OpenRouter \(no provider needed\)/)).toBeInTheDocument();
  });

  it('shows provider field when langchain is selected', () => {
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={defaultConfig} onConfigChange={mockOnConfigChange} />);

    expect(screen.getByText(/Model Provider/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('google_genai')).toBeInTheDocument();
  });

  it('hides provider field when openrouter is selected', () => {
    const openRouterConfig: RubricTraitGenerationConfig = {
      ...defaultConfig,
      interface: 'openrouter',
    };
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={openRouterConfig} onConfigChange={mockOnConfigChange} />);

    expect(screen.queryByText(/Model Provider/)).not.toBeInTheDocument();
  });

  it('calls onConfigChange when interface is changed', () => {
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={defaultConfig} onConfigChange={mockOnConfigChange} />);

    fireEvent.click(screen.getByLabelText(/OpenRouter \(no provider needed\)/));

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...defaultConfig,
      interface: 'openrouter',
    });
  });

  it('calls onConfigChange when model name is changed', () => {
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={defaultConfig} onConfigChange={mockOnConfigChange} />);

    const modelNameInput = screen.getByDisplayValue('gemini-2.0-flash');
    fireEvent.change(modelNameInput, { target: { value: 'gpt-4' } });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...defaultConfig,
      model_name: 'gpt-4',
    });
  });

  it('calls onConfigChange when temperature is changed', () => {
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={defaultConfig} onConfigChange={mockOnConfigChange} />);

    const temperatureSlider = screen.getByDisplayValue('0.1');
    fireEvent.change(temperatureSlider, { target: { value: '0.5' } });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...defaultConfig,
      temperature: 0.5,
    });
  });

  it('disables inputs when disabled prop is true', () => {
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={defaultConfig} onConfigChange={mockOnConfigChange} disabled={true} />);

    expect(screen.getByLabelText(/LangChain \(requires provider\)/)).toBeDisabled();
    expect(screen.getByLabelText(/OpenRouter \(no provider needed\)/)).toBeDisabled();
    expect(screen.getByDisplayValue('google_genai')).toBeDisabled();
    expect(screen.getByDisplayValue('gemini-2.0-flash')).toBeDisabled();
    expect(screen.getByDisplayValue('0.1')).toBeDisabled();
  });

  it('displays correct placeholder for openrouter model name', () => {
    const openRouterConfig: RubricTraitGenerationConfig = {
      ...defaultConfig,
      interface: 'openrouter',
      model_name: '',
    };
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={openRouterConfig} onConfigChange={mockOnConfigChange} />);

    const modelNameInput = screen.getByPlaceholderText(/meta-llama\/llama-3.2-3b-instruct:free/);
    expect(modelNameInput).toBeInTheDocument();
  });

  it('displays temperature value in label', () => {
    const mockOnConfigChange = vi.fn();

    render(<ModelSelector config={defaultConfig} onConfigChange={mockOnConfigChange} />);

    expect(screen.getByText(/Temperature \(0\.1\)/)).toBeInTheDocument();
  });
});
