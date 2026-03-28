export interface PreviewLine {
  output: string;
  explanation: string;
  verdict: 'pass' | 'fail';
}

export interface PreviewResult {
  expected: string;
  pass: PreviewLine;
  fail: PreviewLine;
}

type Params = Record<string, unknown>;

function fmt(v: unknown): string {
  if (typeof v === 'string') return `"${v}"`;
  if (Array.isArray(v)) return `[${v.map((i) => `"${i}"`).join(', ')}]`;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v ?? '');
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  return String(v ?? '');
}

// Default ground truth values used when the user hasn't entered one yet.
// These produce a meaningful preview for each primitive.
const PLACEHOLDER_GT: Record<string, unknown> = {
  BooleanMatch: true,
  ExactMatch: 'aspirin',
  NumericExact: 42,
  NumericTolerance: 3.14,
  NumericRange: 50,
  SetContainment: ['BRCA1', 'TP53'],
  OrderedMatch: ['step 1', 'step 2', 'step 3'],
  ContainsAll: 'kinase, inhibitor',
  ContainsAny: 'mutation, variant',
  SemanticMatch: 'heart attack',
  RegexMatch: '\\d{4}-\\d{2}-\\d{2}',
  LiteralMatch: 'high',
  DateMatch: '2025-01-15',
  DateTolerance: '2025-01-15',
  DateRange: '2025-01-15',
};

const PLACEHOLDER_PARAMS: Record<string, Params> = {
  NumericTolerance: { tolerance: 0.05 },
  NumericRange: { min: 40, max: 60 },
  SemanticMatch: { threshold: 0.8 },
  LiteralMatch: { literal_values: ['low', 'medium', 'high'] },
  DateTolerance: { tolerance_days: 3 },
  DateRange: { start: '2025-01-01', end: '2025-01-31' },
};

