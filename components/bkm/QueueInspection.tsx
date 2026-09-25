import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Modal, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { latestQueueDocument } from '@/services/queue-recovery';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SyncQueueItem } from '@/types/sync';

const hidden = new Set(['documentId', 'expectedStatus', 'client_request_id', 'client_detail_id', 'serverId', 'server_id', 'local_photo_uri', 'org_id']);
function Fields({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return <Text selectable>{String(value)}</Text>;
  return <View style={{ gap: 6, paddingLeft: 10 }}>{Object.entries(value).filter(([key]) => !hidden.has(key)).map(([key, field]) => <View key={key}>
    <Text style={{ fontWeight: '600' }}>{key.replaceAll('_', ' ')}</Text><Fields value={field} />
  </View>)}</View>;
}

export function QueueInspection({ item, onClose }: { item: SyncQueueItem; onClose: () => void }) {
  const router = useRouter();
  const canCreateChecker = useAuthStore((state) => state.hasPermission('mod_bkm_checker', 'write'));
  const checkerHeader = item.payload?.header as Record<string, unknown> | undefined;
  const [latest, setLatest] = useState<unknown>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const document = await latestQueueDocument(item);
        if (active) setLatest(document);
      } catch (reason) { if (active) setError((reason as Error).message); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [item]);
  return <Modal visible onRequestClose={onClose} animationType="slide">
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 16 }}>
      <Button title="Tutup pemeriksaan" onPress={onClose} />
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Periksa perubahan</Text>
      <Text>Perubahan di perangkat tetap tersimpan. Jika status server bukan DRAFT, buka kembali dokumen sebelum mencoba perubahan bisnis.</Text>
      {item.module === 'bkm_checker' && item.errorClass === 'CONFLICT' &&
        <Text>Satu Checker hanya boleh memuat satu truk. Periksa muatan di server, lalu buat dokumen Checker baru untuk truk lain.</Text>}
      {item.module === 'bkm_checker' && item.errorClass === 'CONFLICT' && canCreateChecker &&
        typeof checkerHeader?.blok_id === 'string' && typeof checkerHeader?.tph_id === 'string' &&
        typeof checkerHeader?.tanggal_laporan === 'string' &&
        <Button title="Buat Checker baru untuk truk lain" onPress={() => {
          onClose();
          router.push({ pathname: '/(mandor)/checker/add', params: {
            blok_id: checkerHeader.blok_id as string, tph_id: checkerHeader.tph_id as string,
            lahan_id: typeof checkerHeader.lahan_id === 'string' ? checkerHeader.lahan_id : '',
            bkm_panen_id: typeof checkerHeader.bkm_panen_id === 'string' ? checkerHeader.bkm_panen_id : '',
            tanggal_laporan: checkerHeader.tanggal_laporan as string,
          } });
        }} />}
      {item.module === 'tiket_pks' && item.errorClass === 'CONFLICT' &&
        <Text>Trip ini mungkin sudah memiliki tiket PKS. Periksa nomor dan berat tiket di server sebelum membuang pekerjaan perangkat.</Text>}
      <Text style={{ fontWeight: '700' }}>Data perangkat</Text><Fields value={item.payload} />
      <Text style={{ fontWeight: '700' }}>Data server terbaru</Text>
      {loading ? <ActivityIndicator /> : error ? <Text>{error}</Text> : <Fields value={latest} />}
    </ScrollView>
  </Modal>;
}
