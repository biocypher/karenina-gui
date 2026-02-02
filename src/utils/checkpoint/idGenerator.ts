/**
 * Checkpoint ID Generation
 * Utilities for generating checkpoint and question IDs
 */

/**
 * Generates a deterministic question ID based on question text
 * @param questionText - The question text to generate an ID from
 * @returns A URN-based UUID string for the question
 */
export function generateQuestionId(questionText: string): string {
  // Create a deterministic ID based on question text
  const hash = questionText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  // Add a simple hash suffix for uniqueness
  const simpleHash = Math.abs(
    questionText.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0)
  ).toString(16);

  return `urn:uuid:question-${hash}-${simpleHash}`;
}
