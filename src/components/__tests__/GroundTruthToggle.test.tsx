/**
 * Tests for the Ground Truth Exposure toggle in ConfigurationModal
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigurationModal } from '../ConfigurationModal';

// Mock the useConfigStore
vi.mock('../../stores/useConfigStore');

describe('Ground Truth Exposure Toggle', () => {
  const mockUpdateEnvVariable = vi.fn();
  const mockLoadConfiguration = vi.fn();
  const mockLoadUnmaskedEnvVariables = vi.fn();

  const defaultStoreState = {
    defaultInterface: 'langchain',
    defaultProvider: 'google_genai',
    defaultModel: 'gemini-pro',
    envVariables: {},
    unmaskedEnvVariables: {},
    isLoading: false,
    isSaving: false,
    isSavingDefaults: false,
    error: null,
    hasUnsavedDefaults: () => false,
    loadConfiguration: mockLoadConfiguration,
    loadUnmaskedEnvVariables: mockLoadUnmaskedEnvVariables,
    updateDefaultInterface: vi.fn(),
    updateDefaultProvider: vi.fn(),
    updateDefaultModel: vi.fn(),
    saveDefaults: vi.fn(),
    resetDefaults: vi.fn(),
    updateEnvVariable: mockUpdateEnvVariable,
    updateEnvFileContents: vi.fn(),
    removeEnvVariable: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const { useConfigStore } = await import('../../stores/useConfigStore');
    vi.mocked(useConfigStore).mockReturnValue(defaultStoreState);
  });

  it('renders the ground truth exposure toggle', () => {
    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    // Check that the toggle section exists
    expect(screen.getByText('Parser Ground Truth Exposure')).toBeInTheDocument();
    expect(screen.getByText(/When enabled, the parser model receives ground truth information/)).toBeInTheDocument();
    expect(screen.getByText('Expose ground truth to parser')).toBeInTheDocument();
  });

  it('shows toggle as unchecked when environment variable is not set', async () => {
    const { useConfigStore } = await import('../../stores/useConfigStore');
    vi.mocked(useConfigStore).mockReturnValue({
      ...defaultStoreState,
      envVariables: {},
    });

    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    const checkbox = screen.getByRole('checkbox', { name: /expose ground truth to parser/i });
    expect(checkbox).not.toBeChecked();
  });

  it('shows toggle as unchecked when environment variable is false', async () => {
    const { useConfigStore } = await import('../../stores/useConfigStore');
    vi.mocked(useConfigStore).mockReturnValue({
      ...defaultStoreState,
      envVariables: { KARENINA_EXPOSE_GROUND_TRUTH: 'false' },
    });

    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    const checkbox = screen.getByRole('checkbox', { name: /expose ground truth to parser/i });
    expect(checkbox).not.toBeChecked();
  });

  it('shows toggle as checked when environment variable is true', async () => {
    const { useConfigStore } = await import('../../stores/useConfigStore');
    vi.mocked(useConfigStore).mockReturnValue({
      ...defaultStoreState,
      envVariables: { KARENINA_EXPOSE_GROUND_TRUTH: 'true' },
    });

    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    const checkbox = screen.getByRole('checkbox', { name: /expose ground truth to parser/i });
    expect(checkbox).toBeChecked();
  });

  it('calls updateEnvVariable with true when toggle is enabled', async () => {
    const { useConfigStore } = await import('../../stores/useConfigStore');
    vi.mocked(useConfigStore).mockReturnValue({
      ...defaultStoreState,
      envVariables: {},
    });

    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    const checkbox = screen.getByRole('checkbox', { name: /expose ground truth to parser/i });
    fireEvent.click(checkbox);

    expect(mockUpdateEnvVariable).toHaveBeenCalledWith('KARENINA_EXPOSE_GROUND_TRUTH', 'true');
  });

  it('calls updateEnvVariable with false when toggle is disabled', async () => {
    const { useConfigStore } = await import('../../stores/useConfigStore');
    vi.mocked(useConfigStore).mockReturnValue({
      ...defaultStoreState,
      envVariables: { KARENINA_EXPOSE_GROUND_TRUTH: 'true' },
    });

    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    const checkbox = screen.getByRole('checkbox', { name: /expose ground truth to parser/i });
    fireEvent.click(checkbox);

    expect(mockUpdateEnvVariable).toHaveBeenCalledWith('KARENINA_EXPOSE_GROUND_TRUTH', 'false');
  });

  it('displays helpful description text', () => {
    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    // Check for key phrases in the description
    expect(screen.getByText(/semantic matching/)).toBeInTheDocument();
    expect(screen.getByText(/disambiguation only/)).toBeInTheDocument();
    expect(screen.getByText(/should not influence parsing accuracy/)).toBeInTheDocument();
  });

  it('has proper styling and accessibility', () => {
    render(<ConfigurationModal isOpen={true} onClose={() => {}} />);

    // Click on the Environment Variables tab
    const envTab = screen.getByRole('button', { name: /env/i });
    fireEvent.click(envTab);

    const checkbox = screen.getByRole('checkbox', { name: /expose ground truth to parser/i });

    // Check that checkbox is properly labeled
    expect(checkbox).toHaveAccessibleName(/expose ground truth to parser/i);

    // Check that the container has blue styling (indicating it's a special configuration)
    const container = screen.getByText('Parser Ground Truth Exposure').closest('div[class*="bg-blue"]');
    expect(container).toBeInTheDocument();
  });
});
