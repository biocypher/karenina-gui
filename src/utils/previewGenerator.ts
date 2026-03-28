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

function placeholderPreview(): PreviewResult {
  return {
    expected: '"example"',
    pass: { output: '"example"', explanation: 'matches expected', verdict: 'pass' },
    fail: { output: '"other"', explanation: 'does not match', verdict: 'fail' },
  };
}

const generators: Record<string, (gt: unknown, params: Params) => PreviewResult> = {
  BooleanMatch: (gt) => ({
    expected: gt ? 'Yes' : 'No',
    pass: { output: gt ? 'Yes' : 'No', explanation: 'matches expected', verdict: 'pass' },
    fail: { output: gt ? 'No' : 'Yes', explanation: 'does not match', verdict: 'fail' },
  }),

  ExactMatch: (gt) => {
    const s = String(gt);
    const failVal = typeof gt === 'number' ? String(gt + 1) : `"${s.slice(0, Math.max(1, s.length - 3))}..."`;
    return {
      expected: fmt(gt),
      pass: { output: fmt(gt), explanation: `= ${fmt(gt)}`, verdict: 'pass' },
      fail: { output: failVal, explanation: `\u2260 ${fmt(gt)}`, verdict: 'fail' },
    };
  },

  NumericExact: (gt) => ({
    expected: String(gt),
    pass: { output: String(gt), explanation: `= ${gt}`, verdict: 'pass' },
    fail: { output: String(Number(gt) + 1), explanation: `\u2260 ${gt}`, verdict: 'fail' },
  }),

  NumericTolerance: (gt, params) => {
    const tol = params.tolerance ?? 0.05;
    const passVal = +(Number(gt) + tol * 0.4).toFixed(4);
    const failVal = +(Number(gt) + tol * 7).toFixed(4);
    const passDiff = +Math.abs(passVal - Number(gt)).toFixed(4);
    const failDiff = +Math.abs(failVal - Number(gt)).toFixed(4);
    return {
      expected: String(gt),
      pass: {
        output: String(passVal),
        explanation: `|${gt} \u2212 ${passVal}| = ${passDiff} \u2264 ${tol}`,
        verdict: 'pass',
      },
      fail: {
        output: String(failVal),
        explanation: `|${gt} \u2212 ${failVal}| = ${failDiff} > ${tol}`,
        verdict: 'fail',
      },
    };
  },

  NumericRange: (gt, params) => {
    const min = params.min ?? Number(gt) - 10;
    const max = params.max ?? Number(gt) + 10;
    const mid = +((min + max) / 2).toFixed(2);
    return {
      expected: `range [${min}, ${max}]`,
      pass: { output: String(mid), explanation: `${min} \u2264 ${mid} \u2264 ${max}`, verdict: 'pass' },
      fail: { output: String(max + 1), explanation: `${max + 1} > ${max}`, verdict: 'fail' },
    };
  },

  SetContainment: (gt) => {
    const items = Array.isArray(gt) ? gt : [];
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
    const items = Array.isArray(gt) ? gt : [];
    const swapped = items.length >= 2 ? [items[1], items[0], ...items.slice(2)] : [...items];
    return {
      expected: fmt(items),
      pass: { output: fmt(items), explanation: 'items in correct order', verdict: 'pass' },
      fail: { output: fmt(swapped), explanation: 'items out of order', verdict: 'fail' },
    };
  },

  ContainsAll: (gt) => {
    const s = String(gt);
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
    const s = String(gt);
    const keywords = s.split(/[,;]\s*/).filter(Boolean);
    const first = keywords[0] ?? s;
    return {
      expected: fmt(gt),
      pass: { output: `text containing "${first}"`, explanation: `found "${first}"`, verdict: 'pass' },
      fail: { output: 'text with no matching keywords', explanation: 'no keywords found', verdict: 'fail' },
    };
  },

  SemanticMatch: (gt, params) => {
    const threshold = params.threshold ?? 0.8;
    const s = String(gt);
    return {
      expected: fmt(gt),
      pass: { output: fmt(gt), explanation: `similarity("${s}", "${s}") = 1.0 \u2265 ${threshold}`, verdict: 'pass' },
      fail: {
        output: '"unrelated text"',
        explanation: `similarity("${s}", "unrelated text") = 0.2 < ${threshold}`,
        verdict: 'fail',
      },
    };
  },

  RegexMatch: (gt) => ({
    expected: fmt(gt),
    pass: { output: fmt(gt), explanation: 'matches pattern', verdict: 'pass' },
    fail: { output: '"..."', explanation: 'does not match pattern', verdict: 'fail' },
  }),

  LiteralMatch: (gt, params) => {
    const allowed = params.literal_values ?? [];
    const failVal = allowed.find((v: string) => v !== gt) ?? 'invalid_option';
    return {
      expected: fmt(gt),
      pass: { output: fmt(gt), explanation: `"${gt}" is an allowed option`, verdict: 'pass' },
      fail: { output: fmt(failVal), explanation: `"${failVal}" \u2260 "${gt}"`, verdict: 'fail' },
    };
  },

  DateMatch: (gt) => {
    const d = String(gt);
    const next = d.replace(/(\d{2})$/, (dd) => String(Number(dd) + 1).padStart(2, '0'));
    return {
      expected: d,
      pass: { output: d, explanation: `= ${d}`, verdict: 'pass' },
      fail: { output: next, explanation: `${next} \u2260 ${d}`, verdict: 'fail' },
    };
  },

  DateTolerance: (gt, params) => {
    const days = params.tolerance_days ?? 3;
    const d = String(gt);
    return {
      expected: d,
      pass: { output: `${d} + ${Math.floor(days / 2)}d`, explanation: `within \u00B1${days} days`, verdict: 'pass' },
      fail: { output: `${d} + ${days * 3}d`, explanation: `${days * 3} days > \u00B1${days} days`, verdict: 'fail' },
    };
  },

  DateRange: (gt, params) => {
    const start = params.start ?? String(gt);
    const end = params.end ?? String(gt);
    return {
      expected: `${start} to ${end}`,
      pass: { output: start, explanation: `within [${start}, ${end}]`, verdict: 'pass' },
      fail: { output: `day after ${end}`, explanation: `outside [${start}, ${end}]`, verdict: 'fail' },
    };
  },
};

export function generatePreview(primitive: string, groundTruth: unknown, params: Params): PreviewResult {
  if (groundTruth === '' || groundTruth === null || groundTruth === undefined) {
    return placeholderPreview();
  }

  const gen = generators[primitive];
  if (!gen) {
    return {
      expected: fmt(groundTruth),
      pass: { output: fmt(groundTruth), explanation: 'matches expected', verdict: 'pass' },
      fail: { output: '"different value"', explanation: 'does not match', verdict: 'fail' },
    };
  }

  return gen(groundTruth, params);
}
