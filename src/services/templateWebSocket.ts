/**
 * Template Generation WebSocket Service
 * Manages WebSocket connection for real-time template generation progress updates
 */

import type { TemplateGenerationProgress } from '../types';
import { logger } from '../utils/logger';

/**
 * Progress update callback type
 */
export type ProgressUpdateCallback = (progress: TemplateGenerationProgress) => void;

/**
 * Completion callback type
 */
export type CompletionCallback = (result: { templates: Record<string, unknown> }) => void;

/**
 * Failure callback type
 */
export type FailureCallback = (error: string) => void;

/**
 * WebSocket event handlers
 */
export interface TemplateWebSocketHandlers {
  onProgressUpdate: ProgressUpdateCallback;
  onCompleted: CompletionCallback;
  onFailed: FailureCallback;
  onCancelled?: () => void;
}

/**
 * Template generation WebSocket manager
 * Handles connection, message parsing, and automatic reconnection
 */
export class TemplateGenerationWebSocket {
  private ws: WebSocket | null = null;
  private jobId: string | null = null;
  private handlers: TemplateWebSocketHandlers | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;

  /**
   * Connect to the WebSocket for progress updates
   */
  connect(jobId: string, handlers: TemplateWebSocketHandlers): void {
    this.jobId = jobId;
    this.handlers = handlers;

    // Disconnect any existing connection
    this.disconnect();

    try {
      // Determine WebSocket protocol based on current page protocol
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/generation-progress/${jobId}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info('WEBSOCKET', `WebSocket connected for job ${jobId}`, 'TemplateGenerationWebSocket');
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => this.handleMessage(event);

      this.ws.onerror = (error) => {
        logger.error('WEBSOCKET', 'WebSocket error', 'TemplateGenerationWebSocket', { error });
      };

      this.ws.onclose = () => {
        logger.info('WEBSOCKET', `WebSocket closed for job ${jobId}`, 'TemplateGenerationWebSocket');
        this.ws = null;
      };
    } catch (err) {
      logger.error('WEBSOCKET', 'Failed to create WebSocket connection', 'TemplateGenerationWebSocket', { error: err });
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    if (!this.handlers || !this.jobId) return;

    try {
      const eventData = JSON.parse(event.data);

      // Handle different event types
      switch (eventData.type) {
        case 'snapshot':
        case 'job_started':
        case 'task_started':
        case 'task_completed':
          // Update progress
          this.handlers.onProgressUpdate({
            job_id: eventData.job_id,
            status: eventData.status,
            percentage: eventData.percentage,
            processed_count: eventData.processed,
            total_count: eventData.total,
            current_question: eventData.current_question || '',
            start_time: eventData.start_time, // Unix timestamp for live clock
            duration_seconds: eventData.duration_seconds,
            last_task_duration: eventData.last_task_duration,
            in_progress_questions: eventData.in_progress_questions || [],
          });
          break;

        case 'job_completed':
          // Update progress to show completed status
          this.handlers.onProgressUpdate({
            job_id: this.jobId,
            status: 'completed',
            percentage: 100,
            in_progress_questions: [],
            current_question: '',
          } as TemplateGenerationProgress);

          // Fetch final result
          this.fetchFinalResult(this.jobId);
          break;

        case 'job_failed':
          this.handlers.onFailed(eventData.error || 'Generation failed');
          this.disconnect();
          break;

        case 'job_cancelled':
          this.handlers.onProgressUpdate({
            job_id: this.jobId,
            status: 'cancelled',
          } as TemplateGenerationProgress);
          this.handlers.onCancelled?.();
          this.disconnect();
          break;

        default:
          logger.warning('WEBSOCKET', `Unknown WebSocket event type: ${eventData.type}`, 'TemplateGenerationWebSocket');
      }
    } catch (err) {
      logger.error('WEBSOCKET', 'Failed to parse WebSocket message', 'TemplateGenerationWebSocket', { error: err });
    }
  }

  /**
   * Fetch the final result after job completion
   */
  private fetchFinalResult(jobId: string): void {
    if (!this.handlers) return;

    fetch(`/api/generation-progress/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          this.handlers?.onCompleted(data.result);
        }
        this.disconnect();
      })
      .catch((err) => {
        logger.error('Failed to fetch final result:', err);
        this.disconnect();
      });
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        logger.error('Error closing WebSocket:', err);
      }
      this.ws = null;
    }
  }

  /**
   * Check if the WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance for template generation
let templateWebSocketInstance: TemplateGenerationWebSocket | null = null;

/**
 * Get the singleton TemplateGenerationWebSocket instance
 */
export function getTemplateWebSocket(): TemplateGenerationWebSocket {
  if (!templateWebSocketInstance) {
    templateWebSocketInstance = new TemplateGenerationWebSocket();
  }
  return templateWebSocketInstance;
}

/**
 * Connect to the template generation progress WebSocket
 * Convenience function that uses the singleton instance
 */
export function connectTemplateProgressWebSocket(jobId: string, handlers: TemplateWebSocketHandlers): void {
  getTemplateWebSocket().connect(jobId, handlers);
}

/**
 * Disconnect the template generation progress WebSocket
 * Convenience function that uses the singleton instance
 */
export function disconnectTemplateProgressWebSocket(): void {
  getTemplateWebSocket().disconnect();
}

/**
 * Check if the template generation WebSocket is connected
 * Convenience function that uses the singleton instance
 */
export function isTemplateWebSocketConnected(): boolean {
  return getTemplateWebSocket().isConnected();
}
