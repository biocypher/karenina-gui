/**
 * Centralized configuration for E2E tests
 */

export const TEST_CONFIG = {
  // Server configuration
  servers: {
    frontend: {
      port: 5173,
      url: 'http://localhost:5173',
      healthPath: '/',
    },
    backend: {
      port: 8080,
      url: 'http://localhost:8080',
      healthPath: '/api/timestamp',
    },
  },

  // Timeouts in milliseconds
  timeouts: {
    serverStart: 30000, // 30 seconds to start servers
    serverHealth: 5000, // 5 seconds between health checks
    serverHealthRetries: 12, // 12 retries = 1 minute total
    testTimeout: 60000, // 60 seconds per test
    longOperation: 15000, // 15 seconds for file operations
    mediumOperation: 10000, // 10 seconds for API calls
    shortOperation: 5000, // 5 seconds for UI interactions
  },

  // File paths
  paths: {
    projectRoot: process.cwd().replace('/karenina-gui', ''), // Remove gui suffix if present
    startupScript: '../start-karenina.sh',
    testDataDir: './tests/e2e/data',
  },

  // Process management
  processes: {
    startupCommand: '../start-karenina.sh',
    startupArgs: ['--dev', '--host', 'localhost', '--port', '8080'],
    killTimeout: 10000, // 10 seconds to kill processes
  },
} as const;

// Utility type for server keys
export type ServerKey = keyof typeof TEST_CONFIG.servers;

// Helper functions
export const getServerUrl = (server: ServerKey): string => {
  return TEST_CONFIG.servers[server].url;
};

export const getHealthUrl = (server: ServerKey): string => {
  const serverConfig = TEST_CONFIG.servers[server];
  return `${serverConfig.url}${serverConfig.healthPath}`;
};
