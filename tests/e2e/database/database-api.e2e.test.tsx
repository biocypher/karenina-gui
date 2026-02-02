/**
 * E2E Database API Tests
 *
 * Tests the database management API endpoints against a real karenina-server.
 * These tests verify:
 * - Database connection and initialization
 * - Benchmark CRUD operations
 * - Verification results persistence
 */

import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';

// Get server URL from environment (set by global-setup.ts)
const getServerUrl = () => process.env.VITE_E2E_API_BASE_URL || 'http://localhost:8081';

// Load test fixtures
const loadCheckpoint = (name: string) => {
  const path = resolve(__dirname, '../../fixtures/checkpoints', `${name}.jsonld`);
  return JSON.parse(readFileSync(path, 'utf-8'));
};

describe('E2E: Database API', () => {
  const serverUrl = getServerUrl();
  const testDbPath = join(tmpdir(), `e2e-test-${Date.now()}.db`);
  const testDbUrl = `sqlite:///${testDbPath}`;

  // Cleanup test database after all tests
  afterAll(() => {
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch {
        console.log('Could not delete test database');
      }
    }
  });

  describe('Database Connection', () => {
    it('should initialize a new database', async () => {
      const response = await fetch(`${serverUrl}/api/v2/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: testDbUrl,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('storage_url', testDbUrl);
    });

    it('should connect to existing database', async () => {
      const response = await fetch(`${serverUrl}/api/v2/databases/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: testDbUrl,
          initialize: false,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('benchmark_count');
    });
  });

  describe('Benchmark Operations', () => {
    const testBenchmarkName = `e2e-test-benchmark-${Date.now()}`;

    it('should create a new benchmark', async () => {
      const response = await fetch(`${serverUrl}/api/v2/benchmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: testDbUrl,
          name: testBenchmarkName,
          description: 'E2E test benchmark',
          version: '1.0.0',
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      // API may return checkpoint object or just success status
      if (data.checkpoint) {
        expect(data.checkpoint).toHaveProperty('name', testBenchmarkName);
      }
    });

    it('should list benchmarks', async () => {
      const response = await fetch(`${serverUrl}/api/v2/benchmarks?storage_url=${encodeURIComponent(testDbUrl)}`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('benchmarks');
      expect(Array.isArray(data.benchmarks)).toBe(true);

      // Should contain our test benchmark
      const testBenchmark = data.benchmarks.find((b: { name: string }) => b.name === testBenchmarkName);
      expect(testBenchmark).toBeDefined();
    });

    it('should load a benchmark', async () => {
      const response = await fetch(
        `${serverUrl}/api/v2/benchmarks/${encodeURIComponent(testBenchmarkName)}?storage_url=${encodeURIComponent(testDbUrl)}`,
        {
          method: 'GET',
        }
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      // API may return checkpoint object or just success status
      if (data.checkpoint) {
        expect(data.checkpoint).toHaveProperty('name', testBenchmarkName);
      }
    });

    it('should save benchmark data', async () => {
      const checkpoint = loadCheckpoint('minimal');

      const response = await fetch(`${serverUrl}/api/v2/benchmarks/${encodeURIComponent(testBenchmarkName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: testDbUrl,
          checkpoint_data: checkpoint,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
    });

    it('should delete a benchmark', async () => {
      const response = await fetch(
        `${serverUrl}/api/v2/benchmarks/${encodeURIComponent(testBenchmarkName)}?storage_url=${encodeURIComponent(testDbUrl)}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
    });
  });

  describe('Verification Runs', () => {
    it('should list verification runs (empty)', async () => {
      const response = await fetch(
        `${serverUrl}/api/v2/verification-runs?storage_url=${encodeURIComponent(testDbUrl)}`,
        {
          method: 'GET',
        }
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('runs');
      expect(Array.isArray(data.runs)).toBe(true);
    });
  });
});

describe('E2E: Database Error Handling', () => {
  const serverUrl = getServerUrl();

  it('should handle connection to non-existent database gracefully', async () => {
    const response = await fetch(`${serverUrl}/api/v2/databases/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_url: 'sqlite:///non-existent-path/database.db',
        initialize: false,
      }),
    });

    // Should fail gracefully
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should handle invalid storage URL', async () => {
    const response = await fetch(`${serverUrl}/api/v2/databases/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_url: 'invalid-url-format',
        initialize: false,
      }),
    });

    // Should fail gracefully
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should handle loading non-existent benchmark', async () => {
    const testDbPath = join(tmpdir(), `e2e-error-test-${Date.now()}.db`);
    const testDbUrl = `sqlite:///${testDbPath}`;

    // First create the database
    await fetch(`${serverUrl}/api/v2/databases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_url: testDbUrl,
      }),
    });

    // Try to load non-existent benchmark
    const response = await fetch(
      `${serverUrl}/api/v2/benchmarks/${encodeURIComponent('non-existent-benchmark')}?storage_url=${encodeURIComponent(testDbUrl)}`,
      {
        method: 'GET',
      }
    );

    // Should fail gracefully
    expect(response.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});
