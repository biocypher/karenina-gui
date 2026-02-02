/**
 * MSW handlers for rubric endpoints
 */
import { http, HttpResponse } from 'msw';

export const mockRubric = {
  llm_traits: [
    {
      name: 'accuracy',
      description: 'Is the response factually accurate?',
      kind: 'boolean' as const,
      min_score: null,
      max_score: null,
    },
    {
      name: 'completeness',
      description: 'How complete is the response?',
      kind: 'score' as const,
      min_score: 1,
      max_score: 5,
    },
  ],
  regex_traits: [],
  callable_traits: [],
  metric_traits: [],
};

export const rubricHandlers = [
  // V2 endpoints
  // Get current rubric (V2)
  http.get('/api/v2/rubrics/current', () => {
    return HttpResponse.json(mockRubric);
  }),

  // Update rubric (V2 - uses PUT)
  http.put('/api/v2/rubrics/current', () => {
    return HttpResponse.json({
      message: 'Rubric saved successfully',
    });
  }),

  // Delete rubric (V2)
  http.delete('/api/v2/rubrics/current', () => {
    return HttpResponse.json({
      message: 'Rubric deleted successfully',
    });
  }),
];
