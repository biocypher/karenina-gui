import type { TraceMessage } from '../../types/trace';

export interface EnrichedTraceResult {
  messages: TraceMessage[];
  currentTurnIndex: number | undefined;
}

/**
 * Build an enriched trace for the curation detail view.
 *
 * When conversation_context is available (new results), it contains the full
 * LLM input (system + prior turns + current question). We concatenate it with
 * trace_messages (the response) and re-index block_index sequentially.
 *
 * When conversation_context is absent (old results), we fall back to injecting
 * the system prompt and question from metadata.
 *
 * The current turn's user message is flagged with _isCurrentTurn.
 */
export function buildEnrichedTrace(
  traceMessages: TraceMessage[] | undefined,
  questionText: string,
  systemPrompt?: string,
  rawResponse?: string,
  conversationContext?: TraceMessage[]
): EnrichedTraceResult {
  // Prefer conversation_context when available (new backend data)
  if (conversationContext && conversationContext.length > 0) {
    return buildFromConversationContext(conversationContext, traceMessages ?? [], questionText);
  }

  // Fallback: inject from metadata (old results without conversation_context)
  return buildFromMetadata(traceMessages, questionText, systemPrompt, rawResponse);
}

function buildFromConversationContext(
  context: TraceMessage[],
  trace: TraceMessage[],
  questionText: string
): EnrichedTraceResult {
  // Concatenate context (input) + trace (response) and re-index
  const combined: TraceMessage[] = [...context.map((m) => ({ ...m })), ...trace.map((m) => ({ ...m }))];

  for (let i = 0; i < combined.length; i++) {
    combined[i].block_index = i;
  }

  // Current turn = last user message in the context portion (before the response)
  const trimmedQ = questionText.trim();
  let currentTurnIndex: number | undefined;

  // Search within the context portion (indices 0..context.length-1)
  for (let i = context.length - 1; i >= 0; i--) {
    if (combined[i].role === 'user') {
      // Prefer exact match, but accept the last user message as fallback
      if (combined[i].content.trim() === trimmedQ) {
        currentTurnIndex = i;
        break;
      }
      if (currentTurnIndex === undefined) {
        currentTurnIndex = i;
      }
    }
  }

  if (currentTurnIndex !== undefined) {
    combined[currentTurnIndex] = { ...combined[currentTurnIndex], _isCurrentTurn: true };
  }

  return { messages: combined, currentTurnIndex };
}

function buildFromMetadata(
  traceMessages: TraceMessage[] | undefined,
  questionText: string,
  systemPrompt?: string,
  rawResponse?: string
): EnrichedTraceResult {
  const messages: TraceMessage[] = traceMessages ? traceMessages.map((m) => ({ ...m })) : [];

  // Prepend system message if not already present
  if (systemPrompt && (messages.length === 0 || messages[0].role !== 'system')) {
    messages.unshift({
      role: 'system',
      content: systemPrompt,
      block_index: -2,
      _isInjected: true,
    });
  }

  // Find the current turn's user message (search from end for last match)
  const trimmedQ = questionText.trim();
  let currentTurnIndex: number | undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && messages[i].content.trim() === trimmedQ) {
      currentTurnIndex = i;
      break;
    }
  }

  // Substring match fallback
  if (currentTurnIndex === undefined && trimmedQ) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content.includes(trimmedQ)) {
        currentTurnIndex = i;
        break;
      }
    }
  }

  // Inject the question if not found in the trace
  if (currentTurnIndex === undefined && trimmedQ) {
    const injected: TraceMessage = {
      role: 'user',
      content: trimmedQ,
      block_index: -1,
      _isInjected: true,
    };

    const firstAssistantIdx = messages.findIndex((m) => m.role === 'assistant');
    if (firstAssistantIdx > 0) {
      messages.splice(firstAssistantIdx, 0, injected);
      currentTurnIndex = firstAssistantIdx;
    } else {
      messages.push(injected);
      currentTurnIndex = messages.length - 1;
    }
  }

  // Mark the current turn
  if (currentTurnIndex !== undefined) {
    messages[currentTurnIndex] = { ...messages[currentTurnIndex], _isCurrentTurn: true };
  }

  // Build minimal structured trace from raw response if trace was empty
  if ((!traceMessages || traceMessages.length === 0) && rawResponse) {
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
