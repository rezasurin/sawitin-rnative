import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { latestQueueDocument } from '@/services/queue-recovery';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { resolveTripConflict, tripConflictText, type TripConflict } from '@/utils/trip';
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
  const conflict = item.payload?.conflict as TripConflict | undefined;
  const [newSpb, setNewSpb] = useState('');
  const updatePayload = useSyncQueueStore((state) => state.updatePayload);
  const retryItem = useSyncQueueStore((state) => state.retryItem);
  // Fix the payload on the phone, then put the item back in line. Nothing is deleted without a choice.
  const resolveTrip = async () => {
    const fixed = item.payload && resolveTripConflict(item.payload, { nomor_spb: newSpb });
    if (!fixed) {
      Alert.alert('Belum dapat diperbaiki', conflict?.code === 'SPB_NUMBER_TAKEN'
        ? 'Isi nomor SPB yang berbeda.' : 'Tidak ada muatan lain pada SPB ini. Buang SPB ini dari menu Akun.');
      return;
    }
    await updatePayload(item.id, fixed);
    await retryItem(item.id);
    onClose();
  };
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
      {item.module === 'bkm_checker' && conflict && <>
        <Text>{tripConflictText(conflict, (item.payload?.header as { nomor_spb?: string } | undefined)?.nomor_spb)}</Text>
        {conflict.code === 'SPB_NUMBER_TAKEN'
          ? <TextInput value={newSpb} onChangeText={setNewSpb} placeholder="Nomor SPB yang benar" autoCapitalize="characters"
              style={{ borderWidth: 1, borderColor: '#999', borderRadius: 6, padding: 10 }} />
          : null}
        <Button title={conflict.code === 'SPB_NUMBER_TAKEN' ? 'Ganti nomor SPB & kirim ulang' : 'Buang baris restan ini & kirim ulang'}
          onPress={() => void resolveTrip()} />
      </>}
      {item.module === 'bkm_checker' && item.errorClass === 'CONFLICT' && !conflict &&
        <Text>Satu Checker hanya boleh memuat satu truk. Periksa muatan di server, lalu buat SPB baru untuk truk lain.</Text>}
      {item.module === 'bkm_checker' && item.errorClass === 'CONFLICT' && !conflict && canCreateChecker &&
        <Button title="Buat SPB baru" onPress={() => { onClose(); router.push('/(mandor)/checker/add'); }} />}
      {item.module === 'tiket_pks' && item.errorClass === 'CONFLICT' &&
        <Text>Trip ini mungkin sudah memiliki tiket PKS. Periksa nomor dan berat tiket di server sebelum membuang pekerjaan perangkat.</Text>}
      <Text style={{ fontWeight: '700' }}>Data perangkat</Text><Fields value={item.payload} />
      <Text style={{ fontWeight: '700' }}>Data server terbaru</Text>
      {loading ? <ActivityIndicator /> : error ? <Text>{error}</Text> : <Fields value={latest} />}
    </ScrollView>
  </Modal>;
}