const generators: Record<string, (gt: unknown, params: Params) => PreviewResult> = {
  BooleanMatch: (gt) => {
    const val = Boolean(gt);
    return {
      expected: val ? 'Yes' : 'No',
      pass: { output: val ? 'Yes' : 'No', explanation: 'matches expected', verdict: 'pass' },
      fail: { output: val ? 'No' : 'Yes', explanation: 'does not match', verdict: 'fail' },
    };
  },

  ExactMatch: (gt) => {
    const s = str(gt);
    const isNum = typeof gt === 'number';
    const failVal = isNum ? String(num(gt) + 1) : `"${s.length > 3 ? s.slice(0, -3) + '...' : s + '?'}"`;
    return {
      expected: fmt(gt),
      pass: { output: fmt(gt), explanation: `= ${fmt(gt)}`, verdict: 'pass' },
      fail: { output: failVal, explanation: `\u2260 ${fmt(gt)}`, verdict: 'fail' },
    };
  },

  NumericExact: (gt) => {
    const n = num(gt);
    return {
      expected: String(n),
      pass: { output: String(n), explanation: `= ${n}`, verdict: 'pass' },
      fail: { output: String(n + 1), explanation: `\u2260 ${n}`, verdict: 'fail' },
    };
  },

  NumericTolerance: (gt, params) => {
    const n = num(gt);
    const tol = num(params.tolerance) || 0.05;
    const passVal = +(n + tol * 0.4).toFixed(4);
    const failVal = +(n + tol * 7).toFixed(4);
    const passDiff = +Math.abs(passVal - n).toFixed(4);
    const failDiff = +Math.abs(failVal - n).toFixed(4);
    return {
      expected: String(n),
      pass: {
        output: String(passVal),
        explanation: `|${n} \u2212 ${passVal}| = ${passDiff} \u2264 ${tol}`,
        verdict: 'pass',
      },
      fail: {
        output: String(failVal),
        explanation: `|${n} \u2212 ${failVal}| = ${failDiff} > ${tol}`,
        verdict: 'fail',
      },
    };
  },

  NumericRange: (gt, params) => {
    const n = num(gt);
    const min = num(params.min) || n - 10;
    const max = num(params.max) || n + 10;
    const mid = +((min + max) / 2).toFixed(2);
    return {
      expected: `range [${min}, ${max}]`,
      pass: { output: String(mid), explanation: `${min} \u2264 ${mid} \u2264 ${max}`, verdict: 'pass' },
      fail: { output: String(max + 1), explanation: `${max + 1} > ${max}`, verdict: 'fail' },
    };
  },

  SetContainment: (gt) => {
    const items: string[] = Array.isArray(gt) ? gt.map(str) : [];
    const passItems = [...items, 'extra_item'];
    const failItems = items.length > 1 ? items.slice(1) : ['unrelated'];
    const missing = items.length > 0 ? items[0] : 'item';
    return {
      expected: fmt(items),
      pass: { output: fmt(passItems), explanation: 'all expected items found', verdict: 'pass' },
      fail: { output: fmt(failItems), explanation: `missing "${missing}"`, verdict: 'fail' },
    };
  },

  OrderedMatch: (gt) => {
    const items: string[] = Array.isArray(gt) ? gt.map(str) : [];
    const swapped = items.length >= 2 ? [items[1], items[0], ...items.slice(2)] : [...items];
    return {
      expected: fmt(items),
      pass: { output: fmt(items), explanation: 'items in correct order', verdict: 'pass' },
      fail: { output: fmt(swapped), explanation: 'items out of order', verdict: 'fail' },
    };
  },

  ContainsAll: (gt) => {
    const s = str(gt);
    const keywords = s.split(/[,;]\s*/).filter(Boolean);
    const allText = keywords.length > 0 ? `text containing ${keywords.map((k) => `"${k}"`).join(' and ')}` : fmt(gt);
    const missing = keywords.length > 0 ? keywords[keywords.length - 1] : s;
    return {
      expected: fmt(gt),
      pass: { output: allText, explanation: 'all keywords found', verdict: 'pass' },
      fail: { output: `text without "${missing}"`, explanation: `missing "${missing}"`, verdict: 'fail' },
    };
  },

  ContainsAny: (gt) => {
    const s = str(gt);
    const keywords = s.split(/[,;]\s*/).filter(Boolean);
    const first = keywords[0] ?? s;
    return {
      expected: fmt(gt),
      pass: { output: `text containing "${first}"`, explanation: `found "${first}"`, verdict: 'pass' },
      fail: { output: 'text with no matching keywords', explanation: 'no keywords found', verdict: 'fail' },
    };
  },

  SemanticMatch: (gt, params) => {
    const threshold = num(params.threshold) || 0.8;
    const s = str(gt);
    return {
      expected: fmt(gt),
      pass: {
        output: fmt(gt),
        explanation: `similarity("${s}", "${s}") = 1.0 \u2265 ${threshold}`,
        verdict: 'pass',
      },
      fail: {
        output: '"unrelated text"',
        explanation: `similarity("${s}", "unrelated text") = 0.2 < ${threshold}`,
        verdict: 'fail',
      },
    };
  },

  RegexMatch: (gt) => {
    const pattern = str(gt);
    return {
      expected: `/${pattern}/`,
      pass: { output: fmt(gt), explanation: `matches /${pattern}/`, verdict: 'pass' },
      fail: { output: '"..."', explanation: `does not match /${pattern}/`, verdict: 'fail' },
    };
  },

  LiteralMatch: (gt, params) => {
    const allowed: string[] = Array.isArray(params.literal_values) ? params.literal_values.map(str) : [];
    const gtStr = str(gt);
    const failVal = allowed.find((v) => v !== gtStr) ?? 'invalid_option';
    return {
      expected: fmt(gt),
      pass: { output: fmt(gt), explanation: `"${gtStr}" is an allowed option`, verdict: 'pass' },
      fail: { output: fmt(failVal), explanation: `"${failVal}" \u2260 "${gtStr}"`, verdict: 'fail' },
    };
  },

  DateMatch: (gt) => {
    const d = str(gt);
    const next = d.replace(/(\d{2})$/, (dd) => String(Number(dd) + 1).padStart(2, '0'));
    return {
      expected: d,
      pass: { output: d, explanation: `= ${d}`, verdict: 'pass' },
      fail: { output: next, explanation: `${next} \u2260 ${d}`, verdict: 'fail' },
    };
  },

  DateTolerance: (gt, params) => {
    const days = num(params.tolerance_days) || 3;
    const d = str(gt);
    return {
      expected: d,
      pass: {
        output: `${d} + ${Math.floor(days / 2)}d`,
        explanation: `within \u00B1${days} days`,
        verdict: 'pass',
      },
      fail: {
        output: `${d} + ${days * 3}d`,
        explanation: `${days * 3} days > \u00B1${days} days`,
        verdict: 'fail',
      },
    };
  },

  DateRange: (gt, params) => {
    const start = str(params.start) || str(gt);
    const end = str(params.end) || str(gt);
    return {
      expected: `${start} to ${end}`,
      pass: { output: start, explanation: `within [${start}, ${end}]`, verdict: 'pass' },
      fail: { output: `day after ${end}`, explanation: `outside [${start}, ${end}]`, verdict: 'fail' },
    };
  },
};

export function generatePreview(primitive: string, groundTruth: unknown, params: Params): PreviewResult {
  const gen = generators[primitive];
  if (!gen) {
    const gt = groundTruth === '' || groundTruth == null ? 'example' : groundTruth;
    return {
      expected: fmt(gt),
      pass: { output: fmt(gt), explanation: 'matches expected', verdict: 'pass' },
      fail: { output: '"different value"', explanation: 'does not match', verdict: 'fail' },
    };
  }

  // When ground truth is empty, use a primitive-specific placeholder so the
  // preview still shows how this check type works.
  const isEmpty =
    groundTruth === '' ||
    groundTruth === null ||
    groundTruth === undefined ||
    (Array.isArray(groundTruth) && groundTruth.length === 0);
  const gt = isEmpty ? (PLACEHOLDER_GT[primitive] ?? 'example') : groundTruth;
  const mergedParams = isEmpty ? { ...PLACEHOLDER_PARAMS[primitive], ...params } : params;

  return gen(gt, mergedParams);
}
