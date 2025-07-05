import { promises as fs } from 'fs';
import * as path from 'path';

const pidFilePath = path.join(process.cwd(), 'tests/e2e/.karenina-pids.json');

/**
 * Global teardown function for Playwright E2E tests
 * Cleans up any remaining processes and files after all tests complete
 */
async function globalTeardown() {
  console.log('🧹 Starting E2E global teardown...');

  try {
    // Clean up any remaining processes
    await cleanupProcesses();

    // Clean up temporary files
    await cleanupTempFiles();

    console.log('✅ E2E global teardown completed successfully');
  } catch {
    console.error('❌ E2E teardown error:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

/**
 * Clean up any remaining Karenina processes
 */
async function cleanupProcesses() {
  try {
    // Try to read stored PIDs
    const pidsData = await fs.readFile(pidFilePath, 'utf-8');
    const pids = JSON.parse(pidsData);

    // Clean up frontend process
    if (pids.frontend) {
      console.log(`🧹 Cleaning up frontend process: ${pids.frontend}`);
      try {
        process.kill(-pids.frontend, 'SIGTERM');
        await sleep(1000);
        process.kill(-pids.frontend, 'SIGKILL');
      } catch {
        console.log('Frontend process cleanup (expected if already terminated):', error);
      }
    }

    // Clean up backend process
    if (pids.backend) {
      console.log(`🧹 Cleaning up backend process: ${pids.backend}`);
      try {
        process.kill(-pids.backend, 'SIGTERM');
        await sleep(1000);
        process.kill(-pids.backend, 'SIGKILL');
      } catch {
        console.log('Backend process cleanup (expected if already terminated):', error);
      }
    }

    // Legacy cleanup for old PID format
    if (pids.main) {
      console.log(`🧹 Cleaning up legacy process: ${pids.main}`);
      try {
        process.kill(-pids.main, 'SIGTERM');
        await sleep(1000);
        process.kill(-pids.main, 'SIGKILL');
      } catch {
        console.log('Legacy process cleanup (expected if already terminated):', error);
      }
    }

    // Remove PID file
    await fs.unlink(pidFilePath);
    console.log('✓ Removed PID file');
  } catch {
    // PID file might not exist, which is fine
    console.log('No PID file found (processes might already be cleaned up)');
  }

  // Additional cleanup: kill any remaining processes on the test ports
  await killProcessesOnPorts([5173, 8080]);
}

/**
 * Kill any processes running on the specified ports
 */
async function killProcessesOnPorts(ports: number[]) {
  for (const port of ports) {
    try {
      console.log(`🧹 Checking for processes on port ${port}...`);

      // Use lsof to find processes on the port
      const { spawn } = await import('child_process');
      const lsof = spawn('lsof', ['-ti', `:${port}`], { stdio: ['pipe', 'pipe', 'pipe'] });

      let output = '';
      lsof.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      await new Promise<void>((resolve) => {
        lsof.on('close', (code: number) => {
          if (code === 0 && output.trim()) {
            // Found processes, kill them
            const pids = output
              .trim()
              .split('\n')
              .filter((pid) => pid.trim());
            pids.forEach((pid) => {
              try {
                console.log(`🧹 Killing process ${pid} on port ${port}`);
                process.kill(parseInt(pid), 'SIGTERM');
              } catch {
                // Process might already be dead
              }
            });
          }
          resolve();
        });
      });
    } catch {
      // lsof might not be available or no processes found
      console.log(`No cleanup needed for port ${port}`);
    }
  }
}

/**
 * Clean up temporary test files
 */
async function cleanupTempFiles() {
  try {
    const testDataDir = path.join(process.cwd(), 'tests/e2e/data');

    // Clean up any temporary files created during tests
    try {
      const files = await fs.readdir(testDataDir);
      for (const file of files) {
        if (file.startsWith('temp-') || file.startsWith('test-upload-')) {
          const filePath = path.join(testDataDir, file);
          await fs.unlink(filePath);
          console.log(`✓ Removed temp file: ${file}`);
        }
      }
    } catch {
      // Directory might not exist or be empty
      console.log('No temp files to clean up');
    }

    // Clean up any other test artifacts
    const artifactPaths = [
      path.join(process.cwd(), 'tests/e2e/.karenina-pids.json'),
      path.join(process.cwd(), 'karenina-server/server.log'),
    ];

    for (const artifactPath of artifactPaths) {
      try {
        await fs.access(artifactPath);
        await fs.unlink(artifactPath);
        console.log(`✓ Removed artifact: ${path.basename(artifactPath)}`);
      } catch {
        // File doesn't exist, that's fine
      }
    }
  } catch {
    console.log('Temp file cleanup error:', error);
  }
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default globalTeardown;
