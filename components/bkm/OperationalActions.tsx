import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { requireOnline } from '@/services/operational.service';
import { lookupCacheDb } from '@/services/database';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import type { DocumentStatus } from '@/types/common';
import type { OperationalModule, OperationalAction } from '@/utils/operational-policy';

const queueModule = { bkmPanen: 'bkm_panen', bkmChecker: 'bkm_checker', bkmRawat: 'bkm_rawat', kraniTimbang: 'krani_timbang' };
const labels = { submit: 'Kirim untuk persetujuan', reopen: 'Buka kembali sebagai draft', cancel: 'Batalkan dokumen', approve: 'Setujui', reject: 'Minta revisi', delete: 'Hapus draft' };
type Action = keyof typeof labels;

export function OperationalActions({ module, document, onDeleted, exclude = [] }: {
  module: OperationalModule;
  document: { id: string; status: DocumentStatus; details?: unknown[]; detail_rawat?: unknown[]; rejected_by?: string | null; rejected_at?: string | null; rejection_note?: string | null; created_by?: string | null };
  onDeleted?: () => void;
  exclude?: OperationalAction[];
}) {
  const count = (document.detail_rawat ?? document.details ?? []).length;
  const policy = useOperationalPolicy(module, document.status, count, document.created_by);
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [deleted, setDeleted] = useState(false);
  const run = async (action: Action) => {
    if (!policy[action] || busy) return;
    setBusy(true);
    try {
      const online = useNetworkStore.getState().isOnline;
      if (['approve', 'reject', 'cancel'].includes(action)) requireOnline();
      const status = action === 'reopen' ? 'DRAFT' : action === 'submit' ? 'SUBMITTED' : 'CANCELLED';
      const pending = useSyncQueueStore.getState().queue.some((item) => {
        const payload = item.payload ?? {};
        return item.module.replace(/_detail$/, '') === queueModule[module] && (payload.documentId ?? payload.bkm_rawat_id ?? payload.id) === document.id;
      });
      if (!online || pending && (action === 'submit' || action === 'reopen')) {
        await useSyncQueueStore.getState().addToQueue({
          module: queueModule[module], action: action === 'delete' ? 'DELETE' : 'UPDATE', endpoint: `/${module}/${document.id}`,
          payload: { id: document.id, ...(action === 'delete' ? {} : { data: { status } }), documentId: document.id, expectedStatus: document.status },
        });
        if (action === 'reopen' || action === 'submit') {
          const draft = { ...document, status: action === 'reopen' ? 'DRAFT' as const : 'SUBMITTED' as const };
          client.setQueriesData({ predicate: (query) => query.queryKey[0] === module && query.queryKey.includes(document.id) && !query.queryKey.includes('list') }, draft);
          const userId = useAuthStore.getState().user?.id;
          if (userId) await lookupCacheDb.save(`${userId}:operational:${module}:/${module}/${document.id}:{}`, draft);
        }
        Alert.alert('Tersimpan', 'Perubahan menunggu sinkronisasi.');
      } else {
        if (action === 'approve' || action === 'reject') await apiClient.post(`/${module}/${document.id}/${action}`, action === 'reject' ? { rejection_note: note } : {});
        else if (action === 'delete') { await apiClient.delete(`/${module}/${document.id}`); setDeleted(true); onDeleted?.(); }
        else await apiClient.put(`/${module}/${document.id}`, { status });
        await client.invalidateQueries();
      }
    } catch (error) {
      await client.invalidateQueries();
      const status = (error as { status?: number }).status;
      Alert.alert('Tindakan gagal', status === 409 ? 'Dokumen telah berubah. Data terbaru dimuat; periksa sebelum mencoba kembali.' : status === 403 ? 'Izin tindakan ini tidak tersedia.' : status === 401 ? 'Sesi berakhir. Silakan masuk kembali.' : (error as Error).message);
    } finally { setBusy(false); }
  };
  if (document.id.startsWith('local:')) return null;
  return <View style={{ padding: 16, gap: 12 }}>
    {document.status === 'REVISION_REQUESTED' && <Text>Buka kembali sebagai draft sebelum mengubah dokumen.</Text>}
    {!!document.rejection_note && <Text>Alasan revisi: {document.rejection_note}</Text>}
    {!!document.rejected_by && <Text>Diminta oleh: {document.rejected_by}</Text>}
    {!!document.rejected_at && <Text>{new Date(document.rejected_at).toLocaleString('id-ID')}</Text>}
    {deleted ? <Text>Draft dihapus. Riwayat dokumen tetap tersedia di bawah.</Text> : <>
      {policy.reject && !exclude.includes('reject') && <TextInput accessibilityLabel="Alasan revisi" placeholder="Alasan revisi (opsional)" value={note} onChangeText={setNote} editable={!busy} style={{ borderWidth: 1, borderColor: '#aaa', padding: 12 }} />}
      {(Object.keys(labels) as Action[]).filter((action) => policy[action] && !exclude.includes(action)).map((action) => <Button key={action} title={labels[action]} disabled={busy} onPress={() => Alert.alert(labels[action], 'Lanjutkan tindakan ini?', [{ text: 'Batal', style: 'cancel' }, { text: 'Lanjutkan', onPress: () => void run(action) }])} />)}
    </>}
  </View>;
}
