/**
 * MSW handlers for database operations
 */
import { http, HttpResponse } from 'msw';

export const mockBenchmarkList = [
  {
    name: 'test-benchmark-1',
    question_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    modified_at: '2024-01-02T00:00:00Z',
  },
  {
    name: 'test-benchmark-2',
    question_count: 25,
    created_at: '2024-01-03T00:00:00Z',
    modified_at: '2024-01-04T00:00:00Z',
  },
];

export const databaseHandlers = [
  // List benchmarks
  http.get('/api/database/benchmarks', () => {
    return HttpResponse.json({
      benchmarks: mockBenchmarkList,
    });
  }),

  // Load benchmark
  http.post('/api/database/load-benchmark', () => {
    return HttpResponse.json({
      success: true,
      checkpoint: {
        q1: {
          question: 'Sample question',
          raw_answer: 'Sample answer',
          answer_template: 'class Answer(BaseModel): pass',
          last_modified: new Date().toISOString(),
          finished: true,
        },
      },
      global_rubric: null,
      dataset_metadata: {
        name: 'Test Benchmark',
        description: 'A test benchmark',
      },
    });
  }),

  // Save benchmark
  http.post('/api/database/save-benchmark', () => {
    return HttpResponse.json({
      success: true,
      message: 'Benchmark saved successfully',
      duplicates: [],
    });
  }),

  // Resolve duplicates
  http.post('/api/database/resolve-duplicates', () => {
    return HttpResponse.json({
      success: true,
      message: 'Duplicates resolved',
    });
  }),

  // Delete benchmark
  http.delete('/api/database/delete-benchmark', () => {
    return HttpResponse.json({
      success: true,
      message: 'Benchmark deleted',
    });
  }),

  // Create benchmark
  http.post('/api/database/create-benchmark', () => {
    return HttpResponse.json({
      success: true,
      message: 'Benchmark created',
    });
  }),

  // Import results
  http.post('/api/database/import-results', () => {
    return HttpResponse.json({
      success: true,
      imported_count: 5,
    });
  }),

  // Delete database
  http.post('/api/database/delete', () => {
    return HttpResponse.json({
      success: true,
      message: 'Database deleted',
    });
  }),

  // List databases
  http.get('/api/database/list-databases', () => {
    return HttpResponse.json({
      databases: ['sqlite:///benchmarks.db', 'sqlite:///results.db'],
    });
  }),

  // Connect to database
  http.post('/api/database/connect', () => {
    return HttpResponse.json({
      success: true,
      message: 'Connected to database',
    });
  }),
];
