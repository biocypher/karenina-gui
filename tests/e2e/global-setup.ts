import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TEST_CONFIG, getHealthUrl } from './test-config';

// Global state for process management
let frontendProcess: ChildProcess | null = null;
let backendProcess: ChildProcess | null = null;
const pidFilePath = path.join(process.cwd(), 'tests/e2e/.karenina-pids.json');

/**
 * Global setup function for Playwright E2E tests
 * Starts the full Karenina stack (frontend + backend) before running tests
 */
async function globalSetup() {
  console.log('🚀 Starting Karenina E2E setup...');
  
  try {
    // Ensure we're in the right directory
    const currentDir = process.cwd();
    console.log(`Current directory: ${currentDir}`);
    
    // Change to project root if we're in karenina-gui
    let workingDir = currentDir;
    if (currentDir.endsWith('karenina-gui')) {
      workingDir = path.dirname(currentDir);
      process.chdir(workingDir);
      console.log(`Changed to project root: ${workingDir}`);
    }

    // Check if start-karenina.sh exists
    const startupScriptPath = path.join(workingDir, 'start-karenina.sh');
    try {
      await fs.access(startupScriptPath);
      console.log(`✓ Found startup script: ${startupScriptPath}`);
    } catch (error) {
      throw new Error(`Startup script not found: ${startupScriptPath}`);
    }

    // Clean up any existing processes
    await cleanupExistingProcesses();
    
    // Additional cleanup: ensure ports are free
    await killProcessesOnPorts([5173, 8080]);
    await sleep(2000); // Give time for ports to be freed

    // Create clean environment (remove conflicting variables)
    const cleanEnv = { ...process.env };
    delete cleanEnv.VIRTUAL_ENV;
    delete cleanEnv.PYTHONPATH;
    
    console.log('Starting frontend development server...');
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(workingDir, 'karenina-gui'),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: cleanEnv
    });

    if (!frontendProcess.pid) {
      throw new Error('Failed to start frontend process');
    }

    console.log(`✓ Started frontend process with PID: ${frontendProcess.pid}`);

    console.log('Starting backend development server with direct function calls...');
    
    // Create a temporary Python script that directly calls the server function
    const tempScriptPath = path.join(workingDir, 'temp-start-backend.py');
    const pythonScript = `
import sys
import os

# Set up environment
os.environ['KARENINA_WEBAPP_DIR'] = "${path.join(workingDir, 'karenina-gui')}"

# Add the karenina-server source to Python path
sys.path.insert(0, "${path.join(workingDir, 'karenina-server/src')}")

try:
    print("🐍 Starting backend server via direct function call...")
    print(f"🐍 KARENINA_WEBAPP_DIR = {os.environ.get('KARENINA_WEBAPP_DIR')}")
    
    from karenina_server.cli import serve_webapp
    print("🐍 Successfully imported serve_webapp")
    
    # Call the function directly with parameters (dev=False for backend server)
    serve_webapp(
        host='localhost', 
        port=8080, 
        dev=False, 
        webapp_dir="${path.join(workingDir, 'karenina-gui')}"
    )
except Exception as e:
    print(f"🐍 Error starting backend: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;

    // Write the temporary script
    await fs.writeFile(tempScriptPath, pythonScript);
    console.log(`✓ Created temp Python script: ${tempScriptPath}`);

    // Use the virtual environment Python to run our script
    const pythonPath = path.join(workingDir, 'karenina-server/.venv/bin/python');
    console.log(`Backend command: ${pythonPath} ${tempScriptPath}`);

    backendProcess = spawn(pythonPath, [tempScriptPath], {
      cwd: path.join(workingDir, 'karenina-server'),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: cleanEnv
    });

    if (!backendProcess.pid) {
      throw new Error('Failed to start backend process');
    }

    console.log(`✓ Started backend process with PID: ${backendProcess.pid}`);

    // Store PIDs for cleanup
    await storePids({
      frontend: frontendProcess.pid,
      backend: backendProcess.pid,
      timestamp: new Date().toISOString()
    });

    // Set up process event handlers
    frontendProcess.on('error', (error) => {
      console.error('Frontend process error:', error);
    });

    backendProcess.on('error', (error) => {
      console.error('Backend process error:', error);
    });

    // Enhanced logging for debugging
    console.log('📄 Setting up process logging...');
    
    if (frontendProcess.stdout) {
      frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Log important frontend messages
        if (output.includes('ready') || output.includes('Local:') || output.includes('ERROR') || output.includes('FAIL')) {
          console.log('📄 Frontend output:', output.trim());
        }
      });
    }

    if (frontendProcess.stderr) {
      frontendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('📄 Frontend stderr:', output.trim());
      });
    }

    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Log all backend output since we need to debug startup issues
        console.log('📄 Backend stdout:', output.trim());
      });
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('📄 Backend stderr:', output.trim());
      });
    }

    // Add process exit handlers for better error reporting
    frontendProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.error(`❌ Frontend process exited with code ${code}, signal ${signal}`);
      }
    });

    backendProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.error(`❌ Backend process exited with code ${code}, signal ${signal}`);
      }
    });

    // Wait for servers to be ready
    console.log('⏳ Waiting for servers to be ready...');
    await waitForServers();
    
    console.log('✅ Karenina E2E setup completed successfully');
    
    // Return teardown function
    return async () => {
      console.log('🧹 Running E2E teardown...');
      await cleanup();
    };

  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    await cleanup(); // Clean up on failure
    throw error;
  }
}

/**
 * Wait for both frontend and backend servers to be ready
 */
async function waitForServers() {
  const { timeouts } = TEST_CONFIG;
  const maxRetries = timeouts.serverHealthRetries;
  const retryDelay = timeouts.serverHealth;

  // Wait for frontend server (port 5173)
  console.log('⏳ Waiting for frontend server...');
  await waitForServer('frontend', maxRetries, retryDelay);
  console.log('✓ Frontend server is ready');

  // Wait for backend server (port 8080)
  console.log('⏳ Waiting for backend server...');
  await waitForServer('backend', maxRetries, retryDelay);
  console.log('✓ Backend server is ready');
}

/**
 * Wait for a specific server to be ready
 */
async function waitForServer(serverKey: keyof typeof TEST_CONFIG.servers, maxRetries: number, retryDelay: number) {
  const healthUrl = getHealthUrl(serverKey);
  console.log(`Checking health for ${serverKey} at ${healthUrl}`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(healthUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout per request
      });
      
      console.log(`${serverKey} health check attempt ${i + 1}: status ${response.status}`);
      
      if (response.ok) {
        console.log(`✓ ${serverKey} server responded successfully`);
        return; // Server is ready
      } else {
        // Log response details for non-2xx responses
        try {
          const responseText = await response.text();
          console.log(`${serverKey} health check failed with status ${response.status}. Response: ${responseText.substring(0, 200)}`);
        } catch (e) {
          console.log(`${serverKey} health check failed with status ${response.status}. Could not read response.`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`${serverKey} health check attempt ${i + 1} failed: ${errorMsg}`);
    }
    
    if (i < maxRetries - 1) {
      console.log(`⏳ Server ${serverKey} not ready, retrying in ${retryDelay/1000}s... (${i + 1}/${maxRetries})`);
      await sleep(retryDelay);
    }
  }
  
  throw new Error(`Server ${serverKey} failed to start after ${maxRetries} retries`);
}

/**
 * Store process PIDs for cleanup
 */
async function storePids(pids: any) {
  try {
    await fs.writeFile(pidFilePath, JSON.stringify(pids, null, 2));
  } catch (error) {
    console.warn('Failed to store PIDs:', error);
  }
}

/**
 * Clean up any existing processes from previous runs
 */
async function cleanupExistingProcesses() {
  try {
    const pidsData = await fs.readFile(pidFilePath, 'utf-8');
    const pids = JSON.parse(pidsData);
    
    // Clean up frontend process
    if (pids.frontend) {
      console.log(`🧹 Cleaning up existing frontend process: ${pids.frontend}`);
      try {
        process.kill(-pids.frontend, 'SIGTERM');
        await sleep(1000);
        process.kill(-pids.frontend, 'SIGKILL');
      } catch (error) {
        console.log('Frontend process cleanup (expected if already dead)');
      }
    }
    
    // Clean up backend process
    if (pids.backend) {
      console.log(`🧹 Cleaning up existing backend process: ${pids.backend}`);
      try {
        process.kill(-pids.backend, 'SIGTERM');
        await sleep(1000);
        process.kill(-pids.backend, 'SIGKILL');
      } catch (error) {
        console.log('Backend process cleanup (expected if already dead)');
      }
    }
    
    // Legacy cleanup for old PID format
    if (pids.main) {
      console.log(`🧹 Cleaning up existing legacy process: ${pids.main}`);
      try {
        process.kill(-pids.main, 'SIGTERM');
        await sleep(1000);
        process.kill(-pids.main, 'SIGKILL');
      } catch (error) {
        console.log('Legacy process cleanup (expected if already dead)');
      }
    }
    
    // Remove PID file
    await fs.unlink(pidFilePath);
  } catch (error) {
    // No existing PID file or process, that's fine
  }
}

/**
 * Cleanup function to kill processes and clean up files
 */
async function cleanup() {
  console.log('🧹 Cleaning up Karenina processes...');
  
  try {
    // Clean up frontend process
    if (frontendProcess && frontendProcess.pid) {
      console.log(`Killing frontend process: ${frontendProcess.pid}`);
      try {
        process.kill(-frontendProcess.pid, 'SIGTERM');
        await sleep(2000);
        process.kill(-frontendProcess.pid, 'SIGKILL');
      } catch (error) {
        console.log('Frontend cleanup error (expected if already dead):', error);
      }
      frontendProcess = null;
    }

    // Clean up backend process
    if (backendProcess && backendProcess.pid) {
      console.log(`Killing backend process: ${backendProcess.pid}`);
      try {
        process.kill(-backendProcess.pid, 'SIGTERM');
        await sleep(2000);
        process.kill(-backendProcess.pid, 'SIGKILL');
      } catch (error) {
        console.log('Backend cleanup error (expected if already dead):', error);
      }
      backendProcess = null;
    }

    // Clean up PID file
    try {
      await fs.unlink(pidFilePath);
    } catch (error) {
      // File might not exist, ignore
    }

    // Clean up temporary Python script
    try {
      const tempScriptPath = path.join(process.cwd().replace('/karenina-gui', ''), 'temp-start-backend.py');
      await fs.unlink(tempScriptPath);
      console.log('✓ Cleaned up temporary Python script');
    } catch (error) {
      // File might not exist, ignore
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

/**
 * Kill any processes running on the specified ports
 */
async function killProcessesOnPorts(ports: number[]) {
  for (const port of ports) {
    try {
      console.log(`🧹 Checking for processes on port ${port}...`);
      
      // Use lsof to find processes on the port
      const lsof = spawn('lsof', ['-ti', `:${port}`], { stdio: ['pipe', 'pipe', 'pipe'] });
      
      let output = '';
      lsof.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      await new Promise<void>((resolve) => {
        lsof.on('close', (code: number) => {
          if (code === 0 && output.trim()) {
            // Found processes, kill them
            const pids = output.trim().split('\n').filter(pid => pid.trim());
            pids.forEach(pid => {
              try {
                console.log(`🧹 Killing process ${pid} on port ${port}`);
                process.kill(parseInt(pid), 'SIGTERM');
              } catch (error) {
                // Process might already be dead
              }
            });
          }
          resolve();
        });
      });
    } catch (error) {
      // lsof might not be available or no processes found
      console.log(`No cleanup needed for port ${port}`);
    }
  }
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default globalSetup;