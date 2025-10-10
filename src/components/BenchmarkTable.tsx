import React, { useMemo, useEffect, useState } from 'react';
import { Eye, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { VerificationResult } from '../types';
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

declare module '@tanstack/react-table' {
  interface FilterFns {
    inDateRange: FilterFn<unknown>;
    arrIncludesSome: FilterFn<unknown>;
  }
}

// VerificationResult interface now imported from types

interface BenchmarkTableProps {
  benchmarkResults: Record<string, VerificationResult>;
  checkpoint?: Record<string, { raw_answer?: string; [key: string]: unknown }>;
  onViewResult: (result: VerificationResult) => void;
  onFilteredCountChange?: (filteredCount: number, totalCount: number) => void;
}

const columnHelper = createColumnHelper<VerificationResult>();

const RubricCell: React.FC<{ rubricResult: Record<string, number | boolean> | null }> = ({ rubricResult }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!rubricResult) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        N/A
      </span>
    );
  }

  const traits = Object.entries(rubricResult);
  const passedTraits = traits.filter(([, value]) => (typeof value === 'boolean' ? value : value && value >= 3)).length;
  const totalTraits = traits.length;

  const summary = `${passedTraits}/${totalTraits}`;
  const hasGoodResults = passedTraits >= totalTraits * 0.5;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center px-2 py-1 rounded text-xs ${
          hasGoodResults
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
        } hover:opacity-80`}
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
        {summary}
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-1 text-xs">
          {traits.map(([name, value]) => (
            <div
              key={name}
              className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded"
            >
              <span className="font-medium text-slate-700 dark:text-slate-300">{name}:</span>
              <span
                className={`font-semibold ${
                  typeof value === 'boolean'
                    ? value
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                    : value && value >= 3
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value || 'N/A'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MultiSelectFilter: React.FC<{
  options: string[];
  selectedValues: Set<string>;
  onChange: (values: Set<string>) => void;
  placeholder: string;
}> = ({ options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-left truncate"
      >
        {selectedValues.size === 0 ? placeholder : `${selectedValues.size} selected`}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded shadow-lg max-h-32 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedValues.has(option)}
                onChange={(e) => {
                  const newValues = new Set(selectedValues);
                  if (e.target.checked) {
                    newValues.add(option);
                  } else {
                    newValues.delete(option);
                  }
                  onChange(newValues);
                }}
                className="mr-2"
              />
              <span className="text-xs text-slate-900 dark:text-slate-100 truncate">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const SortIndicator = ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc' } }) => {
  const sorted = column.getIsSorted();
  if (!sorted) {
    return <span className="text-slate-400 ml-1">↕</span>;
  }
  return <span className="text-indigo-600 dark:text-indigo-400 ml-1">{sorted === 'asc' ? '↑' : '↓'}</span>;
};

export const BenchmarkTable: React.FC<BenchmarkTableProps> = ({
  benchmarkResults,
  checkpoint,
  onViewResult,
  onFilteredCountChange,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [questionSearchText, setQuestionSearchText] = useState('');
  const [rawAnswerSearchText, setRawAnswerSearchText] = useState('');

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
      columnHelper.accessor('question_text', {
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
          // Access the expected raw answer from checkpoint using question_id
          return checkpoint?.[row.question_id]?.raw_answer || '';
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
      columnHelper.accessor('parsed_gt_response', {
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
      columnHelper.accessor('parsed_llm_response', {
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
      columnHelper.accessor('keywords', {
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
      columnHelper.accessor('answering_model', {
        header: 'Answering Model',
        cell: (info) => (
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 px-2 py-1 rounded truncate block">
            {info.getValue()}
          </span>
        ),
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor('parsing_model', {
        header: 'Parsing Model',
        cell: (info) => (
          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200 px-2 py-1 rounded truncate block">
            {info.getValue()}
          </span>
        ),
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor('answering_mcp_servers', {
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
      columnHelper.accessor('success', {
        header: 'Status',
        cell: (info) => {
          const row = info.row.original;

          // Check for abstention first
          if (row.abstention_detected && row.abstention_check_performed) {
            return (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                Abstained
              </span>
            );
          }

          // Regular success/failed display
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                info.getValue()
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
              }`}
            >
              {info.getValue() ? 'Success' : 'Failed'}
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
            if (original.abstention_detected && original.abstention_check_performed) {
              return true;
            }
          }

          // Check for regular success/failed states
          if (
            value.has(true) &&
            rowValue === true &&
            !(original.abstention_detected && original.abstention_check_performed)
          ) {
            return true;
          }
          if (
            value.has(false) &&
            rowValue === false &&
            !(original.abstention_detected && original.abstention_check_performed)
          ) {
            return true;
          }

          return false;
        },
      }),
      columnHelper.accessor('verify_result', {
        header: 'Verification',
        cell: (info) => {
          const value = info.getValue();
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
        filterFn: 'equals',
      }),
      columnHelper.accessor('verify_granular_result', {
        header: 'Granular',
        cell: (info) => (
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs ${
              info.getValue() !== undefined && info.getValue() !== null
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {info.getValue() !== undefined && info.getValue() !== null ? 'Yes' : 'No'}
          </span>
        ),
        filterFn: 'equals',
      }),
      columnHelper.accessor('verify_rubric', {
        header: 'Rubric',
        cell: (info) => <RubricCell rubricResult={info.getValue()} />,
        filterFn: (row, columnId, value) => {
          const rubricResult = row.getValue(columnId) as Record<string, number | boolean> | null;
          if (!rubricResult) return value === 'none';

          const traits = Object.entries(rubricResult);
          const passedTraits = traits.filter(([, val]) => (typeof val === 'boolean' ? val : val && val >= 3)).length;
          const successRate = passedTraits / traits.length;

          if (value === 'passed') return successRate >= 0.5;
          if (value === 'failed') return successRate < 0.5;
          if (value === 'none') return false;
          return true;
        },
      }),
      columnHelper.accessor('execution_time', {
        header: 'Time',
        cell: (info) => (info.getValue() ? `${info.getValue().toFixed(2)}s` : 'N/A'),
        filterFn: 'inNumberRange',
      }),
      columnHelper.accessor('timestamp', {
        header: 'Timestamp',
        cell: (info) => (info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'),
        sortingFn: 'datetime',
        filterFn: 'inDateRange',
      }),
      columnHelper.accessor('run_name', {
        header: 'Run',
        cell: (info) => info.getValue() || 'N/A',
        filterFn: 'arrIncludesSome',
      }),
      columnHelper.accessor((row) => row.answering_replicate || row.parsing_replicate, {
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
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      }),
    ],
    [onViewResult, checkpoint]
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
        return { answeringModels: [], parsingModels: [], runNames: [], replicates: [] };
      }
      const allResults = Object.values(benchmarkResults);
      const answeringModels = new Set(
        allResults.map((r) => r.answering_model).filter((model): model is string => Boolean(model))
      );
      const parsingModels = new Set(
        allResults.map((r) => r.parsing_model).filter((model): model is string => Boolean(model))
      );
      const runNames = new Set(allResults.map((r) => r.run_name).filter((name): name is string => Boolean(name)));
      const replicates = new Set(
        allResults.map((r) => {
          const replicateValue = r.answering_replicate || r.parsing_replicate;
          return replicateValue ? replicateValue.toString() : 'Single';
        })
      );
      return {
        answeringModels: Array.from(answeringModels),
        parsingModels: Array.from(parsingModels),
        runNames: Array.from(runNames),
        replicates: Array.from(replicates),
      };
    } catch (e) {
      console.error('Error in getUniqueModels:', e);
      return { answeringModels: [], parsingModels: [], runNames: [], replicates: [] };
    }
  };

  const renderTable = () => {
    try {
      const { answeringModels, parsingModels, runNames, replicates } = getUniqueModels();

      if (table.getRowModel().rows.length === 0) {
        return (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {data.length === 0
              ? 'No test results yet. Run some tests to see results here.'
              : 'No results match the current filters. Try adjusting your filter criteria.'}
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="benchmark-results-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200 dark:border-slate-600">
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
                            {header.column.getCanSort() && <SortIndicator column={header.column} />}
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
                              onChange={(values) => header.column.setFilterValue(values.size > 0 ? values : undefined)}
                              placeholder={`All ${header.id.includes('model') ? 'models' : header.id === 'run_name' ? 'runs' : ''}`}
                            />
                          )}
                          {header.id === 'success' && (
                            <MultiSelectFilter
                              options={['Success', 'Failed', 'Abstained']}
                              selectedValues={(header.column.getFilterValue() as Set<string>) ?? new Set()}
                              onChange={(values) => {
                                const filterValues = new Set<boolean | string>();
                                if (values.has('Success')) filterValues.add(true);
                                if (values.has('Failed')) filterValues.add(false);
                                if (values.has('Abstained')) filterValues.add('abstained');
                                header.column.setFilterValue(filterValues.size > 0 ? filterValues : undefined);
                              }}
                              placeholder="All statuses"
                            />
                          )}
                          {header.id === 'verify_result' && (
                            <MultiSelectFilter
                              options={['Passed', 'Failed', 'N/A']}
                              selectedValues={(header.column.getFilterValue() as Set<string>) ?? new Set()}
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
      );
    } catch (err) {
      console.error('Error rendering results table:', err);
      return (
        <div className="text-center py-8 text-red-500 dark:text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Error displaying results. Please check the console for details.</p>
          <p className="text-sm mt-1">Error: {err instanceof Error ? err.message : 'Unknown error'}</p>
        </div>
      );
    }
  };

  // Reset filters function
  // Note: resetFilters function removed since it was unused after removing useImperativeHandle
  // If needed in the future, can be re-added when component is converted to forwardRef

  return renderTable();
};
