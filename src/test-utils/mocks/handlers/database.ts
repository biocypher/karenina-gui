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
  // List benchmarks (v2: GET /api/v2/benchmarks)
  http.get('/api/v2/benchmarks', () => {
    return HttpResponse.json({
      benchmarks: mockBenchmarkList,
    });
  }),

  // Load benchmark (v2: GET /api/v2/benchmarks/:name - method changed from POST to GET)
  http.get('/api/v2/benchmarks/:name', ({ params }) => {
    const { name } = params;
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
        name: name || 'Test Benchmark',
        description: 'A test benchmark',
      },
    });
  }),

  // Save benchmark (v2: PUT /api/v2/benchmarks/:name - method changed from POST to PUT)
  http.put('/api/v2/benchmarks/:name', () => {
    return HttpResponse.json({
      success: true,
      message: 'Benchmark saved successfully',
      duplicates: [],
    });
  }),

  // Resolve duplicates (v2: POST /api/v2/benchmarks/:name/duplicates)
  http.post('/api/v2/benchmarks/:name/duplicates', () => {
    return HttpResponse.json({
      success: true,
      message: 'Duplicates resolved',
    });
  }),

  // Delete benchmark (v2: DELETE /api/v2/benchmarks/:name)
  http.delete('/api/v2/benchmarks/:name', () => {
    return HttpResponse.json({
      success: true,
      message: 'Benchmark deleted',
    });
  }),

  // Create benchmark (v2: POST /api/v2/benchmarks)
  http.post('/api/v2/benchmarks', () => {
    return HttpResponse.json({
      success: true,
      message: 'Benchmark created',
    });
  }),

  // Import results (v2: POST /api/v2/benchmarks/:name/results)
  http.post('/api/v2/benchmarks/:name/results', () => {
    return HttpResponse.json({
      success: true,
      imported_count: 5,
    });
  }),

  // Delete database (v2: DELETE /api/v2/databases - method changed from POST to DELETE)
  http.delete('/api/v2/databases', () => {
    return HttpResponse.json({
      success: true,
      message: 'Database deleted',
    });
  }),

  // List databases (v2: GET /api/v2/databases)
  http.get('/api/v2/databases', () => {
    return HttpResponse.json({
      databases: ['sqlite:///benchmarks.db', 'sqlite:///results.db'],
    });
  }),

  // Connect to database (v2: POST /api/v2/databases/connections)
  http.post('/api/v2/databases/connections', () => {
    return HttpResponse.json({
      success: true,
      message: 'Connected to database',
    });
  }),
];
