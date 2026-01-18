/**
 * E2E Presets API Tests
 *
 * Tests the presets management API endpoints against a real karenina-server.
 * These tests verify:
 * - Listing available presets
 * - Loading preset configurations
 */

import { describe, it, expect } from 'vitest';

// Get server URL from environment (set by global-setup.ts)
const getServerUrl = () => process.env.VITE_E2E_API_BASE_URL || 'http://localhost:8081';

describe('E2E: Presets API', () => {
  const serverUrl = getServerUrl();

  describe('Preset Listing', () => {
    it('should list available presets', async () => {
      const response = await fetch(`${serverUrl}/api/v2/presets`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      // Presets endpoint returns presets object
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should have default preset available', async () => {
      const response = await fetch(`${serverUrl}/api/v2/presets`);

      expect(response.ok).toBe(true);

      const data = await response.json();

      // There should be at least one preset (default)
      const presetNames = Object.keys(data);
      expect(presetNames.length).toBeGreaterThan(0);
    });
  });

  describe('Preset Loading', () => {
    it('should load a specific preset', async () => {
      // First get list of presets
      const listResponse = await fetch(`${serverUrl}/api/v2/presets`);
      expect(listResponse.ok).toBe(true);

      const presets = await listResponse.json();
      const presetNames = Object.keys(presets);

      if (presetNames.length > 0) {
        const firstPresetName = presetNames[0];
        const preset = presets[firstPresetName];

        // Verify preset has expected structure
        expect(preset).toBeDefined();

        // Presets should have configuration properties
        // The exact structure depends on the preset schema
        expect(typeof preset).toBe('object');
      }
    });

    it('should return proper preset structure', async () => {
      const response = await fetch(`${serverUrl}/api/v2/presets`);
      expect(response.ok).toBe(true);

      const presets = await response.json();
      const presetNames = Object.keys(presets);

      if (presetNames.length > 0) {
        const firstPreset = presets[presetNames[0]];

        // Presets typically have model configurations
        // Check for common expected properties
        if (firstPreset.answering_model) {
          expect(firstPreset.answering_model).toHaveProperty('model_name');
        }
        if (firstPreset.parsing_model) {
          expect(firstPreset.parsing_model).toHaveProperty('model_name');
        }
      }
    });
  });
});

describe('E2E: Generation API', () => {
  const serverUrl = getServerUrl();

  describe('Template Generation', () => {
    it('should reject generation with missing parameters', async () => {
      const response = await fetch(`${serverUrl}/api/v2/templates/generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Should fail with 400 or 422 (validation error)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Rubric Generation', () => {
    it('should have rubric generation endpoint available', async () => {
      // Test that the endpoint exists and accepts requests
      // (may require fixtures to actually work)
      const response = await fetch(`${serverUrl}/api/v2/rubrics/generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Test question',
          rubric_type: 'boolean',
        }),
      });

      // Should either work or fail with a meaningful error
      // Not a 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });
  });
});
