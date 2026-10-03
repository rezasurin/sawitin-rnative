import React, { useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/core/Button';
import { BarcodeScanner } from '@/components/core/BarcodeScanner';
import { FormField } from '@/components/form';
import { PageHeader } from '@/components/home';
import { useImageCapture } from '@/hooks/useImageCapture';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { tiketPksApi } from '@/services/tiket-pks.service';
import { uploadApi } from '@/services/upload.service';
import { estateStamp, parseEstateStamp, ticketWeightsValid } from '@/utils/tiket-pks';
import { isMenungguSpb, isV3Qr, spbConflictOf, spbConflictText } from '@/utils/trip';
import type { CreateTiketPksBySpbPayload } from '@/types/tiket-pks';
import { BrandColors } from '@/constants/Colors';

const parseNumber = (text: string) => Number(text.trim().replace(/\./g, '').replace(',', '.'));

/**
 * The mill ticket by SPB number: the pilot's only weighing source, so it is
 * shown whether or not the organization has a weighbridge. The trip need not
 * be dispatched yet; the server answers `202` and attaches the ticket later.
 */
export default function TiketSpbScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const photo = useImageCapture();
  const online = useNetworkStore((state) => state.isOnline);
  const canWrite = useAuthStore((state) => state.hasPermission('mod_krani_timbang', 'write'));
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const key = useRef(`ticket_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [spb, setSpb] = useState('');
  const [number, setNumber] = useState('');
  const [stamp, setStamp] = useState(estateStamp());
  const [gross, setGross] = useState('');
  const [tare, setTare] = useState('');
  const [net, setNet] = useState('');

  const done = (title: string, message: string) => {
    void client.invalidateQueries({ queryKey: ['tiketPks'] });
    void client.invalidateQueries({ queryKey: ['staging', 'waitingSpb'] });
    Alert.alert(title, message, [{ text: 'OK', onPress: () => router.back() }]);
  };

  const save = async () => {
    if (savingRef.current || !canWrite) return;
    const at = parseEstateStamp(stamp);
    if (!at) { Alert.alert('Waktu tidak valid', 'Gunakan format YYYY-MM-DD HH:mm (WIB) sesuai tiket PKS.'); return; }
    const input: CreateTiketPksBySpbPayload = {
      nomor_spb: spb.trim(), nomor_tiket: number.trim(), tanggal_tiket: at.toISOString(),
      bruto_pabrik: gross.trim() ? parseNumber(gross) : null,
      tara_pabrik: tare.trim() ? parseNumber(tare) : null,
      netto_pabrik: parseNumber(net),
    };
    if (!input.nomor_spb || input.nomor_spb.length > 100 || !input.nomor_tiket || input.nomor_tiket.length > 100 || !ticketWeightsValid(input)) {
      Alert.alert('Tiket belum valid', 'Isi nomor SPB, nomor tiket, dan berat. Bruto dikurangi tara harus sama dengan netto (toleransi 1 kg).');
      return;
    }
    if (useSyncQueueStore.getState().queue.some((item) => item.module === 'tiket_pks' && item.payload?.nomor_spb === input.nomor_spb)) {
      Alert.alert('Sudah tersimpan', 'Tiket untuk SPB ini sudah menunggu sinkronisasi.');
      return;
    }
    savingRef.current = true; setSaving(true);
    // Offline the photo is copied beside the queue; the sync pass uploads it.
    const queueIt = async () => {
      const source = photo.image?.uri;
      let local: string | undefined;
      if (source) {
        if (!FileSystem.documentDirectory) throw new Error('Penyimpanan foto offline tidak tersedia.');
        local = `${FileSystem.documentDirectory}${key.current}.jpg`;
        if (!(await FileSystem.getInfoAsync(local)).exists) await FileSystem.copyAsync({ from: source, to: local });
      }
      await addToQueue({ module: 'tiket_pks', action: 'CREATE', endpoint: '/tiketPks',
        payload: { ...input, ...(local ? { foto_url: local, local_photo_uri: local } : {}) } });
      done('Tersimpan di perangkat', 'Tiket dikirim otomatis saat online. Jika ditolak server, periksa di menu Akun.');
    };
    try {
      if (!online) { await queueIt(); return; }
      try {
        if (photo.image?.uri) input.foto_url = (await uploadApi.uploadImage(photo.image.uri, 'tiket-pks')).url;
        const body = await tiketPksApi.createBySpb(input);
        if (isMenungguSpb(body)) done('Menunggu SPB', `SPB ${body.nomor_spb} belum dikirim Mandor. Tiket sudah diterima server dan dilekatkan otomatis saat SPB dikirim.`);
        else done('Tiket tersimpan', 'Tiket PKS tersimpan dan menjadi berat acuan SPB ini.');
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === undefined || status >= 500) { await queueIt(); return; }
        const conflict = spbConflictOf(error);
        Alert.alert(conflict ? 'Perlu diperbaiki' : 'Tiket belum tersimpan',
          conflict ? spbConflictText(conflict, input.nomor_spb) : error instanceof Error ? error.message : 'Periksa data lalu coba lagi.');
      }
    } catch (error) {
      Alert.alert('Tiket belum tersimpan', error instanceof Error ? error.message : 'Antrian tidak tersedia.');
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <View style={{ flex: 1, backgroundColor: BrandColors.background }}>
    <PageHeader title="Tiket PKS" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: BrandColors.textSecondary }}>
        Pindai barcode nomor pada SPB lembar kembali, atau ketik nomornya. Tiket ini menjadi berat acuan SPB tersebut.
      </Text>
      {!online && <Text style={{ color: BrandColors.textSecondary }}>Offline. Tiket akan dikirim saat tersambung.</Text>}
      <Button title="Pindai barcode SPB" variant="secondary" onPress={() => setScanning(true)} />
      <FormField label="Nomor SPB" value={spb} onChangeText={setSpb} autoCapitalize="characters" />
      <FormField label="Nomor tiket" value={number} onChangeText={setNumber} />
      <FormField label="Waktu di PKS, WIB (YYYY-MM-DD HH:mm)" value={stamp} onChangeText={setStamp} />
      <FormField label="Bruto pabrik (kg, opsional)" value={gross} onChangeText={setGross} keyboardType="decimal-pad" />
      <FormField label="Tara pabrik (kg, opsional)" value={tare} onChangeText={setTare} keyboardType="decimal-pad" />
      <FormField label="Netto pabrik (kg)" value={net} onChangeText={setNet} keyboardType="decimal-pad" />
      <Button title={photo.image ? 'Ganti foto tiket' : 'Foto tiket PKS'} variant="secondary" onPress={() => void photo.captureFromCamera()} />
      <Button title="Pilih dari galeri" variant="secondary" onPress={() => void photo.pickFromGallery()} />
      {canWrite && <Button title="Simpan tiket" loading={saving} disabled={saving} onPress={() => void save()} />}
    </ScrollView>
    <BarcodeScanner visible={scanning} onClose={() => setScanning(false)}
      onScanned={(value) => {
        setScanning(false);
        if (isV3Qr(value)) Alert.alert('QR SPB lama', 'Itu QR SPB lama, bukan nomor SPB. Pindai barcode nomor SPB atau ketik nomornya.');
        else setSpb(value);
      }} />
  </View>;
}
