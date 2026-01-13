/**
 * E2E Server Manager
 *
 * Manages the lifecycle of a karenina-server subprocess for E2E tests.
 * The server runs in E2E mode with LLM calls mocked via FixtureBackedLLMClient.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerManagerConfig {
  port: number;
  host: string;
  fixtureDir: string;
  startupTimeout: number;
  healthCheckInterval: number;
}

const DEFAULT_CONFIG: ServerManagerConfig = {
  port: 8081,
  host: 'localhost',
  fixtureDir: path.resolve(__dirname, '../../fixtures/llm-responses/e2e'),
  startupTimeout: 30000,
  healthCheckInterval: 100,
};

export class E2EServerManager {
  private serverProcess: ChildProcess | null = null;
  private config: ServerManagerConfig;
  private isRunning = false;

  constructor(config: Partial<ServerManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  get wsUrl(): string {
    return `ws://${this.config.host}:${this.config.port}`;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[E2E] Server already running');
      return;
    }

    console.log(`[E2E] Starting karenina-server on port ${this.config.port}...`);

    // Environment variables for E2E mode
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      KARENINA_E2E_MODE: 'true',
      KARENINA_E2E_FIXTURE_DIR: this.config.fixtureDir,
      KARENINA_CSRF_ENABLED: 'false',
      // Disable async to simplify testing
      KARENINA_ASYNC_ENABLED: 'false',
    };

    // Path to karenina-server
    const serverDir = path.resolve(__dirname, '../../../../karenina-server');

    // Start the server using uv
    this.serverProcess = spawn(
      'uv',
      ['run', 'karenina-server', 'serve', '--port', String(this.config.port), '--host', this.config.host],
      {
        cwd: serverDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      }
    );

    // Log server output for debugging
    this.serverProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[E2E Server] ${output}`);
      }
    });

    this.serverProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[E2E Server Error] ${output}`);
      }
    });

    this.serverProcess.on('error', (error: Error) => {
      console.error('[E2E] Failed to start server:', error);
      this.isRunning = false;
    });

    this.serverProcess.on('exit', (code: number | null) => {
      console.log(`[E2E] Server exited with code ${code}`);
      this.isRunning = false;
    });

    // Wait for server to be ready
    await this.waitForReady();
    this.isRunning = true;
    console.log(`[E2E] Server ready at ${this.baseUrl}`);
  }

  async stop(): Promise<void> {
    if (!this.serverProcess || !this.isRunning) {
      console.log('[E2E] Server not running');
      return;
    }

    console.log('[E2E] Stopping server...');

    return new Promise((resolve) => {
      if (!this.serverProcess) {
        resolve();
        return;
      }

      const proc = this.serverProcess;
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          this.isRunning = false;
          this.serverProcess = null;
          console.log('[E2E] Server stopped');
          resolve();
        }
      };

      proc.on('exit', cleanup);
      proc.on('error', cleanup);

      // Send SIGTERM for graceful shutdown
      proc.kill('SIGTERM');

      // Force kill after 2 seconds if not stopped
      setTimeout(() => {
        if (!resolved && proc.pid) {
          console.log('[E2E] Force killing server...');
          try {
            proc.kill('SIGKILL');
            // Also try killing the process group
            process.kill(-proc.pid, 'SIGKILL');
          } catch {
            // Process may already be dead
          }
          cleanup();
        }
      }, 2000);
    });
  }

  private async waitForReady(): Promise<void> {
    const start = Date.now();
    const healthUrl = `${this.baseUrl}/api/health`;

    while (Date.now() - start < this.config.startupTimeout) {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          return;
        }
      } catch {
        // Server not ready yet, continue polling
      }
      await this.sleep(this.config.healthCheckInterval);
    }

    // Cleanup on failure
    await this.stop();
    throw new Error(`E2E server failed to start within ${this.config.startupTimeout}ms`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance for global setup/teardown
let serverInstance: E2EServerManager | null = null;

export function getServerInstance(): E2EServerManager {
  if (!serverInstance) {
    serverInstance = new E2EServerManager();
  }
  return serverInstance;
}

export async function startServer(): Promise<E2EServerManager> {
  const server = getServerInstance();
  await server.start();
  return server;
}

export async function stopServer(): Promise<void> {
  if (serverInstance) {
    await serverInstance.stop();
    serverInstance = null;
  }
}
