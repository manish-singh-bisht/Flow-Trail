import type { FilterConfig } from '../../types/filter';
import type { Step } from '../../types/flow';
import { initDB, STORE_NAME } from './indexed-db';

interface ObservationData {
  id: string;
  stepId: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  queryable: Record<string, string | number | boolean | null> | null;
}

export async function storeObservations(steps: Step[]): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  for (const step of steps) {
    for (const observation of step.observations) {
      if (observation.data) {
        await new Promise<void>((resolve, reject) => {
          const request = store.put({
            id: observation.id,
            stepId: step.id,
            name: observation.name,
            data: observation.data,
            queryable: observation.queryable,
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }
  }
}

export async function getObservationById(observationId: string): Promise<ObservationData | null> {
  const database = await initDB();
  const transaction = database.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('id');

  return new Promise((resolve, reject) => {
    const request = index.get(observationId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function checkObservationsExist(stepIds: string[]): Promise<boolean> {
  const database = await initDB();
  const transaction = database.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('stepId');

  const checks = stepIds.map(
    (stepId) =>
      new Promise<boolean>((resolve) => {
        const request = index.count(IDBKeyRange.only(stepId));
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => resolve(false);
      })
  );

  const results = await Promise.all(checks);
  return results.every((exists) => exists);
}
/**
 * Get a value from an object using a nested path (e.g., "user.name" or "data.scores.total")
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

export async function filterObservationData(
  observationId: string,
  filters: FilterConfig[]
): Promise<ObservationData['data']> {
  const observation = await getObservationById(observationId);

  if (!observation || !observation.data || !Array.isArray(observation.data)) {
    return [];
  }

  // Queryable data format: array of objects
  // Filtering supports nested paths (e.g., "user.name", "data.scores.total")
  // Example:
  // [
  //   {
  //     id: string;
  //     user: { name: string; age: number };
  //     scores: { total: number };
  //   }
  // ]

  // Filter the array items - supports nested path access
  return observation.data.filter((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return filters.every(({ path, operator, value, type }) => {
      // Get value using nested path
      const dataValue = getNestedValue(item, path);

      // If path doesn't exist, exclude this item
      if (dataValue === undefined) return false;

      // Handle type-specific comparisons
      switch (type) {
        case 'number': {
          const numDataValue =
            typeof dataValue === 'string' ? parseFloat(dataValue) : Number(dataValue);
          const numFilterValue = typeof value === 'string' ? parseFloat(value) : Number(value);

          if (isNaN(numDataValue) || isNaN(numFilterValue)) {
            return false;
          }

          switch (operator) {
            case 'eq':
              return numDataValue === numFilterValue;
            case 'gt':
              return numDataValue > numFilterValue;
            case 'lt':
              return numDataValue < numFilterValue;
            case 'gte':
              return numDataValue >= numFilterValue;
            case 'lte':
              return numDataValue <= numFilterValue;
            default:
              return false;
          }
        }
        case 'boolean': {
          const boolDataValue =
            typeof dataValue === 'string' ? dataValue.toLowerCase() === 'true' : Boolean(dataValue);
          const boolFilterValue =
            typeof value === 'string' ? value.toLowerCase() === 'true' : Boolean(value);

          // For boolean, only eq operator makes sense
          if (operator === 'eq') {
            return boolDataValue === boolFilterValue;
          }
          return false;
        }
        case 'string': {
          const strDataValue = String(dataValue);
          const strFilterValue = String(value);

          // For string, only eq operator makes sense
          if (operator === 'eq') {
            return strDataValue === strFilterValue;
          }
          return false;
        }
        default:
          return false;
      }
    });
  });
}
