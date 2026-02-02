import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfigStore } from '../useConfigStore';

// Mock fetch
global.fetch = vi.fn();

describe('useConfigStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useConfigStore.setState({
      defaultInterface: 'langchain',
      defaultProvider: 'google_genai',
      defaultModel: 'gemini-pro',
      envVariables: {},
      unmaskedEnvVariables: {},
      isLoading: false,
      isSaving: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useConfigStore());

    expect(result.current.defaultInterface).toBe('langchain');
    expect(result.current.defaultProvider).toBe('google_genai');
    expect(result.current.defaultModel).toBe('gemini-pro');
    expect(result.current.envVariables).toEqual({});
    expect(result.current.unmaskedEnvVariables).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('loads configuration successfully', async () => {
    const mockEnvResponse = { OPENAI_API_KEY: '****5678' };
    const mockDefaultsResponse = {
      default_interface: 'openrouter',
      default_provider: 'openai',
      default_model: 'gpt-4',
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEnvResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDefaultsResponse),
      });

    const { result } = renderHook(() => useConfigStore());

    await act(async () => {
      await result.current.loadConfiguration();
    });

    expect(result.current.envVariables).toEqual(mockEnvResponse);
    expect(result.current.defaultInterface).toBe('openrouter');
    expect(result.current.defaultProvider).toBe('openai');
    expect(result.current.defaultModel).toBe('gpt-4');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('handles load configuration error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useConfigStore());

    await act(async () => {
      await result.current.loadConfiguration();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('updates default interface', () => {
    const { result } = renderHook(() => useConfigStore());

    act(() => {
      result.current.updateDefaultInterface('openrouter');
    });

    expect(result.current.defaultInterface).toBe('openrouter');
  });

  it('updates default provider', () => {
    const { result } = renderHook(() => useConfigStore());

    act(() => {
      result.current.updateDefaultProvider('openai');
    });

    expect(result.current.defaultProvider).toBe('openai');
  });

  it('updates default model', () => {
    const { result } = renderHook(() => useConfigStore());

    act(() => {
      result.current.updateDefaultModel('gpt-4');
    });

    expect(result.current.defaultModel).toBe('gpt-4');
  });

  it('updates environment variable successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            variables: { NEW_KEY: '****test' },
            providers: { openai: true },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            default_interface: 'langchain',
            default_provider: 'google_genai',
            default_model: 'gemini-pro',
          }),
      });

    const { result } = renderHook(() => useConfigStore());

    await act(async () => {
      await result.current.updateEnvVariable('NEW_KEY', 'test_value');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/v2/config/env-vars', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'NEW_KEY', value: 'test_value' }),
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('handles update environment variable error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Network error occurred' }),
    });

    const { result } = renderHook(() => useConfigStore());

    await act(async () => {
      try {
        await result.current.updateEnvVariable('TEST_KEY', 'test_value');
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Network error occurred');
    expect(result.current.isSaving).toBe(false);
  });

  it('removes environment variable successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            variables: {},
            providers: { openai: false },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            default_interface: 'langchain',
            default_provider: 'google_genai',
            default_model: 'gemini-pro',
          }),
      });

    const { result } = renderHook(() => useConfigStore());

    await act(async () => {
      await result.current.removeEnvVariable('OLD_KEY');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/v2/config/env-vars/OLD_KEY', {
      method: 'DELETE',
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('loads unmasked environment variables', async () => {
    const mockUnmaskedEnvResponse = { OPENAI_API_KEY: 'sk-real-key-value' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUnmaskedEnvResponse),
    });

    const { result } = renderHook(() => useConfigStore());

    await act(async () => {
      await result.current.loadUnmaskedEnvVariables();
    });

    expect(result.current.unmaskedEnvVariables).toEqual(mockUnmaskedEnvResponse);
  });

  it('updates env file contents successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            variables: { NEW_VAR: 'new_value' },
            providers: { openai: true },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            default_interface: 'langchain',
            default_provider: 'google_genai',
            default_model: 'gemini-pro',
          }),
      });

    const { result } = renderHook(() => useConfigStore());

    await act(async () => {
      await result.current.updateEnvFileContents('NEW_VAR=new_value');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/v2/config/env-file', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'NEW_VAR=new_value' }),
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
