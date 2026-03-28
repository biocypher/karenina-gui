export interface FriendlyTypeName {
  label: string;
  programmatic: string;
}

export interface FriendlyPrimitiveName {
  label: string;
  programmatic: string;
}

export const FRIENDLY_TYPE_NAMES: Record<string, FriendlyTypeName> = {
  bool: { label: 'Yes / No', programmatic: 'bool' },
  str: { label: 'Text', programmatic: 'str' },
  int: { label: 'Whole Number', programmatic: 'int' },
  float: { label: 'Decimal Number', programmatic: 'float' },
  list_str: { label: 'List of Items', programmatic: 'list_str' },
  literal: { label: 'Pick One Option', programmatic: 'literal' },
  date: { label: 'Date', programmatic: 'date' },
};

export const FRIENDLY_PRIMITIVE_NAMES: Record<string, FriendlyPrimitiveName> = {
  ExactMatch: { label: 'Exact Match', programmatic: 'ExactMatch' },
  BooleanMatch: { label: 'Yes/No Match', programmatic: 'BooleanMatch' },
  NumericTolerance: { label: 'Close Enough', programmatic: 'NumericTolerance' },
  NumericExact: { label: 'Exact Number', programmatic: 'NumericExact' },
  NumericRange: { label: 'Within Range', programmatic: 'NumericRange' },
  ContainsAll: { label: 'Contains All Keywords', programmatic: 'ContainsAll' },
  ContainsAny: { label: 'Contains Any Keyword', programmatic: 'ContainsAny' },
  SemanticMatch: { label: 'Similar Meaning', programmatic: 'SemanticMatch' },
  RegexMatch: { label: 'Matches Pattern', programmatic: 'RegexMatch' },
  SetContainment: { label: 'Contains All Items', programmatic: 'SetContainment' },
  OrderedMatch: { label: 'Items in Order', programmatic: 'OrderedMatch' },
  LiteralMatch: { label: 'Matches One Option', programmatic: 'LiteralMatch' },
  DateMatch: { label: 'Exact Date', programmatic: 'DateMatch' },
  DateTolerance: { label: 'Date Within Tolerance', programmatic: 'DateTolerance' },
  DateRange: { label: 'Date Within Range', programmatic: 'DateRange' },
  TraceRegex: { label: 'Trace Pattern Match', programmatic: 'TraceRegex' },
  TraceContains: { label: 'Trace Contains Text', programmatic: 'TraceContains' },
  TraceLength: { label: 'Trace Length Check', programmatic: 'TraceLength' },
};

export function getFriendlyTypeName(type: string): string {
  return FRIENDLY_TYPE_NAMES[type]?.label ?? type;
}

export function getFriendlyPrimitiveName(primitive: string): string {
  return FRIENDLY_PRIMITIVE_NAMES[primitive]?.label ?? primitive;
}
