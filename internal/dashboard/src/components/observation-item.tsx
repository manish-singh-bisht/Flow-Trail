import type { Observation } from '../types/flow';

interface ObservationItemProps {
  observation: Observation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  dataLoaded: boolean;
  isLoading: boolean;
  isFiltered?: boolean;
  originalDataLength?: number;
}

export default function ObservationItem({
  data,
  dataLoaded,
  isLoading,
  isFiltered = false,
  originalDataLength,
}: ObservationItemProps) {
  if (!dataLoaded) {
    return (
      <div className="text-sm text-gray-500">
        Observation data not loaded. Loading observation data will populate this section.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">Filtering...</p>
      </div>
    );
  }

  // Handle null or undefined data
  if (data === null || data === undefined) {
    return <div className="text-sm text-gray-500">No data available</div>;
  }

  // Handle array data
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="text-sm text-gray-500">
          {isFiltered && originalDataLength && originalDataLength > 0
            ? 'No items match the filters'
            : 'No data available'}
        </div>
      );
    }

    return (
      <div>
        {isFiltered && originalDataLength !== undefined && (
          <div className="text-xs text-gray-500 mb-2">
            Showing {data.length} of {originalDataLength} items
          </div>
        )}
        {!isFiltered && (
          <div className="text-xs text-gray-500 mb-2">Showing {data.length} items</div>
        )}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.map((item, index) => (
            <div key={index} className="border rounded p-3 bg-gray-50">
              <pre className="text-xs overflow-auto">{JSON.stringify(item, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle object data (non-array)
  return (
    <div>
      <div className="border rounded p-3 bg-gray-50 max-h-96 overflow-y-auto">
        <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
