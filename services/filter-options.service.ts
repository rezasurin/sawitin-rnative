import { apiClient } from './api';
import { FilterOption } from '@/types/master-data';

export const filterOptionsApi = {
  getAvailableModules: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/filterOptions');
    return response.data;
  },
  getFilterOptions: async (module: string): Promise<Record<string, FilterOption[]>> => {
    const response = await apiClient.get<Record<string, FilterOption[]>>(`/filterOptions/${module}`);
    return response.data;
  },
};
