/**
 * MSW handlers for verification endpoints
 */
import { http, HttpResponse } from 'msw';
import type { VerificationProgress, VerificationResult, SummaryStats } from '../../../types';

// Default mock verification result
export const mockVerificationResult: VerificationResult = {
  metadata: {
    question_id: 'q1',
    template_id: 'template-q1',
    result_id: 'result-q1-1',
    completed_without_errors: true,
    question_text: 'What is the capital of France?',
    answering_model: 'claude-haiku-4-5',
    parsing_model: 'claude-haiku-4-5',
    execution_time: 1.5,
    timestamp: new Date().toISOString(),
    run_name: 'test-run',
    job_id: 'job-123',
  },
  template: {
    raw_llm_response: 'The capital of France is Paris.',
    parsed_llm_response: { capital: 'Paris' },
    verify_result: { completed_without_errors: true, score: 1 },
  },
};

// Default mock progress
export const mockVerificationProgress: VerificationProgress = {
  job_id: 'job-123',
  status: 'completed',
  percentage: 100,
  current_question: 'q1',
  processed_count: 1,
  total_count: 1,
  successful_count: 1,
  failed_count: 0,
  start_time: Date.now() - 5000,
  duration_seconds: 5,
};

// Default mock summary stats
export const mockSummaryStats: SummaryStats = {
  num_results: 1,
  num_completed: 1,
  num_with_template: 1,
  num_with_rubric: 0,
  num_with_judgment: 0,
  num_questions: 1,
  num_models: 1,
  num_parsing_models: 1,
  num_replicates: 1,
  total_execution_time: 5,
  tokens: {
    total_input: 100,
    total_input_std: 0,
    total_output: 50,
    total_output_std: 0,
    template_input: 100,
    template_input_std: 0,
    template_output: 50,
    template_output_std: 0,
    rubric_input: 0,
    rubric_input_std: 0,
    rubric_output: 0,
    rubric_output_std: 0,
    median_per_question_input: 100,
    median_per_question_input_std: 0,
    median_per_question_output: 50,
    median_per_question_output_std: 0,
  },
  tokens_by_combo: {},
  completion_by_combo: {},
  template_pass_by_combo: {},
  template_pass_overall: {
    total: 1,
    passed: 1,
    pass_pct: 100,
  },
};

export const verificationHandlers = [
  // Start verification job
  http.post('/api/start-verification', () => {
    return HttpResponse.json({
      job_id: 'job-123',
      run_name: 'test-run',
      status: 'started',
    });
  }),

  // Get verification progress
  http.get('/api/verification-progress/:jobId', ({ params }) => {
    return HttpResponse.json({
      ...mockVerificationProgress,
      job_id: params.jobId as string,
      result_set: {
        'q1-claude-haiku-4-5-claude-haiku-4-5-1': mockVerificationResult,
      },
    });
  }),

  // Cancel verification job
  http.post('/api/cancel-verification/:jobId', () => {
    return HttpResponse.json({ success: true, message: 'Verification cancelled' });
  }),

  // Export verification results
  http.get('/api/export-verification/:jobId', ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('fmt') || 'json';

    if (format === 'csv') {
      return new HttpResponse('question_id,status,score\nq1,passed,1.0', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="results.csv"',
        },
      });
    }

    return HttpResponse.json({
      results: { 'q1-result': mockVerificationResult },
      summary: mockSummaryStats,
    });
  }),

  // Get all verification results
  http.get('/api/all-verification-results', () => {
    return HttpResponse.json({
      results: { 'q1-result': mockVerificationResult },
    });
  }),

  // Upload manual traces
  http.post('/api/upload-manual-traces', () => {
    return HttpResponse.json({
      success: true,
      traces_count: 1,
      message: 'Manual traces uploaded successfully',
    });
  }),

  // Verification summary
  http.post('/api/verification/summary', () => {
    return HttpResponse.json(mockSummaryStats);
  }),

  // Compare models
  http.post('/api/verification/compare-models', () => {
    return HttpResponse.json({
      model_summaries: {
        'claude-haiku-4-5': mockSummaryStats,
      },
      heatmap_data: [],
      question_token_data: [],
    });
  }),
];
