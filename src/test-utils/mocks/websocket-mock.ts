/**
 * WebSocket mock utilities for testing real-time progress updates
 *
 * Provides a MockWebSocket class and utilities for simulating
 * verification and template generation WebSocket events in tests.
 */
// WebSocket mock utilities - no vitest imports needed

/**
 * WebSocket event types used by the application
 */
export type WebSocketEventType =
  | 'snapshot'
  | 'job_started'
  | 'task_started'
  | 'task_completed'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled';

/**
 * Base structure for WebSocket events
 */
export interface WebSocketEvent {
  type: WebSocketEventType;
  job_id: string;
  status?: string;
  percentage?: number;
  processed?: number;
  total?: number;
  current_question?: string;
  start_time?: number;
  duration_seconds?: number;
  last_task_duration?: number;
  in_progress_questions?: string[];
  error?: string;
}

/**
 * Mock WebSocket implementation for testing
 */
export class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = MockWebSocket.CONNECTING;
  readonly OPEN = MockWebSocket.OPEN;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CLOSED = MockWebSocket.CLOSED;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Auto-connect after a microtask (simulates async connection)
    queueMicrotask(() => {
      this.simulateOpen();
    });
  }

  /**
   * Simulate connection opening
   */
  simulateOpen(): void {
    if (this.readyState === MockWebSocket.CONNECTING) {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
      // Flush any queued messages
      this.messageQueue.forEach((data) => this.simulateMessage(data));
      this.messageQueue = [];
    }
  }

  /**
   * Simulate receiving a message
   */
  simulateMessage(data: string | object): void {
    const messageData = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.readyState !== MockWebSocket.OPEN) {
      // Queue message if not yet open
      this.messageQueue.push(messageData);
      return;
    }

    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: messageData }));
    }
  }

  /**
   * Simulate an error
   */
  simulateError(error?: Error): void {
    if (this.onerror) {
      const event = new Event('error');
      if (error) {
        Object.defineProperty(event, 'error', { value: error });
      }
      this.onerror(event);
    }
  }

  /**
   * Simulate connection closing
   */
  simulateClose(code = 1000, reason = ''): void {
    if (this.readyState !== MockWebSocket.CLOSED) {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    }
  }

  /**
   * Close the connection (called by application code)
   */
  close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.OPEN || this.readyState === MockWebSocket.CONNECTING) {
      this.readyState = MockWebSocket.CLOSING;
      queueMicrotask(() => {
        this.simulateClose(code ?? 1000, reason ?? '');
      });
    }
  }

  /**
   * Send data (no-op in mock, but tracks that it was called)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(data: string): void {
    // In production WebSockets, this would send data to server
    // For our mock, we just ignore it as the app doesn't send WS messages
  }
}

/**
 * Registry for tracking all created MockWebSocket instances
 */
export class MockWebSocketServer {
  private connections: Map<string, MockWebSocket> = new Map();
  private originalWebSocket: typeof WebSocket | undefined;
  private installed = false;

  /**
   * Install the mock WebSocket globally
   */
  install(): void {
    if (this.installed) return;

    this.originalWebSocket = globalThis.WebSocket;
    const connections = this.connections;

    // Replace global WebSocket with mock
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        connections.set(url, this);
      }
    } as unknown as typeof WebSocket;

    this.installed = true;
  }

  /**
   * Uninstall the mock and restore original WebSocket
   */
  uninstall(): void {
    if (!this.installed) return;

    // Close all connections
    this.connections.forEach((ws) => ws.simulateClose());
    this.connections.clear();

    // Restore original WebSocket
    if (this.originalWebSocket) {
      globalThis.WebSocket = this.originalWebSocket;
    }

    this.installed = false;
  }

  /**
   * Get a connection by URL pattern
   */
  getConnection(urlPattern: string | RegExp): MockWebSocket | undefined {
    for (const [url, ws] of this.connections) {
      if (typeof urlPattern === 'string') {
        if (url.includes(urlPattern)) return ws;
      } else {
        if (urlPattern.test(url)) return ws;
      }
    }
    return undefined;
  }

  /**
   * Get all connections
   */
  getAllConnections(): MockWebSocket[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get verification WebSocket connection
   */
  getVerificationConnection(jobId?: string): MockWebSocket | undefined {
    const pattern = jobId ? new RegExp(`/ws/verification-progress/${jobId}`) : /\/ws\/verification-progress\//;
    return this.getConnection(pattern);
  }

  /**
   * Get template generation WebSocket connection
   */
  getTemplateConnection(jobId?: string): MockWebSocket | undefined {
    const pattern = jobId ? new RegExp(`/ws/generation-progress/${jobId}`) : /\/ws\/generation-progress\//;
    return this.getConnection(pattern);
  }

  /**
   * Emit an event to a specific connection
   */
  emitToConnection(ws: MockWebSocket, event: WebSocketEvent): void {
    ws.simulateMessage(event);
  }

  /**
   * Emit verification progress event
   */
  emitVerificationEvent(event: WebSocketEvent, jobId?: string): void {
    const ws = this.getVerificationConnection(jobId);
    if (ws) {
      this.emitToConnection(ws, event);
    }
  }

  /**
   * Emit template generation progress event
   */
  emitTemplateEvent(event: WebSocketEvent, jobId?: string): void {
    const ws = this.getTemplateConnection(jobId);
    if (ws) {
      this.emitToConnection(ws, event);
    }
  }

  /**
   * Clear all connections (useful between tests)
   */
  clearConnections(): void {
    this.connections.forEach((ws) => ws.simulateClose());
    this.connections.clear();
  }
}

