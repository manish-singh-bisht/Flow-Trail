import type { Step } from '../types/flow';
import {
  checkObservationsExist,
  storeObservations,
  getObservationById,
} from '../utils/indexed-db/observation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LoadObservationsMessage {
  type: 'LOAD_OBSERVATIONS';
  payload: {
    flowId: string;
    steps: Step[];
  };
}

interface WorkerResponse {
  type: 'OBSERVATIONS_LOADED' | 'OBSERVATIONS_ERROR';
  payload?: {
    steps: Step[];
  };
  error?: string;
}

async function loadObservationDataFromBackend(flowId: string): Promise<Step[]> {
  const response = await fetch(`${API_BASE_URL}/api/flows/${flowId}/details`);
  if (!response.ok) {
    throw new Error(`Failed to fetch flow details: ${response.statusText}`);
  }
  const flowData: { steps: Step[] } = await response.json();
  return flowData.steps;
}

async function loadObservationsFromIndexedDB(steps: Step[]): Promise<Step[]> {
  const stepsWithData: Step[] = [];

  for (const step of steps) {
    const observationsWithData = await Promise.all(
      step.observations.map(async (observation) => {
        const stored = await getObservationById(observation.id);
        if (stored && stored.data !== undefined) {
          return {
            ...observation,
            data: stored.data,
          };
        }
        return observation;
      })
    );

    stepsWithData.push({
      ...step,
      observations: observationsWithData,
    });
  }

  return stepsWithData;
}

self.onmessage = async (event: MessageEvent<LoadObservationsMessage>) => {
  const { type, payload } = event.data;

  if (type === 'LOAD_OBSERVATIONS') {
    try {
      const { flowId, steps } = payload;

      // Check which observations need to be loaded
      const stepIds = steps.map((step) => step.id);
      const hasAllDataInDB = await checkObservationsExist(stepIds);

      let stepsWithData: Step[];

      if (hasAllDataInDB) {
        // Load all data from IndexedDB
        stepsWithData = await loadObservationsFromIndexedDB(steps);
      } else {
        // Load from backend (which checks cache, then S3)
        const backendSteps = await loadObservationDataFromBackend(flowId);

        // Store in IndexedDB
        await storeObservations(backendSteps);

        stepsWithData = backendSteps;
      }

      const response: WorkerResponse = {
        type: 'OBSERVATIONS_LOADED',
        payload: {
          steps: stepsWithData,
        },
      };

      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        type: 'OBSERVATIONS_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      self.postMessage(response);
    }
  }
};
