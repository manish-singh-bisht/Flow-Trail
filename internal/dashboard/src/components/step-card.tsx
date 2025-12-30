import { useState } from 'react';
import type { Step } from '../types/flow';
import { filterObservationData } from '../utils/indexed-db/observation';
import type { FilterConfig, QueryableType } from '../types/filter';
import ObservationItem from './observation-item.tsx';

interface StepCardProps {
  step: Step;
  dataLoaded: boolean;
}

type FilterOperator = 'eq' | 'gt' | 'lt' | 'gte' | 'lte';

export default function StepCard({ step, dataLoaded }: StepCardProps) {
  const [filterInputs, setFilterInputs] = useState<
    Record<string, { operator: FilterOperator; value: string }>
  >({});
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterConfig[]>>({});
  const [filteredData, setFilteredData] = useState<Record<string, unknown[]>>({});
  const [loadingFilters, setLoadingFilters] = useState<Record<string, boolean>>({});

  const getQueryableFields = (observation: (typeof step.observations)[0]) => {
    if (!observation.queryable) return [];
    // queryable is now Record<path, type> where path can be nested like "user.name"
    return Object.entries(observation.queryable).map(([path, value]) => ({
      path,
      type: (typeof value === 'string' ? value : typeof value) as QueryableType,
    }));
  };

  const handleFilterInputChange = (
    observationId: string,
    path: string,
    operator: FilterOperator,
    value: string
  ) => {
    setFilterInputs((prev) => ({
      ...prev,
      [`${observationId}-${path}`]: { operator, value },
    }));
  };

  const applyFilters = async (observationId: string) => {
    const observation = step.observations.find((obs) => obs.id === observationId);
    if (!observation || !observation.queryable) return;

    const filters: FilterConfig[] = [];
    const queryableFields = getQueryableFields(observation);

    queryableFields.forEach(({ path, type }) => {
      const inputKey = `${observationId}-${path}`;
      const input = filterInputs[inputKey];
      if (input && input.value.trim()) {
        let value: string | number | boolean = input.value.trim();

        // Convert based on type
        if (type === 'number') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            value = numValue;
          } else {
            return; // Skip invalid number
          }
        } else if (type === 'boolean') {
          value = value.toLowerCase() === 'true';
        }
        // string stays as string

        filters.push({
          path,
          operator: input.operator,
          value: value.toString(),
          type,
        });
      }
    });

    if (filters.length === 0) {
      // Clear filters - remove from filteredData
      setFilteredData((prev) => {
        const newData = { ...prev };
        delete newData[observationId];
        return newData;
      });
      setActiveFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters[observationId];
        return newFilters;
      });
      return;
    }

    try {
      setLoadingFilters((prev) => ({ ...prev, [observationId]: true }));
      setActiveFilters((prev) => ({ ...prev, [observationId]: filters }));
      const filtered = await filterObservationData(observationId, filters);
      setFilteredData((prev) => ({ ...prev, [observationId]: filtered }));
    } catch (error) {
      console.error('Failed to filter observation:', error);
    } finally {
      setLoadingFilters((prev) => ({ ...prev, [observationId]: false }));
    }
  };

  const clearFilters = async (observationId: string) => {
    setFilteredData((prev) => {
      const newData = { ...prev };
      delete newData[observationId];
      return newData;
    });
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[observationId];
      return newFilters;
    });
    // Clear input fields for this observation
    setFilterInputs((prev) => {
      const newFilters = { ...prev };
      Object.keys(newFilters).forEach((key) => {
        if (key.startsWith(`${observationId}-`)) {
          delete newFilters[key];
        }
      });
      return newFilters;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const operatorLabels: Record<FilterOperator, string> = {
    eq: '=',
    gt: '>',
    lt: '<',
    gte: '>=',
    lte: '<=',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">
            {step.position + 1}. {step.name}
          </h3>
          <div className="text-xs text-gray-500 mb-3">Version {step.version}</div>
          {step.reason && (
            <div className="mt-3 p-4 bg-linear-to-r from-amber-50 to-orange-50 border-l-4 border-orange-400 rounded-r-lg shadow-sm">
              <div className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5"></div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                    Step Result
                  </div>
                  <div className="text-sm text-orange-900 font-medium leading-relaxed">
                    {step.reason}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ml-4 shrink-0 ${getStatusColor(step.status)}`}
        >
          {step.status}
        </span>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <div>Started: {step.startedAt ? new Date(step.startedAt).toLocaleString() : '-'}</div>
        <div>Finished: {step.finishedAt ? new Date(step.finishedAt).toLocaleString() : '-'}</div>
      </div>

      <div className="space-y-6">
        {step.observations.map((observation) => {
          const queryableFields = getQueryableFields(observation);
          const hasFilters =
            activeFilters[observation.id] && activeFilters[observation.id].length > 0;
          // Use filtered data if available, otherwise use original observation data
          const observationData =
            filteredData[observation.id] !== undefined
              ? filteredData[observation.id]
              : observation.data;
          const isLoading = loadingFilters[observation.id];
          const isArrayData = Array.isArray(observation.data);

          return (
            <div key={observation.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">
                  {observation.name} (v{observation.version})
                </h4>
                {observation.queryable && <span className="text-xs text-gray-500">Queryable</span>}
              </div>

              {dataLoaded && queryableFields.length > 0 && isArrayData && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <h5 className="text-sm font-medium mb-2">Filters:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {queryableFields.map(({ path, type }) => {
                      const inputKey = `${observation.id}-${path}`;
                      const input = filterInputs[inputKey] || {
                        operator: 'eq' as FilterOperator,
                        value: '',
                      };

                      // Only show comparison operators for numbers
                      const showComparisonOps = type === 'number';

                      return (
                        <div key={path} className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 block" title={path}>
                            {path}
                            <span className="text-xs text-gray-500 ml-2">({type})</span>
                          </label>
                          <div className="flex items-center gap-2">
                            {showComparisonOps ? (
                              <select
                                value={input.operator}
                                onChange={(e) =>
                                  handleFilterInputChange(
                                    observation.id,
                                    path,
                                    e.target.value as FilterOperator,
                                    input.value
                                  )
                                }
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="eq">=</option>
                                <option value="gt">&gt;</option>
                                <option value="lt">&lt;</option>
                                <option value="gte">&gt;=</option>
                                <option value="lte">&lt;=</option>
                              </select>
                            ) : (
                              <span className="w-16 px-2 py-1 text-sm text-gray-600 text-center block">
                                =
                              </span>
                            )}
                            <input
                              type={
                                type === 'number' ? 'number' : type === 'boolean' ? 'text' : 'text'
                              }
                              value={input.value}
                              onChange={(e) =>
                                handleFilterInputChange(
                                  observation.id,
                                  path,
                                  input.operator,
                                  e.target.value
                                )
                              }
                              placeholder={
                                type === 'boolean' ? 'Enter true or false' : `Enter ${type}`
                              }
                              className="w-48 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => applyFilters(observation.id)}
                      disabled={isLoading}
                      className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Filtering...' : 'Apply Filters'}
                    </button>
                    {hasFilters && (
                      <button
                        onClick={() => clearFilters(observation.id)}
                        className="px-4 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {hasFilters && (
                    <div className="mt-2 text-xs text-gray-600">
                      Active filters:{' '}
                      {activeFilters[observation.id].map((f, idx) => (
                        <span key={idx} className="mr-2">
                          {f.path} {operatorLabels[f.operator]} {String(f.value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ObservationItem
                observation={observation}
                data={observationData}
                dataLoaded={dataLoaded}
                isLoading={isLoading}
                isFiltered={hasFilters}
                originalDataLength={
                  Array.isArray(observation.data) ? observation.data.length : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