// Singleton instance for easy use in tests
let mockServerInstance: MockWebSocketServer | null = null;

/**
 * Get the singleton MockWebSocketServer instance
 */
export function getMockWebSocketServer(): MockWebSocketServer {
  if (!mockServerInstance) {
    mockServerInstance = new MockWebSocketServer();
  }
  return mockServerInstance;
}

/**
 * Setup helper for vitest - call in beforeEach
 */
export function setupWebSocketMock(): MockWebSocketServer {
  const server = getMockWebSocketServer();
  server.install();
  return server;
}

/**
 * Teardown helper for vitest - call in afterEach
 */
export function teardownWebSocketMock(): void {
  const server = getMockWebSocketServer();
  server.uninstall();
}

/**
 * Create a verification progress event sequence
 * Useful for simulating a complete verification job
 */
export function createVerificationProgressSequence(
  jobId: string,
  questionIds: string[],
  options: {
    delayMs?: number;
    includeFailure?: boolean;
    failureError?: string;
  } = {}
): WebSocketEvent[] {
  const { includeFailure = false, failureError = 'Verification failed' } = options;
  const total = questionIds.length;
  const events: WebSocketEvent[] = [];

  // Job started
  events.push({
    type: 'job_started',
    job_id: jobId,
    status: 'running',
    percentage: 0,
    processed: 0,
    total,
    start_time: Date.now() / 1000,
    in_progress_questions: [],
  });

  // Progress events for each question
  questionIds.forEach((qId, index) => {
    // Task started
    events.push({
      type: 'task_started',
      job_id: jobId,
      status: 'running',
      percentage: Math.round((index / total) * 100),
      processed: index,
      total,
      current_question: qId,
      in_progress_questions: [qId],
    });

    // Task completed
    events.push({
      type: 'task_completed',
      job_id: jobId,
      status: 'running',
      percentage: Math.round(((index + 1) / total) * 100),
      processed: index + 1,
      total,
      current_question: qId,
      last_task_duration: 0.5,
      in_progress_questions: [],
    });
  });

  // Final event
  if (includeFailure) {
    events.push({
      type: 'job_failed',
      job_id: jobId,
      error: failureError,
    });
  } else {
    events.push({
      type: 'job_completed',
      job_id: jobId,
      status: 'completed',
      percentage: 100,
      processed: total,
      total,
    });
  }

  return events;
}

/**
 * Create a template generation progress event sequence
 */
export function createTemplateProgressSequence(
  jobId: string,
  questionIds: string[],
  options: {
    includeFailure?: boolean;
    failureError?: string;
  } = {}
): WebSocketEvent[] {
  // Template generation uses same event structure as verification
  return createVerificationProgressSequence(jobId, questionIds, options);
}

/**
 * Emit an event sequence with optional delays
 * Returns a promise that resolves when all events are emitted
 */
export async function emitEventSequence(ws: MockWebSocket, events: WebSocketEvent[], delayMs = 0): Promise<void> {
  for (const event of events) {
    ws.simulateMessage(event);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Helper to wait for WebSocket to be connected
 */
export async function waitForConnection(
  server: MockWebSocketServer,
  urlPattern: string | RegExp,
  timeoutMs = 1000
): Promise<MockWebSocket> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const ws = server.getConnection(urlPattern);
    if (ws && ws.readyState === MockWebSocket.OPEN) {
      return ws;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`WebSocket connection not found for pattern: ${urlPattern}`);
}
