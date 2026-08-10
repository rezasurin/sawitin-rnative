import { useQuery } from '@tanstack/react-query';
import { orgConfigApi } from '@/services/org-config.service';

export const orgConfigKeys = {
  all: ['orgConfig'] as const,
};

export function useOrgConfig() {
  return useQuery({
    queryKey: orgConfigKeys.all,
    queryFn: orgConfigApi.get,
    staleTime: 60 * 60 * 1000, // BJR changes rarely; cache for an hour
  });
}
