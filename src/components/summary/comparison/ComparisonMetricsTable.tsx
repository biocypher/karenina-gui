import type { ModelConfig, ModelComparisonResponse } from '../../../../types';

interface ComparisonMetricsTableProps {
  selectedModels: ModelConfig[];
  comparisonData: ModelComparisonResponse;
}

export function ComparisonMetricsTable({ selectedModels, comparisonData }: ComparisonMetricsTableProps) {
  const getModelKey = (model: ModelConfig): string => {
    return `${model.answering_model}|${model.mcp_config}`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) return `${minutes}m ${secs.toFixed(1)}s`;
    return `${secs.toFixed(1)}s`;
  };

  const sectionClass = 'bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4';
  const headerClass =
    'text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mb-3 pb-2 border-b-2 border-blue-200 dark:border-blue-800';
  const rowClass =
    'border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors';
  const labelClass = 'py-2 px-3 font-medium text-slate-600 dark:text-slate-400 text-xs';
  const valueClass = 'py-2 px-3 text-slate-900 dark:text-slate-100 font-mono text-xs';

  return (
    <div
      className={`grid gap-6 ${
        selectedModels.length === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : selectedModels.length === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2'
      }`}
    >
      {selectedModels.map((model) => {
        const modelKey = getModelKey(model);
        const summary = comparisonData.model_summaries[modelKey];

        if (!summary) return null;

        const passRate = summary.template_pass_overall?.pass_pct ?? 0;

        return (
          <div key={modelKey} className="space-y-4">
            {/* Model Header */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {model.answering_model}
              </h4>
              {model.mcp_config && model.mcp_config !== '[]' && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  MCP: {JSON.parse(model.mcp_config).join(', ')}
                </p>
              )}
            </div>

            {/* Overview */}
            <div className={sectionClass}>
              <h5 className={headerClass}>Overview</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className={rowClass}>
                      <td className={labelClass}>Total Results:</td>
                      <td className={valueClass}>{summary.num_results}</td>
                    </tr>
                    <tr className={rowClass}>
                      <td className={labelClass}>Questions:</td>
                      <td className={valueClass}>{summary.num_questions}</td>
                    </tr>
                    <tr className={rowClass}>
                      <td className={labelClass}>Replicates:</td>
                      <td className={valueClass}>{summary.num_replicates}</td>
                    </tr>
                    <tr className={rowClass}>
                      <td className={labelClass}>Execution Time:</td>
                      <td className={valueClass}>{formatDuration(summary.total_execution_time)}</td>
                    </tr>
                    {summary.trace_length_stats && (
                      <tr className={rowClass}>
                        <td className={labelClass}>Median Iterations:</td>
                        <td className={valueClass}>
                          {summary.trace_length_stats.median_iterations.toFixed(1)} iterations
                          <span className="text-slate-500 dark:text-slate-400 ml-1">
                            (± {summary.trace_length_stats.std_iterations.toFixed(1)})
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr className={rowClass}>
                      <td className={labelClass}>Total Tokens:</td>
                      <td className={valueClass}>
                        <div>
                          {Math.round(summary.tokens.total_input).toLocaleString()} ±{' '}
                          {Math.round(summary.tokens.total_input_std).toLocaleString()} input,{' '}
                          {Math.round(summary.tokens.total_output).toLocaleString()} ±{' '}
                          {Math.round(summary.tokens.total_output_std).toLocaleString()} output
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                          <div>
                            └─ Templates: {Math.round(summary.tokens.template_input).toLocaleString()} ±{' '}
                            {Math.round(summary.tokens.template_input_std).toLocaleString()} input,{' '}
                            {Math.round(summary.tokens.template_output).toLocaleString()} ±{' '}
                            {Math.round(summary.tokens.template_output_std).toLocaleString()} output
                          </div>
                          <div>
                            └─ Rubrics: {Math.round(summary.tokens.rubric_input).toLocaleString()} ±{' '}
                            {Math.round(summary.tokens.rubric_input_std).toLocaleString()} input,{' '}
                            {Math.round(summary.tokens.rubric_output).toLocaleString()} ±{' '}
                            {Math.round(summary.tokens.rubric_output_std).toLocaleString()} output
                          </div>
                          {summary.tokens.deep_judgment_input && summary.tokens.deep_judgment_output && (
                            <div>
                              └─ Deep Judgment: {Math.round(summary.tokens.deep_judgment_input).toLocaleString()} ±{' '}
                              {Math.round(summary.tokens.deep_judgment_input_std || 0).toLocaleString()} input,{' '}
                              {Math.round(summary.tokens.deep_judgment_output).toLocaleString()} ±{' '}
                              {Math.round(summary.tokens.deep_judgment_output_std || 0).toLocaleString()} output
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr className={rowClass}>
                      <td className={labelClass}>Median Tokens/Question:</td>
                      <td className={valueClass}>
                        {Math.round(summary.tokens.median_per_question_input).toLocaleString()} ±{' '}
                        {Math.round(summary.tokens.median_per_question_input_std).toLocaleString()} input,{' '}
                        {Math.round(summary.tokens.median_per_question_output).toLocaleString()} ±{' '}
                        {Math.round(summary.tokens.median_per_question_output_std).toLocaleString()} output
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Completion Status */}
            <div className={sectionClass}>
              <h5 className={headerClass}>Completion Status</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className={rowClass}>
                      <td className={labelClass}>Overall:</td>
                      <td className={valueClass}>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {summary.num_completed}/{summary.num_results} completed (
                          {((summary.num_completed / summary.num_results) * 100).toFixed(1)}%)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evaluation Types */}
            <div className={sectionClass}>
              <h5 className={headerClass}>Evaluation Types</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className={rowClass}>
                      <td className={labelClass}>Template Verification:</td>
                      <td className={valueClass}>{summary.num_with_template} results</td>
                    </tr>
                    <tr className={rowClass}>
                      <td className={labelClass}>Rubric Evaluation:</td>
                      <td className={valueClass}>
                        <div>{summary.num_with_rubric} results</div>
                        {summary.rubric_traits &&
                          (() => {
                            const globalLlm = summary.rubric_traits.global_traits?.llm?.count || 0;
                            const globalRegex = summary.rubric_traits.global_traits?.regex?.count || 0;
                            const globalCallable = summary.rubric_traits.global_traits?.callable?.count || 0;
                            const globalMetric = summary.rubric_traits.global_traits?.metric?.count || 0;
                            const qsLlm = summary.rubric_traits.question_specific_traits?.llm?.count || 0;
                            const qsRegex = summary.rubric_traits.question_specific_traits?.regex?.count || 0;
                            const qsCallable = summary.rubric_traits.question_specific_traits?.callable?.count || 0;
                            const qsMetric = summary.rubric_traits.question_specific_traits?.metric?.count || 0;

                            const globalTotal = globalLlm + globalRegex + globalCallable + globalMetric;
                            const qsTotal = qsLlm + qsRegex + qsCallable + qsMetric;
                            const total = globalTotal + qsTotal;

                            return (
                              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                <div>
                                  Total Trait Evaluations:{' '}
                                  <span className="font-mono text-slate-900 dark:text-slate-100">{total}</span>
                                </div>
                                <div>
                                  Global:{' '}
                                  <span className="font-mono text-slate-900 dark:text-slate-100">{globalTotal}</span>
                                </div>
                                <div className="ml-3">
                                  └─ LLM: <span className="font-mono">{globalLlm}</span>
                                </div>
                                {globalRegex > 0 && (
                                  <div className="ml-3">
                                    └─ Regex: <span className="font-mono">{globalRegex}</span>
                                  </div>
                                )}
                                {globalMetric > 0 && (
                                  <div className="ml-3">
                                    └─ Metric: <span className="font-mono">{globalMetric}</span>
                                  </div>
                                )}
                                <div>
                                  Question-Specific:{' '}
                                  <span className="font-mono text-slate-900 dark:text-slate-100">{qsTotal}</span>
                                </div>
                                <div className="ml-3">
                                  └─ LLM: <span className="font-mono">{qsLlm}</span>, Metric:{' '}
                                  <span className="font-mono">{qsMetric}</span>
                                </div>
                              </div>
                            );
                          })()}
                      </td>
                    </tr>
                    {summary.num_with_judgment > 0 && (
                      <tr className={rowClass}>
                        <td className={labelClass}>Deep Judgment:</td>
                        <td className={valueClass}>{summary.num_with_judgment} results</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Template Pass Rates */}
            <div className={sectionClass}>
              <h5 className={headerClass}>Template Pass Rates</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className={rowClass}>
                      <td className={labelClass}>Overall:</td>
                      <td className={valueClass}>
                        <span
                          className={
                            passRate >= 90
                              ? 'text-green-600 dark:text-green-400 font-semibold'
                              : passRate >= 70
                                ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
                                : 'text-red-600 dark:text-red-400 font-semibold'
                          }
                        >
                          {summary.template_pass_overall?.passed ?? 0}/{summary.template_pass_overall?.total ?? 0}{' '}
                          passed ({passRate.toFixed(1)}%)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Replicate Statistics */}
            {summary.replicate_stats && summary.num_replicates > 1 && (
              <div className={sectionClass}>
                <h5 className={headerClass}>Replicate Statistics</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {summary.replicate_stats?.replicate_pass_rates &&
                      typeof summary.replicate_stats.replicate_pass_rates === 'object'
                        ? Object.entries(summary.replicate_stats.replicate_pass_rates).map(([replicate, stats]) => (
                            <tr key={replicate} className={rowClass}>
                              <td className={labelClass}>Replicate {replicate}:</td>
                              <td className={valueClass}>
                                <span
                                  className={
                                    stats.pass_pct >= 70
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }
                                >
                                  {stats.passed}/{stats.total}
                                </span>{' '}
                                ({stats.pass_pct.toFixed(1)}%)
                              </td>
                            </tr>
                          ))
                        : null}
                      {summary.replicate_stats?.replicate_summary && (
                        <tr className={rowClass}>
                          <td className={labelClass}>Summary:</td>
                          <td className={valueClass}>
                            mean={summary.replicate_stats.replicate_summary.mean.toFixed(3)}, std=
                            {summary.replicate_stats.replicate_summary.std.toFixed(3)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
