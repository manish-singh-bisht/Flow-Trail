import type { FlowDetails } from '../types/flow';
import type { FlowsResponse } from '../types/flow';
import { api } from '../utils/api';

export const flowsApi = {
  getAll: async (page = 1, limit = 20): Promise<FlowsResponse> => {
    const response = await api.get<FlowsResponse>('/flows', {
      params: { page, limit },
    });
    return response.data;
  },

  getById: async (id: string): Promise<FlowDetails> => {
    const response = await api.get<FlowDetails>(`/flows/${id}`);
    return response.data;
  },

  getByIdWithData: async (id: string): Promise<FlowDetails> => {
    const response = await api.get<FlowDetails>(`/flows/${id}/details`);
    return response.data;
  },
};
