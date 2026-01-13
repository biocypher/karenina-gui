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
  // Get current rubric
  http.get('/api/rubric', () => {
    return HttpResponse.json(mockRubric);
  }),

  // Create/update rubric
  http.post('/api/rubric', () => {
    return HttpResponse.json({
      message: 'Rubric saved successfully',
    });
  }),

  // Delete rubric
  http.delete('/api/rubric', () => {
    return HttpResponse.json({
      message: 'Rubric deleted successfully',
    });
  }),

  // Get default system prompt for rubric generation
  http.get('/api/rubric/default-system-prompt', () => {
    return HttpResponse.json({
      prompt: `You are an expert in rubric design. Your task is to analyze question-answer pairs and suggest appropriate evaluation criteria (traits) that can be used to assess the quality of responses.

<important>
Generate traits that evaluate QUALITATIVE aspects of how the answer is presented, NOT the factual accuracy or correctness of the content. The traits should be assessable by someone who doesn't know the actual answer to the question.
</important>

<trait_requirements>
- Specific and measurable
- Relevant to the question domain and response style
- Independent of each other (minimal overlap)
- Useful for distinguishing between well-structured and poorly-structured responses
- Focus on HOW information is presented, not WHETHER it's correct
</trait_requirements>`,
    });
  }),
];
