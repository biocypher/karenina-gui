import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDatasetStore } from '../useDatasetStore';
import type { DatasetMetadata, SchemaOrgPerson, SchemaOrgOrganization } from '../../types';

describe('useDatasetStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { resetMetadata } = useDatasetStore.getState();
    act(() => {
      resetMetadata();
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
});
