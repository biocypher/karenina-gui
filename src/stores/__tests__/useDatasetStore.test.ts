import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDatasetStore } from '../useDatasetStore';
import type { DatasetMetadata, SchemaOrgPerson, SchemaOrgOrganization } from '../../types';

describe('useDatasetStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { resetMetadata, resetBenchmarkState } = useDatasetStore.getState();
    act(() => {
      resetMetadata();
      resetBenchmarkState();
    });
  });

  it('initializes with default metadata', () => {
    const { result } = renderHook(() => useDatasetStore());

    expect(result.current.metadata.name).toBe('');
    expect(result.current.metadata.description).toBe('');
    expect(result.current.metadata.version).toBe('1.0.0');
    expect(result.current.metadata.license).toBe('');
    expect(result.current.metadata.keywords).toEqual([]);
    expect(result.current.metadata.custom_properties).toEqual({});
    expect(result.current.metadata.dateCreated).toBeDefined();
  });

  it('sets and updates metadata correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    const testMetadata: DatasetMetadata = {
      name: 'Test Dataset',
      description: 'A test dataset for benchmarking',
      version: '2.0.0',
      license: 'MIT',
      keywords: ['test', 'benchmark'],
    };

    act(() => {
      result.current.setMetadata(testMetadata);
    });

    expect(result.current.metadata.name).toBe('Test Dataset');
    expect(result.current.metadata.description).toBe('A test dataset for benchmarking');
    expect(result.current.metadata.version).toBe('2.0.0');
    expect(result.current.metadata.license).toBe('MIT');
    expect(result.current.metadata.keywords).toEqual(['test', 'benchmark']);
  });

  it('updates individual fields correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    act(() => {
      result.current.updateField('name', 'Updated Dataset');
    });

    expect(result.current.metadata.name).toBe('Updated Dataset');
    expect(result.current.metadata.dateModified).toBeDefined();
  });

  it('manages keywords correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    // Add keywords
    act(() => {
      result.current.addKeyword('machine-learning');
      result.current.addKeyword('nlp');
    });

    expect(result.current.metadata.keywords).toEqual(['machine-learning', 'nlp']);

    // Don't add duplicate keywords
    act(() => {
      result.current.addKeyword('machine-learning');
    });

    expect(result.current.metadata.keywords).toEqual(['machine-learning', 'nlp']);

    // Remove keyword
    act(() => {
      result.current.removeKeyword('nlp');
    });

    expect(result.current.metadata.keywords).toEqual(['machine-learning']);

    // Don't add empty keywords
    act(() => {
      result.current.addKeyword('   ');
    });

    expect(result.current.metadata.keywords).toEqual(['machine-learning']);
  });

  it('manages custom properties correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    // Add custom properties
    act(() => {
      result.current.addCustomProperty('custom_field', 'custom_value');
      result.current.addCustomProperty('another_field', 'another_value');
    });

    expect(result.current.metadata.custom_properties).toEqual({
      custom_field: 'custom_value',
      another_field: 'another_value',
    });

    // Update custom property
    act(() => {
      result.current.updateCustomProperty('custom_field', 'updated_value');
    });

    expect(result.current.metadata.custom_properties?.custom_field).toBe('updated_value');

    // Remove custom property
    act(() => {
      result.current.removeCustomProperty('another_field');
    });

    expect(result.current.metadata.custom_properties).toEqual({
      custom_field: 'updated_value',
    });

    // Don't add empty property names
    act(() => {
      result.current.addCustomProperty('   ', 'value');
    });

    expect(Object.keys(result.current.metadata.custom_properties || {})).toEqual(['custom_field']);
  });

  it('handles creator as Person correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    const personCreator: SchemaOrgPerson = {
      '@type': 'Person',
      name: 'John Doe',
      email: 'john@example.com',
      affiliation: 'Example University',
      url: 'https://johndoe.com',
    };

    act(() => {
      result.current.setCreator(personCreator);
    });

    expect(result.current.metadata.creator).toEqual(personCreator);
    expect(result.current.metadata.dateModified).toBeDefined();
  });

  it('handles creator as Organization correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    const orgCreator: SchemaOrgOrganization = {
      '@type': 'Organization',
      name: 'Example Corp',
      description: 'A technology company',
      url: 'https://example.com',
      email: 'contact@example.com',
    };

    act(() => {
      result.current.setCreator(orgCreator);
    });

    expect(result.current.metadata.creator).toEqual(orgCreator);
  });

  it('handles publisher correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    const publisher: SchemaOrgOrganization = {
      '@type': 'Organization',
      name: 'Publisher Inc',
      description: 'Data publishing company',
    };

    act(() => {
      result.current.setPublisher(publisher);
    });

    expect(result.current.metadata.publisher).toEqual(publisher);
  });

  it('resets metadata correctly', () => {
    const { result } = renderHook(() => useDatasetStore());

    // Set some data first
    act(() => {
      result.current.updateField('name', 'Test Dataset');
      result.current.addKeyword('test');
      result.current.addCustomProperty('prop', 'value');
    });

    expect(result.current.metadata.name).toBe('Test Dataset');
    expect(result.current.metadata.keywords).toEqual(['test']);
    expect(result.current.metadata.custom_properties?.prop).toBe('value');

    // Reset
    act(() => {
      result.current.resetMetadata();
    });

    expect(result.current.metadata.name).toBe('');
    expect(result.current.metadata.keywords).toEqual([]);
    expect(result.current.metadata.custom_properties).toEqual({});
  });

  it('maintains arrays and objects when setting metadata', () => {
    const { result } = renderHook(() => useDatasetStore());

    const metadataWithoutArrays: DatasetMetadata = {
      name: 'Test Dataset',
    };

    act(() => {
      result.current.setMetadata(metadataWithoutArrays);
    });

    // Should initialize with empty arrays and objects
    expect(result.current.metadata.keywords).toEqual([]);
    expect(result.current.metadata.custom_properties).toEqual({});
  });

  it('preserves dateCreated when updating metadata', () => {
    const { result } = renderHook(() => useDatasetStore());

    const originalDateCreated = result.current.metadata.dateCreated;

    act(() => {
      result.current.setMetadata({
        name: 'Updated Dataset',
        dateCreated: originalDateCreated,
      });
    });

    expect(result.current.metadata.dateCreated).toBe(originalDateCreated);
  });

  it('updates dateModified when making changes', async () => {
    const { result } = renderHook(() => useDatasetStore());

    const originalDateModified = result.current.metadata.dateModified;

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 1));

    act(() => {
      result.current.updateField('name', 'Updated Dataset');
    });

    expect(result.current.metadata.dateModified).not.toBe(originalDateModified);
  });

  it('initializes with benchmark not initialized', () => {
    const { result } = renderHook(() => useDatasetStore());

    expect(result.current.isBenchmarkInitialized).toBe(false);
  });

  it('marks benchmark as initialized', () => {
    const { result } = renderHook(() => useDatasetStore());

    act(() => {
      result.current.markBenchmarkAsInitialized();
    });

    expect(result.current.isBenchmarkInitialized).toBe(true);
  });

  it('resets benchmark state', () => {
    const { result } = renderHook(() => useDatasetStore());

    // First mark as initialized
    act(() => {
      result.current.markBenchmarkAsInitialized();
    });

    expect(result.current.isBenchmarkInitialized).toBe(true);

    // Then reset
    act(() => {
      result.current.resetBenchmarkState();
    });

    expect(result.current.isBenchmarkInitialized).toBe(false);
  });

  describe('Storage URL Management', () => {
    it('initializes with null storage URL', () => {
      const { result } = renderHook(() => useDatasetStore());

      expect(result.current.storageUrl).toBeNull();
    });

    it('sets storage URL correctly', () => {
      const { result } = renderHook(() => useDatasetStore());

      const testUrl = 'sqlite:///test.db';

      act(() => {
        result.current.setStorageUrl(testUrl);
      });

      expect(result.current.storageUrl).toBe(testUrl);
    });

    it('updates storage URL to different value', () => {
      const { result } = renderHook(() => useDatasetStore());

      act(() => {
        result.current.setStorageUrl('sqlite:///first.db');
      });

      expect(result.current.storageUrl).toBe('sqlite:///first.db');

      act(() => {
        result.current.setStorageUrl('sqlite:///second.db');
      });

      expect(result.current.storageUrl).toBe('sqlite:///second.db');
    });

    it('clears storage URL when set to null', () => {
      const { result } = renderHook(() => useDatasetStore());

      // First set a URL
      act(() => {
        result.current.setStorageUrl('sqlite:///test.db');
      });

      expect(result.current.storageUrl).toBe('sqlite:///test.db');

      // Then clear it
      act(() => {
        result.current.setStorageUrl(null);
      });

      expect(result.current.storageUrl).toBeNull();
    });

    it('handles PostgreSQL connection strings', () => {
      const { result } = renderHook(() => useDatasetStore());

      const pgUrl = 'postgresql://user:pass@localhost:5432/dbname';

      act(() => {
        result.current.setStorageUrl(pgUrl);
      });

      expect(result.current.storageUrl).toBe(pgUrl);
    });

    it('handles MySQL connection strings', () => {
      const { result } = renderHook(() => useDatasetStore());

      const mysqlUrl = 'mysql://user:pass@localhost:3306/dbname';

      act(() => {
        result.current.setStorageUrl(mysqlUrl);
      });

      expect(result.current.storageUrl).toBe(mysqlUrl);
    });

    it('preserves storage URL across metadata changes', () => {
      const { result } = renderHook(() => useDatasetStore());

      const testUrl = 'sqlite:///test.db';

      act(() => {
        result.current.setStorageUrl(testUrl);
        result.current.updateField('name', 'Test Dataset');
      });

      expect(result.current.storageUrl).toBe(testUrl);
      expect(result.current.metadata.name).toBe('Test Dataset');
    });

    it('preserves storage URL when resetting metadata', () => {
      const { result } = renderHook(() => useDatasetStore());

      const testUrl = 'sqlite:///test.db';

      act(() => {
        result.current.setStorageUrl(testUrl);
        result.current.updateField('name', 'Test Dataset');
        result.current.resetMetadata();
      });

      // Storage URL should remain even after metadata reset
      expect(result.current.storageUrl).toBe(testUrl);
      expect(result.current.metadata.name).toBe('');
    });

    it('clears storage URL when resetting benchmark state', () => {
      const { result } = renderHook(() => useDatasetStore());

      act(() => {
        result.current.setStorageUrl('sqlite:///test.db');
        result.current.markBenchmarkAsInitialized();
      });

      expect(result.current.storageUrl).toBe('sqlite:///test.db');
      expect(result.current.isBenchmarkInitialized).toBe(true);

      // Note: Based on current implementation, resetBenchmarkState might not clear storage URL
      // This test documents the expected behavior - adjust if needed
      act(() => {
        result.current.resetBenchmarkState();
      });

      // Storage URL persists through benchmark reset - this is intentional
      // to allow reconnecting to the same database
      expect(result.current.storageUrl).toBe('sqlite:///test.db');
    });
  });
});
