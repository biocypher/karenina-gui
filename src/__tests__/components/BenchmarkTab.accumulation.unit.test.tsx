import { describe, it, expect } from 'vitest';

describe('BenchmarkTab - Results Accumulation Issue', () => {
  it('FAILING: Using spread operator with same question_id overwrites instead of accumulates', () => {
    // This test demonstrates the core issue with the current implementation

    // Initial results state
    const prevResults = {
      q1: {
        question_id: 'q1',
        question_text: 'What is 2+2?',
        completed_without_errors: true,
        run_name: 'foo',
        timestamp: '2023-01-01T00:01:00Z',
        job_id: 'job-1',
        answering_model: 'gpt-4',
        parsing_model: 'gpt-4',
        execution_time: 1.0,
      },
    };

    // New results from second run with same question_id
    const newResults = {
      q1: {
        question_id: 'q1',
        question_text: 'What is 2+2?',
        completed_without_errors: true,
        run_name: 'bar', // Different run name!
        timestamp: '2023-01-01T00:02:00Z',
        job_id: 'job-2',
        answering_model: 'gpt-4',
        parsing_model: 'gpt-4',
        execution_time: 0.8,
      },
    };

    // Current implementation: setResults(prev => ({ ...prev, ...sanitizedResults }))
    const currentImplementationResult = { ...prevResults, ...newResults };

    // This is what happens - the second run OVERWRITES the first run
    expect(Object.keys(currentImplementationResult).length).toBe(1); // Still only 1 result!
    expect(currentImplementationResult['q1'].run_name).toBe('bar'); // foo is lost!

    // What we WANT: Both results should be preserved
    // We need a different keying strategy, perhaps using a composite key like `${question_id}_${job_id}`
    const desiredResult = {
      'q1_job-1': prevResults['q1'],
      'q1_job-2': newResults['q1'],
    };

    expect(Object.keys(desiredResult).length).toBe(2); // Should have 2 results
    expect(desiredResult['q1_job-1'].run_name).toBe('foo'); // First run preserved
    expect(desiredResult['q1_job-2'].run_name).toBe('bar'); // Second run added
  });

  it('Proposed solution: Use composite key with question_id, job_id, and timestamp', () => {
    // This test shows how the fix should work

    const prevResults = {};

    // First run results
    const firstRunResults = {
      q1: {
        question_id: 'q1',
        job_id: 'job-1',
        run_name: 'foo',
        timestamp: '2023-01-01T00:01:00Z',
        // ... other fields
      },
    };

    // Transform to use composite key with timestamp
    const transformedFirstRun = {};
    Object.entries(firstRunResults).forEach(([, result]) => {
      const timestamp = result.timestamp || new Date().toISOString();
      const compositeKey = `${result.question_id}_${result.job_id}_${timestamp}`;
      transformedFirstRun[compositeKey] = result;
    });

    // Add first run
    const afterFirstRun = { ...prevResults, ...transformedFirstRun };
    expect(Object.keys(afterFirstRun).length).toBe(1);

    // Second run results (same question)
    const secondRunResults = {
      q1: {
        question_id: 'q1',
        job_id: 'job-2',
        run_name: 'bar',
        timestamp: '2023-01-01T00:02:00Z',
        // ... other fields
      },
    };

    // Transform to use composite key with timestamp
    const transformedSecondRun = {};
    Object.entries(secondRunResults).forEach(([, result]) => {
      const timestamp = result.timestamp || new Date().toISOString();
      const compositeKey = `${result.question_id}_${result.job_id}_${timestamp}`;
      transformedSecondRun[compositeKey] = result;
    });

    // Add second run
    const afterSecondRun = { ...afterFirstRun, ...transformedSecondRun };

    // Now we have both results!
    expect(Object.keys(afterSecondRun).length).toBe(2);
    expect(afterSecondRun['q1_job-1_2023-01-01T00:01:00Z'].run_name).toBe('foo');
    expect(afterSecondRun['q1_job-2_2023-01-01T00:02:00Z'].run_name).toBe('bar');
  });
});
