import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flowsApi } from '../services/flow';
import type { FlowDetails } from '../types/flow';
import StepCard from '../components/step-card';
import ObservationLoaderWorker from '../workers/observation-loader.worker?worker';

export default function FlowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<FlowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (id) {
      loadFlow();
    }

    return () => {
      // Cleanup worker on unmount
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadFlow() {
    if (!id) return;
    try {
      setLoading(true);

      // Load flow structure first (fast, without observation data)
      const flowData = await flowsApi.getById(id);
      setFlow(flowData);

      // Start loading observation data via worker
      if (flowData.steps.length > 0) {
        loadObservationData(flowData);
      }
    } catch (error) {
      console.error('Failed to load flow:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadObservationData(flowData: FlowDetails) {
    if (!id) return;

    // Create worker if it doesn't exist
    if (!workerRef.current) {
      workerRef.current = new ObservationLoaderWorker();

      workerRef.current.onmessage = (event) => {
        const { type, payload, error } = event.data;

        if (type === 'OBSERVATIONS_LOADED' && payload) {
          // Update flow with observation data
          setFlow((currentFlow) => {
            if (!currentFlow) return currentFlow;
            return {
              ...currentFlow,
              steps: payload.steps,
            };
          });
          setDataLoaded(true);
          setLoadingData(false);
        } else if (type === 'OBSERVATIONS_ERROR') {
          console.error('Failed to load observation data:', error);
          setLoadingData(false);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setLoadingData(false);
      };
    }

    setLoadingData(true);

    // Send message to worker to load observations
    workerRef.current.postMessage({
      type: 'LOAD_OBSERVATIONS',
      payload: {
        flowId: id,
        steps: flowData.steps,
      },
    });
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading flow...</p>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Flow not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Back to Flows
        </button>
        <h1 className="text-3xl font-bold">{flow.name}</h1>
        <div className="mt-2 text-sm text-gray-500">
          Created: {new Date(flow.createdAt).toLocaleString()}
          {flow.finishedAt && ` • Finished: ${new Date(flow.finishedAt).toLocaleString()}`}
        </div>
      </div>

      {loadingData && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-800">Loading observation data...</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {flow.steps.map((step) => (
          <StepCard key={step.id} step={step} dataLoaded={dataLoaded} />
        ))}
      </div>
    </div>
  );
}
