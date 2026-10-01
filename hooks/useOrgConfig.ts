import { useQuery } from '@tanstack/react-query';
import { ORG_CONFIG_DEFAULTS, OrgSettingKey, orgConfigApi } from '@/services/org-config.service';

export const orgConfigKeys = {
  all: ['orgConfig'] as const,
};

export function useOrgConfig() {
  return useQuery({
    queryKey: orgConfigKeys.all,
    queryFn: orgConfigApi.get,
    staleTime: 60 * 60 * 1000, // Settings change rarely; cache for an hour
  });
}

/** One setting from the cached `/orgConfig`, or the server default before it has loaded. */
export function useOrgSetting<K extends OrgSettingKey>(key: K): (typeof ORG_CONFIG_DEFAULTS)[K] {
  const { data } = useOrgConfig();
  return (data?.[key] ?? ORG_CONFIG_DEFAULTS[key]) as (typeof ORG_CONFIG_DEFAULTS)[K];
}
