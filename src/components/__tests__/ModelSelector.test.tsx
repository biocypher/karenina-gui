import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModelSelector } from '../ModelSelector';
import { RubricTraitGenerationConfig } from '../../types';

describe('ModelSelector', () => {
  const defaultConfig: RubricTraitGenerationConfig = {
    model_provider: 'google_genai',
    model_name: 'gemini-2.0-flash',
    temperature: 0.1,
    interface: 'langchain',
  };

  it('clears model_provider when switching to OpenRouter', () => {
    const onConfigChange = vi.fn();
    const { getByLabelText } = render(<ModelSelector config={defaultConfig} onConfigChange={onConfigChange} />);

    // Switch to OpenRouter
    const openRouterRadio = getByLabelText('OpenRouter (no provider needed)');
    fireEvent.click(openRouterRadio);

    // Verify that model_provider was cleared
    expect(onConfigChange).toHaveBeenCalledWith({
      ...defaultConfig,
      interface: 'openrouter',
      model_provider: '',
    });
  });

  it('sets default model_provider when switching to LangChain from OpenRouter', () => {
    const onConfigChange = vi.fn();
    const openRouterConfig: RubricTraitGenerationConfig = {
      model_provider: '',
      model_name: 'openrouter/cypher-alpha:free',
      temperature: 0.1,
      interface: 'openrouter',
    };

    const { getByLabelText } = render(<ModelSelector config={openRouterConfig} onConfigChange={onConfigChange} />);

    // Switch to LangChain
    const langChainRadio = getByLabelText('LangChain (requires provider)');
    fireEvent.click(langChainRadio);

    // Verify that model_provider was set to default
    expect(onConfigChange).toHaveBeenCalledWith({
      ...openRouterConfig,
      interface: 'langchain',
      model_provider: 'google_genai',
    });
  });

  it('does not show model provider field for OpenRouter interface', () => {
    const openRouterConfig: RubricTraitGenerationConfig = {
      model_provider: '',
      model_name: 'openrouter/cypher-alpha:free',
      temperature: 0.1,
      interface: 'openrouter',
    };

    const { queryByPlaceholderText } = render(<ModelSelector config={openRouterConfig} onConfigChange={vi.fn()} />);

    // Model provider field should not be present
    const providerField = queryByPlaceholderText('e.g., google_genai, openai, anthropic, ollama');
    expect(providerField).toBeNull();
  });

  it('shows model provider field for LangChain interface', () => {
    const { getByPlaceholderText } = render(<ModelSelector config={defaultConfig} onConfigChange={vi.fn()} />);

    // Model provider field should be present
    const providerField = getByPlaceholderText('e.g., google_genai, openai, anthropic, ollama');
    expect(providerField).toBeTruthy();
  });

  it('shows appropriate placeholder for OpenRouter model names', () => {
    const openRouterConfig: RubricTraitGenerationConfig = {
      model_provider: '',
      model_name: 'openrouter/cypher-alpha:free',
      temperature: 0.1,
      interface: 'openrouter',
    };

    const { getByPlaceholderText } = render(<ModelSelector config={openRouterConfig} onConfigChange={vi.fn()} />);

    // Check for OpenRouter-specific placeholder
    const modelField = getByPlaceholderText('e.g., meta-llama/llama-3.2-3b-instruct:free');
    expect(modelField).toBeTruthy();
  });
});
