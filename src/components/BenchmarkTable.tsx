import React, { useMemo, useEffect, useState } from 'react';
import { Eye, AlertCircle } from 'lucide-react';
import { VerificationResult, Checkpoint } from '../types';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  FilterFn,
  ColumnFiltersState,
  SortingState,
} from '@tanstack/react-table';
import { useDebounce } from '../hooks/useDebounce';
import { logger } from '../utils/logger';
import { RubricCell } from './table/RubricCell';
import { DeepJudgmentCell } from './table/DeepJudgmentCell';
import { MultiSelectFilter } from './table/MultiSelectFilter';
import { SortIndicator } from './table/SortIndicator';

declare module '@tanstack/react-table' {
  interface FilterFns {
    inDateRange: FilterFn<unknown>;
    arrIncludesSome: FilterFn<unknown>;
  }
}

interface BenchmarkTableProps {
  benchmarkResults: Record<string, VerificationResult>;
  checkpoint?: Checkpoint;
  onViewResult: (result: VerificationResult) => void;
  onFilteredCountChange?: (filteredCount: number, totalCount: number) => void;
  externalFilters?: ColumnFiltersState;
}

const columnHelper = createColumnHelper<VerificationResult>();

export const BenchmarkTable: React.FC<BenchmarkTableProps> = ({
  benchmarkResults,
  checkpoint,
  onViewResult,
  onFilteredCountChange,
  externalFilters,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [questionSearchText, setQuestionSearchText] = useState('');
  const [rawAnswerSearchText, setRawAnswerSearchText] = useState('');

  // Apply external filters when provided (for drill-down from summary panel)
  useEffect(() => {
    if (externalFilters) {
      setColumnFilters(externalFilters);
    }
  }, [externalFilters]);

  // Convert benchmarkResults to array for table
  const data = useMemo(() => {
    return Object.values(benchmarkResults || {});
  }, [benchmarkResults]);

  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor((row, index) => index + 1, {
        id: 'index',
        header: '#',
        cell: (info) => info.getValue(),
        enableSorting: false,
        enableColumnFilter: false,
      }),
      columnHelper.accessor((row) => row.metadata.question_text, {
        id: 'question_text',
        header: 'Question',
        cell: (info) => (
          <span className="max-w-xs truncate block" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
        filterFn: 'includesString',
      }),
      columnHelper.accessor(
        (row) => {
          // First check if raw_answer is in metadata (from CLI export or backend)
          // Then fall back to checkpoint (for live results without raw_answer in metadata)
          return row.metadata.raw_answer || checkpoint?.[row.metadata.question_id]?.raw_answer || '';
        },
        {
          id: 'raw_answer',
          header: 'Raw Answer',
          cell: (info) => {
            const value = info.getValue();
            if (!value) return <span className="text-slate-400">N/A</span>;
            const truncated = value.length > 100 ? value.substring(0, 100) + '...' : value;
            return (
              <span className="max-w-xs truncate block" title={value}>
                {truncated}
              </span>
            );
          },
          filterFn: 'includesString',
        }
      ),
      columnHelper.accessor((row) => row.metadata.completed_without_errors, {
        id: 'completed_without_errors',
        header: 'Completed Without Errors',
        cell: (info) => {
          const row = info.row.original;

          // Check for abstention first
          if (row.template?.abstention_detected && row.template?.abstention_check_performed) {
            return (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                Abstained
              </span>
            );
          }

          // Regular true/false display
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                info.getValue()
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
              }`}
            >
              {info.getValue() ? 'true' : 'false'}
            </span>
          );
        },
        filterFn: (row, columnId, value) => {
          const rowValue = row.getValue(columnId);
          const original = row.original as VerificationResult;

          // If no filter is set, show all
          if (!value || value.size === 0) return true;

          // Check for abstention
          if (value.has('abstained')) {
            if (original.template?.abstention_detected && original.template?.abstention_check_performed) {
              return true;
            }
          }

          // Check for regular success/failed states
          if (
            value.has(true) &&
            rowValue === true &&
            !(original.template?.abstention_detected && original.template?.abstention_check_performed)
          ) {
            return true;
          }
          if (
            value.has(false) &&
            rowValue === false &&
            !(original.template?.abstention_detected && original.template?.abstention_check_performed)
          ) {
            return true;
          }

          return false;
        },
      }),
      columnHelper.accessor((row) => row.template?.verify_result, {
        id: 'verify_result',
        header: 'Verification',
        cell: (info) => {
          const value = info.getValue();
          const row = info.row.original;
          const templatePerformed = row.template?.template_verification_performed;

          // If template verification was not performed (rubric_only mode), show "Not evaluated"
          if (templatePerformed === false) {
            return (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Not evaluated
              </span>
            );
          }

          // Template verification was performed, show result
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                value === true
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                  : value === false
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {value === true ? 'Passed' : value === false ? 'Failed' : 'N/A'}
            </span>
          );
        },
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor((row) => row.template?.parsed_gt_response, {
        id: 'parsed_gt_response',
        header: 'Ground Truth',
        cell: (info) => {
          const value = info.getValue();
          if (!value || Object.keys(value).length === 0) {
            return <span className="text-slate-400 text-xs">N/A</span>;
          }
          const jsonString = JSON.stringify(value);
          const truncated = jsonString.length > 50 ? jsonString.substring(0, 50) + '...' : jsonString;
          return (
            <span
              className="max-w-xs truncate block text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200 px-2 py-1 rounded cursor-help"
              title={JSON.stringify(value, null, 2)}
            >
              {truncated}
            </span>
          );
        },
        filterFn: 'includesString',
      }),
      columnHelper.accessor((row) => row.template?.parsed_llm_response, {
        id: 'parsed_llm_response',
        header: 'LLM Extraction',
        cell: (info) => {
          const value = info.getValue();
          if (!value || Object.keys(value).length === 0) {
            return <span className="text-slate-400 text-xs">N/A</span>;
          }
          const jsonString = JSON.stringify(value);
          const truncated = jsonString.length > 50 ? jsonString.substring(0, 50) + '...' : jsonString;
          return (
            <span
              className="max-w-xs truncate block text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 px-2 py-1 rounded cursor-help"
              title={JSON.stringify(value, null, 2)}
            >
              {truncated}
            </span>
          );
        },
        filterFn: 'includesString',
      }),
      columnHelper.accessor((row) => row.metadata.keywords, {
        id: 'keywords',
        header: 'Keywords',
        cell: (info) => {
          const keywords = info.getValue();
          if (!keywords || keywords.length === 0) {
            return <span className="text-slate-400 text-xs">N/A</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 3).map((keyword, index) => (
                <span
                  key={index}
                  className="text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200 px-2 py-1 rounded"
                  title={keyword}
                >
                  {keyword.length > 12 ? `${keyword.substring(0, 12)}...` : keyword}
                </span>
              ))}
              {keywords.length > 3 && (
                <span className="text-xs text-slate-500 dark:text-slate-400" title={keywords.slice(3).join(', ')}>
                  +{keywords.length - 3}
                </span>
              )}
            </div>
          );
        },
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor((row) => row.metadata.answering_model, {
        id: 'answering_model',
        header: 'Answering Model',
        cell: (info) => (
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 px-2 py-1 rounded truncate block">
            {info.getValue()}
          </span>
        ),
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor((row) => row.metadata.parsing_model, {
        id: 'parsing_model',
        header: 'Parsing Model',
        cell: (info) => (
          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200 px-2 py-1 rounded truncate block">
            {info.getValue()}
          </span>
        ),
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor((row) => row.template?.answering_mcp_servers, {
        id: 'answering_mcp_servers',
        header: 'MCP Servers',
        cell: (info) => {
          const servers = info.getValue();
          if (!servers || servers.length === 0) {
            return <span className="text-slate-400 text-xs">None</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {servers.map((server, index) => (
                <span
                  key={index}
                  className="text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-200 px-2 py-1 rounded"
                  title={server}
                >
                  {server.length > 15 ? `${server.substring(0, 15)}...` : server}
                </span>
              ))}
            </div>
          );
        },
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor(
        (row) => {
          const granularResult = row.template?.verify_granular_result;
          return granularResult !== undefined && granularResult !== null ? 'Yes' : 'No';
        },
        {
          id: 'verify_granular_result',
          header: 'Granular',
          cell: (info) => (
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                info.getValue() === 'Yes'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {info.getValue()}
            </span>
          ),
          filterFn: 'arrIncludesSome',
        }
      ),
      columnHelper.display({
        id: 'rubric',
        header: 'Rubric',
        cell: (info) => {
          const row = info.row.original;
          const rubricPerformed = row.rubric?.rubric_evaluation_performed;

          // If rubric evaluation was not performed, show "Not evaluated"
          if (rubricPerformed === false) {
            return (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Not evaluated
              </span>
            );
          }

          // Rubric evaluation was performed (or field not set - backward compatibility)
          // Combine split trait scores into single object for display
          const combinedRubricResult = row.rubric?.verify_rubric || {
            ...row.rubric?.llm_trait_scores,
            ...row.rubric?.regex_trait_scores,
            ...row.rubric?.callable_trait_scores,
          };

          return (
            <RubricCell rubricResult={combinedRubricResult} metricTraitMetrics={row.rubric?.metric_trait_scores} />
          );
        },
        filterFn: (row, _columnId, value) => {
          // Combine split trait scores for filtering (use new fields, fallback to legacy)
          const rubricResult = row.original.rubric?.verify_rubric || {
            ...row.original.rubric?.llm_trait_scores,
            ...row.original.rubric?.regex_trait_scores,
            ...row.original.rubric?.callable_trait_scores,
          };
          const metricTraitMetrics = row.original.rubric?.metric_trait_scores;

          const hasLLMTraits = rubricResult && Object.keys(rubricResult).length > 0;
          const hasMetricTraits = metricTraitMetrics && Object.keys(metricTraitMetrics).length > 0;

          if (!hasLLMTraits && !hasMetricTraits) return value === 'none';

          const traits = hasLLMTraits ? Object.entries(rubricResult) : [];
          const metricTraits = hasMetricTraits ? Object.entries(metricTraitMetrics) : [];

          const passedTraits = traits.filter(([, val]) => (typeof val === 'boolean' ? val : val && val >= 3)).length;
          const totalTraits = traits.length + metricTraits.length;
          const successRate = totalTraits > 0 ? passedTraits / totalTraits : 0;

          if (value === 'passed') return successRate >= 0.5;
          if (value === 'failed') return successRate < 0.5;
          if (value === 'none') return false;
          return true;
        },
      }),
      columnHelper.display({
        id: 'deep_judgment',
        header: 'Hallucination Risk',
        cell: (info) => <DeepJudgmentCell result={info.row.original} />,
      }),
      columnHelper.accessor((row) => row.metadata.execution_time, {
        id: 'execution_time',
        header: 'Time',
        cell: (info) => (info.getValue() ? `${info.getValue().toFixed(2)}s` : 'N/A'),
        filterFn: 'inNumberRange',
      }),
      columnHelper.accessor((row) => row.metadata.timestamp, {
        id: 'timestamp',
        header: 'Timestamp',
        cell: (info) => (info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'),
        sortingFn: 'datetime',
        filterFn: 'inDateRange',
      }),
      columnHelper.accessor((row) => row.metadata.run_name, {
        id: 'run_name',
        header: 'Run',
        cell: (info) => info.getValue() || 'N/A',
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor((row) => row.metadata.replicate, {
        id: 'replicate',
        header: 'Replicate',
        cell: (info) => info.getValue()?.toString() || '',
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            onClick={() => onViewResult(info.row.original)}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            aria-label="View detailed trace"
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      }),
    ],
    [checkpoint, onViewResult]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: {
      inDateRange: (row, columnId, value) => {
        const date = new Date(row.getValue(columnId));
        const [start, end] = value;
        if (start && date < new Date(start)) return false;
        if (end && date > new Date(end + 'T23:59:59')) return false;
        return true;
      },
      arrIncludesSome: (row, columnId, value) => {
        if (value.size === 0) return true;
        const rowValue = row.getValue(columnId);
        // Handle array values (e.g., MCP servers, granular checks)
        if (Array.isArray(rowValue)) {
          return rowValue.some((item) => value.has(item));
        }
        // Handle single values (e.g., other filterable columns)
        return value.has(rowValue);
      },
    },
  });

  // Debounced search effect
  const debouncedQuestionSearch = useDebounce(questionSearchText, 300);
  const debouncedRawAnswerSearch = useDebounce(rawAnswerSearchText, 300);

  useEffect(() => {
    const questionColumn = table.getColumn('question_text');
    if (questionColumn) {
      questionColumn.setFilterValue(debouncedQuestionSearch || undefined);
    }
  }, [debouncedQuestionSearch, table]);

  useEffect(() => {
    const rawAnswerColumn = table.getColumn('raw_answer');
    if (rawAnswerColumn) {
      rawAnswerColumn.setFilterValue(debouncedRawAnswerSearch || undefined);
    }
  }, [debouncedRawAnswerSearch, table]);

  // Report filtered count changes to parent
  useEffect(() => {
    if (onFilteredCountChange) {
      const filteredCount = table.getFilteredRowModel().rows.length;
      const totalCount = data.length;
      onFilteredCountChange(filteredCount, totalCount);
    }
  }, [table, data.length, onFilteredCountChange]);

  // Get unique values for filter options
  const getUniqueModels = () => {
    try {
      if (!benchmarkResults) {
        return { answeringModels: [], parsingModels: [], runNames: [], replicates: [], mcpServers: [] };
      }
      const allResults = Object.values(benchmarkResults);
      const answeringModels = new Set(
        allResults.map((r) => r.metadata.answering_model).filter((model): model is string => Boolean(model))
      );
      const parsingModels = new Set(
        allResults.map((r) => r.metadata.parsing_model).filter((model): model is string => Boolean(model))
      );
      const runNames = new Set(
        allResults.map((r) => r.metadata.run_name).filter((name): name is string => Boolean(name))
      );
      const replicates = new Set(
        allResults.map((r) => {
          const replicateValue = r.metadata.replicate;
          return replicateValue ? replicateValue.toString() : 'Single';
        })
      );
      // Extract unique MCP servers
      const mcpServersSet = new Set<string>();
      allResults.forEach((r) => {
        const servers = r.template?.answering_mcp_servers;
        if (servers && Array.isArray(servers)) {
          servers.forEach((server) => mcpServersSet.add(server));
        }
      });
      return {
        answeringModels: Array.from(answeringModels),
        parsingModels: Array.from(parsingModels),
        runNames: Array.from(runNames),
        replicates: Array.from(replicates),
        mcpServers: Array.from(mcpServersSet).sort(),
      };
    } catch (e) {
      logger.error('BENCHMARK_TABLE', 'Error in getUniqueModels', 'BenchmarkTable', { error: e });
      return { answeringModels: [], parsingModels: [], runNames: [], replicates: [], mcpServers: [] };
    }
  };

  const renderTable = () => {
    try {
      const { answeringModels, parsingModels, runNames, replicates, mcpServers } = getUniqueModels();

      if (table.getRowModel().rows.length === 0) {
        return (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {data.length === 0
              ? 'No test results yet. Run some tests to see results here.'
              : 'No results match the current filters. Try adjusting your filter criteria.'}
          </div>
        );
      }

      const totalRows = table.getFilteredRowModel().rows.length;

      return (
        <div className="space-y-2">
          {/* Results count and filter controls */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Showing {totalRows} {totalRows === 1 ? 'result' : 'results'}
            </span>
            {(table.getState().columnFilters.length > 0 || questionSearchText || rawAnswerSearchText) && (
              <button
                onClick={() => {
                  table.resetColumnFilters();
                  setQuestionSearchText('');
                  setRawAnswerSearchText('');
                }}
                className="text-xs px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {/* Scrollable Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full" data-testid="benchmark-results-table">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b-2 border-slate-300 dark:border-slate-600">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={`py-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 ${header.id === 'index' ? 'w-16 text-center' : 'text-left'}`}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="space-y-2">
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none flex items-center'
                                  : '',
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && <SortIndicator getIsSorted={header.column.getIsSorted} />}
                            </div>
                            {header.id === 'question_text' && (
                              <input
                                type="text"
                                placeholder="Search questions..."
                                value={questionSearchText}
                                onChange={(e) => setQuestionSearchText(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                              />
                            )}
                            {header.id === 'raw_answer' && (
                              <input
                                type="text"
                                placeholder="Search answers..."
                                value={rawAnswerSearchText}
                                onChange={(e) => setRawAnswerSearchText(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                              />
                            )}
                            {['answering_model', 'parsing_model', 'run_name', 'replicate'].includes(header.id) && (
                              <MultiSelectFilter
                                options={
                                  header.id === 'answering_model'
                                    ? answeringModels
                                    : header.id === 'parsing_model'
                                      ? parsingModels
                                      : header.id === 'run_name'
                                        ? runNames
                                        : replicates
                                }
                                selectedValues={(header.column.getFilterValue() as Set<string>) ?? new Set()}
                                onChange={(values) =>
                                  header.column.setFilterValue(values.size > 0 ? values : undefined)
                                }
                                placeholder={`All ${header.id.includes('model') ? 'models' : header.id === 'run_name' ? 'runs' : ''}`}
                              />
                            )}
                            {header.id === 'completed_without_errors' && (
                              <MultiSelectFilter
                                options={['true', 'false', 'abstained']}
                                selectedValues={(() => {
                                  const filterValue = header.column.getFilterValue() as
                                    | Set<boolean | string>
                                    | undefined;
                                  if (!filterValue) return new Set();
                                  const displayValues = new Set<string>();
                                  if (filterValue.has(true)) displayValues.add('true');
                                  if (filterValue.has(false)) displayValues.add('false');
                                  if (filterValue.has('abstained')) displayValues.add('abstained');
                                  return displayValues;
                                })()}
                                onChange={(values) => {
                                  const filterValues = new Set<boolean | string>();
                                  if (values.has('true')) filterValues.add(true);
                                  if (values.has('false')) filterValues.add(false);
                                  if (values.has('abstained')) filterValues.add('abstained');
                                  header.column.setFilterValue(filterValues.size > 0 ? filterValues : undefined);
                                }}
                                placeholder="All statuses"
                              />
                            )}
                            {header.id === 'verify_result' && (
                              <MultiSelectFilter
                                options={['Passed', 'Failed', 'N/A']}
                                selectedValues={(() => {
                                  const filterValue = header.column.getFilterValue() as
                                    | Set<boolean | string>
                                    | undefined;
                                  if (!filterValue) return new Set();
                                  const displayValues = new Set<string>();
                                  if (filterValue.has(true)) displayValues.add('Passed');
                                  if (filterValue.has(false)) displayValues.add('Failed');
                                  if (filterValue.has('N/A')) displayValues.add('N/A');
                                  return displayValues;
                                })()}
                                onChange={(values) => {
                                  const filterValues = new Set<boolean | string>();
                                  if (values.has('Passed')) filterValues.add(true);
                                  if (values.has('Failed')) filterValues.add(false);
                                  if (values.has('N/A')) filterValues.add('N/A');
                                  header.column.setFilterValue(filterValues.size > 0 ? filterValues : undefined);
                                }}
                                placeholder="All results"
                              />
                            )}
                            {header.id === 'verify_granular_result' && (
                              <MultiSelectFilter
                                options={['Yes', 'No']}
                                selectedValues={(header.column.getFilterValue() as Set<string>) ?? new Set()}
                                onChange={(values) => {
                                  const filterValues = new Set<string>();
                                  if (values.has('Yes')) filterValues.add('Yes');
                                  if (values.has('No')) filterValues.add('No');
                                  header.column.setFilterValue(filterValues.size > 0 ? filterValues : undefined);
                                }}
                                placeholder="All"
                              />
                            )}
                            {header.id === 'answering_mcp_servers' && (
                              <MultiSelectFilter
                                options={mcpServers}
                                selectedValues={(header.column.getFilterValue() as Set<string>) ?? new Set()}
                                onChange={(values) =>
                                  header.column.setFilterValue(values.size > 0 ? values : undefined)
                                }
                                placeholder="All MCP"
                              />
                            )}
                            {header.id === 'execution_time' && (
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  value={(header.column.getFilterValue() as [number, number])?.[0] ?? ''}
                                  onChange={(e) =>
                                    header.column.setFilterValue((old: [number, number]) => [
                                      e.target.value ? Number(e.target.value) : undefined,
                                      old?.[1],
                                    ])
                                  }
                                  className="w-12 px-1 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                  step="0.1"
                                />
                                <input
                                  type="number"
                                  placeholder="Max"
                                  value={(header.column.getFilterValue() as [number, number])?.[1] ?? ''}
                                  onChange={(e) =>
                                    header.column.setFilterValue((old: [number, number]) => [
                                      old?.[0],
                                      e.target.value ? Number(e.target.value) : undefined,
                                    ])
                                  }
                                  className="w-12 px-1 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                  step="0.1"
                                />
                              </div>
                            )}
                            {header.id === 'timestamp' && (
                              <div className="space-y-1">
                                <input
                                  type="date"
                                  value={(header.column.getFilterValue() as [string, string])?.[0] ?? ''}
                                  onChange={(e) =>
                                    header.column.setFilterValue((old: [string, string]) => [e.target.value, old?.[1]])
                                  }
                                  className="w-full px-1 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                />
                                <input
                                  type="date"
                                  value={(header.column.getFilterValue() as [string, string])?.[1] ?? ''}
                                  onChange={(e) =>
                                    header.column.setFilterValue((old: [string, string]) => [old?.[0], e.target.value])
                                  }
                                  className="w-full px-1 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-2 px-3 text-sm text-slate-600 dark:text-slate-400">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } catch (err) {
      logger.error('BENCHMARK_TABLE', 'Error rendering results table', 'BenchmarkTable', { error: err });
      return (
        <div className="text-center py-8 text-red-500 dark:text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Error displaying results. Please check the console for details.</p>
          <p className="text-sm mt-1">Error: {err instanceof Error ? err.message : 'Unknown error'}</p>
        </div>
      );
    }
  };

  return renderTable();
};
