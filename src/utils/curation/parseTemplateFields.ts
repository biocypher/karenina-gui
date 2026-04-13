/**
 * Parse VerifiedField metadata from Python answer template source code.
 *
 * Extracts field names, types, descriptions, and verification primitives
 * from the checkpoint's answer_template string.
 */

export interface TemplateFieldMeta {
  name: string;
  type: string;
  description: string;
  verifyWith?: string;
}

/**
 * Extract field metadata from a Python answer template source string.
 *
 * Handles VerifiedField definitions like:
 *   field_name: bool = VerifiedField(description="...", verify_with=BooleanMatch())
 *
 * Also handles multi-line descriptions with parenthesized strings.
 */
export function parseTemplateFields(source: string): TemplateFieldMeta[] {
  if (!source) return [];

  const fields: TemplateFieldMeta[] = [];

  // Match field declarations: "field_name: type = VerifiedField("
  // Capture: field_name, type annotation, and the rest of the VerifiedField call
  const fieldPattern = /^\s{4}(\w+):\s*(.+?)\s*=\s*VerifiedField\(/gm;
  let match;

  while ((match = fieldPattern.exec(source)) !== null) {
    const name = match[1];
    const rawType = match[2].trim();
    const startIdx = match.index + match[0].length;

    // Extract the full VerifiedField(...) arguments by counting parens
    const args = extractBalancedArgs(source, startIdx);
    const description = extractStringArg(args, 'description');
    const verifyWith = extractVerifyWith(args);

    fields.push({
      name,
      type: cleanType(rawType),
      description,
      verifyWith,
    });
  }

  return fields;
}

/** Extract balanced content from opening paren position to matching close. */
function extractBalancedArgs(source: string, startIdx: number): string {
  let depth = 1;
  let i = startIdx;
  while (i < source.length && depth > 0) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') depth--;
    i++;
  }
  return source.slice(startIdx, i - 1);
}

/** Extract a named string argument from a VerifiedField call's args. */
function extractStringArg(args: string, paramName: string): string {
  // Try quoted string: description="..."
  const quotedPattern = new RegExp(`${paramName}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const quotedMatch = args.match(quotedPattern);
  if (quotedMatch) return quotedMatch[1].replace(/\\"/g, '"');

  // Try single-quoted: description='...'
  const singlePattern = new RegExp(`${paramName}\\s*=\\s*'((?:[^'\\\\]|\\\\.)*)'`);
  const singleMatch = args.match(singlePattern);
  if (singleMatch) return singleMatch[1].replace(/\\'/g, "'");

  // Try parenthesized multi-line string: description=(\n"..."\n)
  const parenPattern = new RegExp(`${paramName}\\s*=\\s*\\(`);
  const parenMatch = parenPattern.exec(args);
  if (parenMatch) {
    const parenStart = parenMatch.index + parenMatch[0].length;
    const inner = extractBalancedArgs(args + ')', parenStart);
    // Concatenate all quoted fragments (match double- and single-quoted
    // strings separately so apostrophes inside double-quoted strings
    // don't terminate the match early)
    const fragments: string[] = [];
    const fragPattern = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
    let fragMatch;
    while ((fragMatch = fragPattern.exec(inner)) !== null) {
      fragments.push(fragMatch[1] ?? fragMatch[2]);
    }
    return fragments.join('');
  }

  return '';
}

/** Extract the verify_with primitive name. */
function extractVerifyWith(args: string): string | undefined {
  const match = args.match(/verify_with\s*=\s*(\w+)\s*\(/);
  return match?.[1];
}

/** Clean up Python type annotation for display. */
function cleanType(raw: string): string {
  return raw.replace(/\s+/g, '');
}
