import { useRef, useCallback } from 'react';
import { VerificationProgress, VerificationResult } from '../types';

export interface VerificationWebSocketOptions {
  onProgressUpdate: (progress: VerificationProgress) => void;
  onJobCompleted: (jobId: string, results: Record<string, VerificationResult>) => void;
  onJobFailed: (error: string) => void;
  onJobCancelled: () => void;
}

export interface VerificationWebSocketReturn {
  connectProgressWebSocket: (jobId: string) => void;
  disconnectProgressWebSocket: () => void;
}

/**
 * Hook for managing WebSocket connection for verification progress.
 * Handles real-time progress updates during benchmark verification jobs.
 */
export function useVerificationWebSocket({
  onProgressUpdate,
  onJobCompleted,
  onJobFailed,
  onJobCancelled,
}: VerificationWebSocketOptions): VerificationWebSocketReturn {
  const websocketRef = useRef<WebSocket | null>(null);

  const disconnectProgressWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  const connectProgressWebSocket = useCallback(
    (jobId: string) => {
      // Disconnect any existing connection
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }

      try {
        // Determine WebSocket protocol based on current page protocol
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/verification-progress/${jobId}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected for verification job', jobId);
        };

        ws.onmessage = (event) => {
          try {
            const eventData = JSON.parse(event.data);

            // Handle different event types
            switch (eventData.type) {
              case 'snapshot':
              case 'job_started':
              case 'task_started':
              case 'task_completed':
                // Update progress
                onProgressUpdate({
                  job_id: eventData.job_id,
                  status: eventData.status,
                  percentage: eventData.percentage,
                  processed_count: eventData.processed,
                  total_count: eventData.total,
                  current_question: eventData.current_question || '',
                  start_time: eventData.start_time,
                  duration_seconds: eventData.duration_seconds,
                  last_task_duration: eventData.last_task_duration,
                  in_progress_questions: eventData.in_progress_questions || [],
                  successful_count: 0,
                  failed_count: 0,
                });
                break;

              case 'job_completed':
                // Update progress to show completed status
                onProgressUpdate({
                  job_id: jobId,
                  status: 'completed',
                  percentage: 100,
                  in_progress_questions: [],
                  current_question: '',
                  processed_count: eventData.processed || 0,
                  total_count: eventData.total || 0,
                  successful_count: 0,
                  failed_count: 0,
                });

                // Fetch final results
                fetch(`/api/verification-progress/${jobId}`)
                  .then((res) => res.json())
                  .then(async (data) => {
                    // Check for error in response
                    if (data.error) {
                      console.error('Verification failed with error:', data.error);
                      onJobFailed(data.error);
                      disconnectProgressWebSocket();
                      return;
                    }

                    // Handle verification results - server returns VerificationResultSet with results array
                    if (data.result_set) {
                      const sanitizedResults: Record<string, VerificationResult> = {};

                      // Primary format: VerificationResultSet with results array
                      // Check this FIRST because { results: [...] } is also an object
                      if (data.result_set.results && Array.isArray(data.result_set.results)) {
                        console.log('Setting results from array:', data.result_set.results.length, 'items');
                        for (const result of data.result_set.results) {
                          if (result && typeof result === 'object' && result.metadata) {
                            const key = `${result.metadata.question_id}_${result.metadata.answering_model}_${result.metadata.parsing_model}${
                              result.metadata.replicate != null ? `_rep${result.metadata.replicate}` : ''
                            }`;
                            sanitizedResults[key] = result as VerificationResult;
                          } else {
                            console.warn('Skipping malformed result in array:', result);
                          }
                        }
                      }
                      // Fallback format: flat dict with backend-generated keys
                      else if (typeof data.result_set === 'object' && !Array.isArray(data.result_set)) {
                        console.log('Setting results from dict:', Object.keys(data.result_set).length, 'items');
                        for (const [key, result] of Object.entries(data.result_set)) {
                          if (result && typeof result === 'object' && 'metadata' in (result as object)) {
                            sanitizedResults[key] = result as VerificationResult;
                          } else {
                            console.warn('Skipping malformed result entry:', key, result);
                          }
                        }
                      }

                      onJobCompleted(jobId, sanitizedResults);
                    }
                    disconnectProgressWebSocket();
                  })
                  .catch((err) => {
                    console.error('Failed to fetch final results:', err);
                    onJobFailed('Failed to fetch final results');
                    disconnectProgressWebSocket();
                  });
                break;

              case 'job_failed':
                onJobFailed(eventData.error || 'Verification failed');
                disconnectProgressWebSocket();
                break;

              case 'job_cancelled':
                onJobCancelled();
                disconnectProgressWebSocket();
                break;

              default:
                console.warn('Unknown WebSocket event type:', eventData.type);
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
          websocketRef.current = null;
        };

        websocketRef.current = ws;
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
      }
    },
    [onProgressUpdate, onJobCompleted, onJobFailed, onJobCancelled, disconnectProgressWebSocket]
  );

  return {
    connectProgressWebSocket,
    disconnectProgressWebSocket,
  };
}
