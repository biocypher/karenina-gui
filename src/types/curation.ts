/**
 * Curation types
 * Data structures for human review judgments on verification results
 */

import type { Checkpoint } from './checkpoint';
import type { VerificationResult } from './verification';
import type { ScenarioDefinition, ScenarioExecutionResult } from './scenario';

export type JudgmentValue = 'agree' | 'disagree' | 'uncertain';

export interface TraitJudgment {
  judgment: JudgmentValue;
  confidence: number | null; // 1-5
  note: string | null;
}

export interface Curator {
  id: string;
  name: string;
  metadata: Record<string, string>;
}

export type CurationStatus = 'curated' | 'partial' | 'pending';

export interface CurationFilters {
  status: 'all' | CurationStatus;
  passStatus: 'all' | 'pass' | 'fail' | 'error';
  answeringModel: string | null;
  parsingModel: string | null;
  searchQuery: string;
}

export interface CurationExport {
  format_version: '1.0';
  metadata: {
    export_timestamp: string;
    karenina_version: string;
    source_checkpoint: string;
    source_results_job_id: string;
  };
  curators: Curator[];
  judgments: CurationJudgmentEntry[];
  scenario_judgments: ScenarioCurationEntry[];
}

export interface CurationJudgmentEntry {
  result_id: string;
  curator_id: string;
  curated: boolean;
  timestamp: string;
  template_judgments: Record<string, TraitJudgment>;
  rubric_judgments: Record<string, TraitJudgment>;
}

export interface ScenarioCurationEntry {
  scenario_id: string;
  curator_id: string;
  curated: boolean;
  timestamp: string;
  node_judgments: Record<
    string,
    {
      result_id: string;
      template_judgments: Record<string, TraitJudgment>;
      rubric_judgments: Record<string, TraitJudgment>;
    }
  >;
}

/** Self-contained session export (v2.0): checkpoint + results + judgments. */
export interface CurationSessionExport {
  format_version: '2.0';
  metadata: {
    export_timestamp: string;
    karenina_version: string;
    source_checkpoint: string;
    source_results_job_id: string;
  };
  session_data: {
    checkpoint: Checkpoint;
    results: VerificationResult[];
    scenario_definitions: ScenarioDefinition[];
    scenario_results: ScenarioExecutionResult[];
  };
  curators: Curator[];
  judgments: CurationJudgmentEntry[];
  scenario_judgments: ScenarioCurationEntry[];
}
