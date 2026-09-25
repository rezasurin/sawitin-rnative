import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import type { AuditEvent } from '@/services/operational.service';

export function AuditTrail({ path }: { path: string }) {
  const audit = useQuery({ queryKey: ['phase4Audit', path], queryFn: async () =>
    (await apiClient.get<AuditEvent[]>(path)).data, retry: false });
  return <View style={{ gap: 8, paddingVertical: 12 }}>
    <Text style={{ fontSize: 16, fontWeight: '700' }}>Riwayat</Text>
    {audit.isLoading ? <ActivityIndicator /> : audit.isError ? <Text>Riwayat tidak tersedia saat ini.</Text>
      : !audit.data?.length ? <Text>Belum ada riwayat.</Text> : audit.data.map((event) =>
      <View key={event.id} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
        <Text>{event.action} · {new Date(event.created_at).toLocaleString('id-ID')}</Text>
        <Text>{event.created_by}</Text>
        {!!event.reason && <Text>{event.reason}</Text>}
      </View>)}
  </View>;
}
