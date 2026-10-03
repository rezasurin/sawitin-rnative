import React from 'react';
import { Text } from 'react-native';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import type { OperationalModule } from '@/utils/operational-policy';

export function OperationalCreateGuard({ module, children }: { module: OperationalModule; children: React.ReactNode }) {
  const policy = useOperationalPolicy(module);
  return policy.create ? <>{children}</> : <Text>Izin membuat dokumen tidak tersedia.</Text>;
}
