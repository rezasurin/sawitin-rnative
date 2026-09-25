import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/core/Button';
import { AuthenticatedImage } from '@/components/core/AuthenticatedImage';
import { FormField } from '@/components/form';
import { PageHeader } from '@/components/home';
import { useImageCapture } from '@/hooks/useImageCapture';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { tiketPksApi } from '@/services/tiket-pks.service';
import { uploadApi } from '@/services/upload.service';
import { ticketWeightsValid, sameFiledTicket } from '@/utils/tiket-pks';
import type { CreateTiketPksPayload } from '@/types/tiket-pks';
import { BrandColors } from '@/constants/Colors';

const parseNumber = (text: string) => Number(text.trim().replace(/\./g, '').replace(',', '.'));
const localStamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
};

export default function TiketPksScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const photo = useImageCapture();
  const online = useNetworkStore((state) => state.isOnline);
  const canWrite = useAuthStore((state) => state.hasPermission('mod_krani_timbang', 'write'));
  const canUpdate = useAuthStore((state) => state.hasPermission('mod_krani_timbang', 'update'));
  const canDelete = useAuthStore((state) => state.hasPermission('mod_krani_timbang', 'delete'));
  const queue = useSyncQueueStore((state) => state.queue);
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const key = useRef(`ticket_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [number, setNumber] = useState('');
  const [stamp, setStamp] = useState(localStamp(new Date().toISOString()));
  const [gross, setGross] = useState('');
  const [tare, setTare] = useState('');
  const [net, setNet] = useState('');
  const [receiver, setReceiver] = useState('');
  const [note, setNote] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const ticket = useQuery({ queryKey: ['tiketPks', 'trip', tripId],
    queryFn: () => tiketPksApi.byTrip(tripId), enabled: !!tripId && online });
  const history = useQuery({ queryKey: ['tiketPks', 'history', ticket.data?.id],
    queryFn: () => tiketPksApi.history(ticket.data!.id), enabled: !!ticket.data?.id && online });
  const queued = queue.find((item) => item.module === 'tiket_pks' &&
    item.action === 'CREATE' && item.payload?.krani_timbang_id === tripId);

  useEffect(() => {
    if (!queued || ticket.data) return;
    const row = queued.payload as unknown as CreateTiketPksPayload;
    setNumber(row.nomor_tiket ?? ''); setStamp(localStamp(row.tanggal_tiket));
    setGross(row.bruto_pabrik == null ? '' : String(row.bruto_pabrik));
    setTare(row.tara_pabrik == null ? '' : String(row.tara_pabrik));
    setNet(row.netto_pabrik == null ? '' : String(row.netto_pabrik));
    setReceiver(row.diterima_oleh ?? ''); setNote(row.keterangan ?? '');
  }, [queued?.id, ticket.data]);

  useEffect(() => {
    const row = ticket.data;
    if (!row) return;
    setNumber(row.nomor_tiket); setStamp(localStamp(row.tanggal_tiket));
    setGross(row.bruto_pabrik == null ? '' : String(row.bruto_pabrik));
    setTare(row.tara_pabrik == null ? '' : String(row.tara_pabrik));
    setNet(String(row.netto_pabrik)); setReceiver(row.diterima_oleh ?? '');
    setNote(row.keterangan ?? ''); setRemovePhoto(false);
  }, [ticket.data]);

  const save = async () => {
    if (savingRef.current || queued || (!ticket.data && !canWrite) || (ticket.data && !canUpdate)) return;
    const parsedStamp = new Date(stamp.trim().replace(' ', 'T'));
    if (Number.isNaN(parsedStamp.getTime())) {
      Alert.alert('Waktu tidak valid', 'Gunakan format YYYY-MM-DD HH:mm sesuai tiket PKS.');
      return;
    }
    const input: CreateTiketPksPayload = {
      krani_timbang_id: tripId, nomor_tiket: number.trim(),
      tanggal_tiket: parsedStamp.toISOString(),
      bruto_pabrik: gross.trim() ? parseNumber(gross) : null,
      tara_pabrik: tare.trim() ? parseNumber(tare) : null,
      netto_pabrik: parseNumber(net),
      diterima_oleh: receiver.trim() || null, keterangan: note.trim() || null,
    };
    if (!input.nomor_tiket || input.nomor_tiket.length > 100 ||
        !ticketWeightsValid(input) || receiver.length > 255 || note.length > 2000) {
      Alert.alert('Tiket belum valid', 'Periksa nomor, waktu PKS, dan berat. Bruto dikurangi tara harus sama dengan netto (toleransi 1 kg).');
      return;
    }
    savingRef.current = true; setSaving(true);
    try {
      const source = photo.image?.uri;
      if (source && !online) {
        if (!FileSystem.documentDirectory) throw new Error('Penyimpanan foto offline tidak tersedia.');
        const path = `${FileSystem.documentDirectory}${key.current}.jpg`;
        if (!(await FileSystem.getInfoAsync(path)).exists) await FileSystem.copyAsync({ from: source, to: path });
        input.foto_url = path;
      } else if (source) input.foto_url = (await uploadApi.uploadImage(source, 'tiket-pks')).url;
      else input.foto_url = removePhoto ? null : ticket.data?.foto_url ?? null;

      if (ticket.data) {
        if (!online) throw new Error('Perbaikan tiket membutuhkan koneksi internet.');
        const { krani_timbang_id: _fixed, ...update } = input;
        await tiketPksApi.update(ticket.data.id, update);
      } else if (!online) {
        await addToQueue({ module: 'tiket_pks', action: 'CREATE', endpoint: '/tiketPks',
          payload: { ...input, ...(input.foto_url?.startsWith('file://') ? { local_photo_uri: input.foto_url } : {}) } });
      } else {
        try { await tiketPksApi.create(input); }
        catch (error) {
          const status = (error as { status?: number }).status;
          if (status === 409) {
            const existing = await tiketPksApi.byTrip(tripId);
            if (!sameFiledTicket(existing, input)) throw error;
          } else if (status === undefined || status >= 500) {
            await addToQueue({ module: 'tiket_pks', action: 'CREATE', endpoint: '/tiketPks',
              payload: input as unknown as Record<string, unknown> });
          } else throw error;
        }
      }
      await client.invalidateQueries({ queryKey: ['tiketPks'] });
      await client.invalidateQueries({ queryKey: ['kraniTimbang', tripId, 'trace'] });
      router.back();
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (!ticket.data && status === undefined) {
        try {
          const source = photo.image?.uri;
          if (source) {
            if (!FileSystem.documentDirectory) throw new Error('Penyimpanan foto offline tidak tersedia.');
            const path = `${FileSystem.documentDirectory}${key.current}.jpg`;
            if (!(await FileSystem.getInfoAsync(path)).exists) await FileSystem.copyAsync({ from: source, to: path });
            input.foto_url = path;
          }
          await addToQueue({ module: 'tiket_pks', action: 'CREATE', endpoint: '/tiketPks',
            payload: { ...input, ...(input.foto_url?.startsWith('file://') ? { local_photo_uri: input.foto_url } : {}) } });
          router.back();
          return;
        } catch (queueError) {
          Alert.alert('Tiket belum tersimpan', queueError instanceof Error ? queueError.message : 'Antrian tidak tersedia.');
        }
      } else Alert.alert('Tiket belum tersimpan', error instanceof Error ? error.message : 'Periksa data lalu coba lagi.');
    } finally { savingRef.current = false; setSaving(false); }
  };

  const deleteTicket = () => {
    if (!ticket.data || !canDelete || !online) return;
    Alert.alert('Hapus tiket PKS?', 'Penghapusan tercatat dalam riwayat. Buat tiket baru pada trip ini jika salah arsip.', [
      { text: 'Batal' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try { await tiketPksApi.delete(ticket.data!.id);
          await client.invalidateQueries({ queryKey: ['tiketPks'] });
          await client.invalidateQueries({ queryKey: ['kraniTimbang', tripId, 'trace'] });
          router.back();
        } catch (error) { Alert.alert('Gagal menghapus', error instanceof Error ? error.message : 'Coba lagi.'); }
      } },
    ]);
  };

  return <View style={{ flex: 1, backgroundColor: BrandColors.background }}>
    <PageHeader title="Tiket PKS" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: BrandColors.textSecondary }}>Trip: {tripId}. Tiket tetap pada trip ini.</Text>
      {queued && <Text style={{ color: BrandColors.primary }}>Menunggu sinkronisasi · {queued.status === 'DEAD' ? 'Perlu diperiksa di Akun' : 'Tersimpan di perangkat'}</Text>}
      {ticket.isLoading && online && <ActivityIndicator />}
      {ticket.isError && online && <Button title="Muat ulang tiket" variant="secondary" onPress={() => void ticket.refetch()} />}
      {!online && <Text style={{ color: BrandColors.textSecondary }}>Offline. Tiket baru akan dikirim saat tersambung.</Text>}
      <Button title={photo.image || ticket.data?.foto_url ? 'Ganti foto tiket' : 'Foto tiket PKS'}
        variant="secondary" onPress={() => void photo.captureFromCamera()} />
      <Button title="Pilih dari galeri" variant="secondary" onPress={() => void photo.pickFromGallery()} />
      {!!photo.image?.uri && <AuthenticatedImage uri={photo.image.uri} style={{ width: 180, height: 180 }} />}
      {!photo.image?.uri && !!ticket.data?.foto_url && !removePhoto &&
        <AuthenticatedImage uri={ticket.data.foto_url} style={{ width: 180, height: 180 }} />}
      {!photo.image?.uri && !ticket.data?.foto_url && typeof queued?.payload?.foto_url === 'string' &&
        <AuthenticatedImage uri={queued.payload.foto_url} style={{ width: 180, height: 180 }} />}
      {!!ticket.data?.foto_url && <Button title="Hapus foto pada perbaikan" variant="secondary" onPress={() => setRemovePhoto(true)} />}
      <FormField label="Nomor tiket" value={number} onChangeText={setNumber} />
      <FormField label="Waktu di PKS (YYYY-MM-DD HH:mm)" value={stamp} onChangeText={setStamp} />
      <FormField label="Bruto pabrik (kg, opsional)" value={gross} onChangeText={setGross} keyboardType="decimal-pad" />
      <FormField label="Tara pabrik (kg, opsional)" value={tare} onChangeText={setTare} keyboardType="decimal-pad" />
      <FormField label="Netto pabrik (kg)" value={net} onChangeText={setNet} keyboardType="decimal-pad" />
      <FormField label="Diterima oleh (opsional)" value={receiver} onChangeText={setReceiver} />
      <FormField label="Keterangan (opsional)" value={note} onChangeText={setNote} multiline />
      {(ticket.data ? canUpdate : canWrite) && <Button title={ticket.data ? 'Simpan perbaikan' : 'Simpan tiket'}
        loading={saving} disabled={saving || !!queued || (online && (ticket.isError || ticket.isLoading)) || (!!ticket.data && !online)} onPress={() => void save()} />}
      {!!ticket.data && canDelete && online && <Button title="Hapus tiket" variant="danger" onPress={deleteTicket} />}
      {!!ticket.data && <View style={{ gap: 6 }}><Text style={{ fontWeight: '700' }}>Riwayat tiket</Text>
        {history.isLoading ? <ActivityIndicator /> : history.isError ? <Text>Riwayat tidak tersedia.</Text>
          : history.data?.map((event) => <Text key={event.id}>{event.action} · {new Date(event.created_at).toLocaleString('id-ID')} · {event.created_by}</Text>)}</View>}
    </ScrollView>
  </View>;
}
