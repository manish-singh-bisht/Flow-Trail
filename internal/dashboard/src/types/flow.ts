export interface Flow {
  id: string;
  name: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface Observation {
  id: string;
  name: string;
  version: number;
  s3Url: string;
  queryable: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  data?: unknown; // Only present in /details endpoint
}

export interface Step {
  id: string;
  name: string;
  version: number;
  position: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  reason: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  observations: Observation[];
}

export interface FlowDetails {
  id: string;
  name: string;
  createdAt: string;
  finishedAt: string | null;
  steps: Step[];
}

export interface FlowsResponse {
  flows: Flow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
