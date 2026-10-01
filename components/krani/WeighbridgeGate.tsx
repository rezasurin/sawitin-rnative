import React from 'react';
import { Redirect } from 'expo-router';
import { useModuleGroup } from '@/hooks/useModuleGroup';
import { useOrgConfig, useOrgSetting } from '@/hooks/useOrgConfig';

/**
 * Weighbridge screens exist only for an organization with its own weighbridge
 * (`jembatan_timbang`). Without one, the mill ticket is the only weighing source,
 * so the Krani lands back on the Timbangan list, where ticket entry stays.
 */
export function WeighbridgeGate({ children }: { children: React.ReactNode }) {
  const group = useModuleGroup('(krani)');
  const enabled = useOrgSetting('jembatan_timbang');
  // The default is "off", so wait for a first answer rather than bounce a weighbridge site.
  if (useOrgConfig().isLoading) return null;
  return enabled ? <>{children}</> : <Redirect href={`/${group}/timbangan`} />;
}
