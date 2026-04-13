import type { TraceMessage } from '../../types/trace';

export interface EnrichedTraceResult {
  messages: TraceMessage[];
  currentTurnIndex: number | undefined;
}

/**
 * Enrich a trace by prepending the system message (if missing),
 * ensuring the current question appears as a user message, and
 * flagging it as the current turn.
 *
 * Returns a new array (never mutates the input).
 */
export function buildEnrichedTrace(
  traceMessages: TraceMessage[] | undefined,
  questionText: string,
  systemPrompt?: string,
  rawResponse?: string
): EnrichedTraceResult {
  const messages: TraceMessage[] = traceMessages ? traceMessages.map((m) => ({ ...m })) : [];

  // 1. Prepend system message if not already present
  if (systemPrompt && (messages.length === 0 || messages[0].role !== 'system')) {
    messages.unshift({
      role: 'system',
      content: systemPrompt,
      block_index: -2,
      _isInjected: true,
    });
  }

  // 2. Find the current turn's user message (search from end for last match)
  const trimmedQ = questionText.trim();
  let currentTurnIndex: number | undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && messages[i].content.trim() === trimmedQ) {
      currentTurnIndex = i;
      break;
    }
  }

  // 3. If no exact match, try substring match (handles minor formatting differences)
  if (currentTurnIndex === undefined && trimmedQ) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content.includes(trimmedQ)) {
        currentTurnIndex = i;
        break;
      }
    }
  }

  // 4. If still not found, inject the question as a user message
  if (currentTurnIndex === undefined && trimmedQ) {
    const injected: TraceMessage = {
      role: 'user',
      content: trimmedQ,
      block_index: -1,
      _isInjected: true,
    };

    // Insert before the first assistant message, or at the end
    const firstAssistantIdx = messages.findIndex((m) => m.role === 'assistant');
    if (firstAssistantIdx > 0) {
      messages.splice(firstAssistantIdx, 0, injected);
      currentTurnIndex = firstAssistantIdx;
    } else {
      messages.push(injected);
      currentTurnIndex = messages.length - 1;
    }
  }

  // 5. Mark the identified message
  if (currentTurnIndex !== undefined) {
    messages[currentTurnIndex] = { ...messages[currentTurnIndex], _isCurrentTurn: true };
  }

  // 6. If trace was empty and we have a raw response, build minimal structured trace
  if ((!traceMessages || traceMessages.length === 0) && rawResponse) {
    // Only add if no assistant message exists yet
    if (!messages.some((m) => m.role === 'assistant')) {
      messages.push({
        role: 'assistant',
        content: rawResponse,
        block_index: 0,
        _isInjected: true,
      });
    }
  }

  return { messages, currentTurnIndex };
}
