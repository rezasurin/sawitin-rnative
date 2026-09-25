import React from 'react';
import { ActivityIndicator, Text, View, Button } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { readHistory } from '@/services/operational.service';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OperationalModule } from '@/utils/operational-policy';

export function OperationalHistory({ module, id }: { module: OperationalModule; id: string }) {
  const policy = useOperationalPolicy(module);
  const userId = useAuthStore((state) => state.user?.id);
  const history = useQuery({
    queryKey: ['operationalHistory', module, id, userId],
    queryFn: () => readHistory(module, id),
    enabled: policy.history && !!id && !id.startsWith('local:'),
    retry: false,
  });
  if (id.startsWith('local:')) return null;
  return <View style={{ padding: 16, gap: 10 }}>
    <Text style={{ fontWeight: '700', fontSize: 16 }}>Riwayat dokumen</Text>
    {!policy.history ? <Text>Riwayat tersedia saat online dengan izin baca.</Text>
      : history.isLoading ? <ActivityIndicator accessibilityLabel="Memuat riwayat" />
      : history.isError ? <><Text>Riwayat gagal dimuat.</Text><Button title="Coba lagi" onPress={() => void history.refetch()} /></>
      : !history.data?.length ? <Text>Belum ada riwayat.</Text>
      : history.data.map((event, index) => <View key={event.id ?? index} style={{ gap: 4, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 10 }}>
        <Text style={{ fontWeight: '600' }}>{event.action} · {event.status_from ?? '—'} → {event.status_to ?? '—'}</Text>
        <Text>{event.created_by}</Text>
        {!!event.reason && <Text>{event.reason}</Text>}
        <Text>{event.created_at ? new Date(event.created_at).toLocaleString('id-ID') : '—'}</Text>
      </View>)}
  </View>;
}
