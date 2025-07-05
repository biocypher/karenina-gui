import { http, HttpResponse } from 'msw';
import { QuestionData, TemplateGenerationProgress, TemplateGenerationResult } from '../../types';

// Mock data
const mockQuestionData: QuestionData = {
  q1: {
    question: 'What is the capital of France?',
    raw_answer: 'Paris is the capital of France.',
    answer_template: 'class Answer(BaseModel):\n    capital: str = Field(description="The capital city")',
  },
  q2: {
    question: 'What is 2 + 2?',
    raw_answer: 'Two plus two equals four.',
    answer_template: 'class Answer(BaseModel):\n    result: int = Field(description="The mathematical result")',
  },
};

const mockFileInfo = {
  file_id: 'test-file-123',
  filename: 'test-questions.xlsx',
  size: 1024,
};

const mockPreviewData = {
  success: true,
  total_rows: 100,
  columns: ['Question', 'Answer', 'Category'],
  preview_rows: 5,
  data: [
    { Question: 'Sample question 1', Answer: 'Sample answer 1', Category: 'Math' },
    { Question: 'Sample question 2', Answer: 'Sample answer 2', Category: 'Science' },
  ],
};

export const handlers = [
  // File upload endpoint
  http.post('/api/upload-file', () => {
    return HttpResponse.json(mockFileInfo);
  }),

  // File preview endpoint
  http.post('/api/preview-file', () => {
    return HttpResponse.json(mockPreviewData);
  }),

  // Question extraction endpoint
  http.post('/api/extract-questions', () => {
    return HttpResponse.json({
      success: true,
      questions_count: Object.keys(mockQuestionData).length,
      questions_data: mockQuestionData,
    });
  }),

  // Python export endpoint
  http.post('/api/export-questions-python', () => {
    return new HttpResponse('# Generated Python file\nprint("Hello World")', {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="questions.py"',
      },
    });
  }),

  // Template generation endpoint
  http.post('/api/generate-answer-templates', () => {
    return HttpResponse.json({
      job_id: 'job-123',
    });
  }),

  // Generation progress endpoint
  http.get('/api/generation-progress/:jobId', ({ params }) => {
    const progress: TemplateGenerationProgress = {
      job_id: params.jobId as string,
      status: 'completed',
      percentage: 100,
      current_question: 'q2',
      processed_count: 2,
      total_count: 2,
      result: {
        templates: {
          q1: {
            question_id: 'q1',
            template_code: 'class Answer(BaseModel):\n    capital: str = Field(description="Capital city")',
            generation_time: 1500,
            success: true,
          },
          q2: {
            question_id: 'q2',
            template_code: 'class Answer(BaseModel):\n    result: int = Field(description="Math result")',
            generation_time: 1200,
            success: true,
          },
        },
        total_templates: 2,
        successful_generations: 2,
        failed_generations: 0,
        average_generation_time: 1350,
        model_info: {
          name: 'gemini-2.0-flash',
          provider: 'google_genai',
          temperature: 0.1,
        },
      } as TemplateGenerationResult,
    };
    return HttpResponse.json(progress);
  }),

  // Cancel generation endpoint
  http.post('/api/cancel-generation/:jobId', () => {
    return HttpResponse.json({ success: true });
  }),

  // Chat endpoint
  http.post('/api/chat', () => {
    return HttpResponse.json({
      session_id: 'chat-session-123',
      message: 'This is a mock response from the LLM.',
      model: 'gemini-2.0-flash',
      provider: 'google_genai',
      timestamp: new Date().toISOString(),
    });
  }),

  // Chat sessions endpoint
  http.get('/api/sessions', () => {
    return HttpResponse.json({
      sessions: [
        {
          session_id: 'session-1',
          model: 'gemini-2.0-flash',
          provider: 'google_genai',
          created_at: '2024-12-19T10:00:00Z',
          last_used: '2024-12-19T10:30:00Z',
          message_count: 5,
        },
      ],
    });
  }),

  // Get specific session endpoint
  http.get('/api/sessions/:sessionId', ({ params }) => {
    return HttpResponse.json({
      session_id: params.sessionId,
      model: 'gemini-2.0-flash',
      provider: 'google_genai',
      messages: [
        { type: 'human', content: 'Hello' },
        { type: 'ai', content: 'Hi there! How can I help you?' },
      ],
    });
  }),

  // Delete session endpoint
  http.delete('/api/sessions/:sessionId', () => {
    return HttpResponse.json({ success: true });
  }),

  // Rubric trait generation endpoint
  http.post('/api/generate-rubric-traits', () => {
    return HttpResponse.json({
      traits: [
        {
          name: 'accuracy',
          description: 'Is the response factually accurate?',
          kind: 'boolean',
          min_score: null,
          max_score: null,
        },
        {
          name: 'completeness',
          description: 'How complete is the response?',
          kind: 'score',
          min_score: 1,
          max_score: 5,
        },
        {
          name: 'clarity',
          description: 'Is the response clear and well-written?',
          kind: 'boolean',
          min_score: null,
          max_score: null,
        },
      ],
    });
  }),

  // Get current rubric endpoint
  http.get('/api/rubric', () => {
    return HttpResponse.json({
      title: 'Test Rubric',
      traits: [
        {
          name: 'accuracy',
          description: 'Is the response factually accurate?',
          kind: 'boolean',
          min_score: null,
          max_score: null,
        },
        {
          name: 'completeness',
          description: 'How complete is the response?',
          kind: 'score',
          min_score: 1,
          max_score: 5,
        },
      ],
    });
  }),

  // Create/update rubric endpoint
  http.post('/api/rubric', () => {
    return HttpResponse.json({
      message: 'Rubric saved successfully',
      title: 'Test Rubric',
    });
  }),

  // Delete rubric endpoint
  http.delete('/api/rubric', () => {
    return HttpResponse.json({
      message: 'Rubric deleted successfully',
    });
  }),

  // Get default system prompt endpoint
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
</trait_requirements>

<output_format>
For each trait, provide:
<trait>
  <name>Short, descriptive identifier (2-4 words)</name>
  <description>Clear explanation of what aspect of presentation quality is being evaluated</description>
  <type>Either "boolean" (true/false) or "score" (1-5 scale)</type>
  <evaluation_guidance>Brief guidance on how to assess this trait without domain expertise</evaluation_guidance>
</trait>
</output_format>

<example_traits>
Consider qualitative aspects such as:
- Response structure and organization
- Clarity of explanations
- Level of detail provided
- Presence and quality of examples
- Use of technical language (when appropriate)
- Conciseness vs. comprehensiveness
- Presence of code snippets or diagrams
- Step-by-step breakdowns
- Acknowledgment of assumptions or limitations
- Tone appropriateness (formal, casual, technical)
- Use of formatting (lists, headers, emphasis)
</example_traits>`,
    });
  }),
];
