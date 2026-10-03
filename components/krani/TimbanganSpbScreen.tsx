import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/core/Button';
import { FormField } from '@/components/form';
import { PageHeader } from '@/components/home';
import { BrandColors } from '@/constants/Colors';
import { useModuleGroup } from '@/hooks/useModuleGroup';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { stagingApi } from '@/services/staging.service';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { isMenungguSpb, spbConflictOf, spbConflictText } from '@/utils/trip';
import type { StagingSpbPayload } from '@/types/staging';

const parseWeight = (text: string) => Number(text.trim().replace(/\./g, '').replace(',', '.'));

/**
 * Weighbridge weighing by SPB number: only the two weights are entered. Truck,
 * driver and destination come from the trip, so there is no Checker to load and
 * the form works with no signal at all.
 */
export default function TimbanganSpbScreen({ nomorSpb }: { nomorSpb: string }) {
  const group = useModuleGroup('(krani)');
  const router = useRouter();
  const client = useQueryClient();
  const policy = useOperationalPolicy('kraniTimbang');
  const [gross, setGross] = useState('');
  const [tare, setTare] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const isi = parseWeight(gross);
  const kosong = parseWeight(tare);
  const entered = gross.trim() !== '' && tare.trim() !== '' && Number.isFinite(isi) && Number.isFinite(kosong);
  const invalid = entered && isi <= kosong;
  const back = () => router.dismissTo(`/${group}/timbangan`);
  const finish = (title: string, message: string) => {
    void client.invalidateQueries({ queryKey: ['kraniTimbang'] });
    void client.invalidateQueries({ queryKey: ['staging', 'waitingSpb'] });
    Alert.alert(title, message, [{ text: 'OK', onPress: back }]);
  };

  const save = async () => {
    if (savingRef.current || !policy.create || !entered || invalid || kosong < 0) return;
    const payload: StagingSpbPayload = {
      nomor_spb: nomorSpb, timbang_isi: isi, timbang_kosong: kosong,
      ...(note.trim() ? { keterangan: note.trim() } : {}),
      // Recorded now, so a weighing synced days later keeps its real time.
      weighed_at: new Date().toISOString(),
    };
    const queueIt = async () => {
      const queue = useSyncQueueStore.getState();
      if (queue.queue.some((item) => item.module === 'krani_timbang' && item.payload?.nomor_spb === nomorSpb)) {
        Alert.alert('Sudah tersimpan', 'Timbangan untuk SPB ini sudah menunggu sinkronisasi.');
        return;
      }
      await queue.addToQueue({ module: 'krani_timbang', action: 'CREATE', endpoint: '/staging/krani-timbang', payload: { ...payload } });
      finish('Tersimpan di perangkat', `Netto ${(isi - kosong).toLocaleString('id-ID')} kg dikirim otomatis saat online. Jika ditolak server, periksa di menu Akun.`);
    };
    savingRef.current = true; setSaving(true);
    try {
      if (!useNetworkStore.getState().isOnline) { await queueIt(); return; }
      try {
        const body = await stagingApi.submitPayload(payload);
        if (isMenungguSpb(body)) finish('Menunggu SPB', `SPB ${nomorSpb} belum dikirim Mandor. Timbangan sudah diterima server dan dicocokkan otomatis saat SPB dikirim.`);
        else finish('Berhasil', 'Data timbangan berhasil disimpan.');
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === undefined || status >= 500) { await queueIt(); return; }
        const conflict = spbConflictOf(error);
        Alert.alert(conflict ? 'Perlu diperbaiki' : 'Gagal',
          conflict ? spbConflictText(conflict, nomorSpb) : error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan data timbangan.');
      }
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Timbangan tidak tersimpan.');
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: BrandColors.background }}>
    <PageHeader title="Input Timbangan" showBackButton onBack={back} />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary }}>SPB {nomorSpb}</Text>
      <Text style={{ color: BrandColors.textSecondary }}>Truk, sopir, dan tujuan diambil dari SPB di server.</Text>
      <FormField label="Timbang Isi (Gross) - kg" value={gross} onChangeText={setGross} keyboardType="numeric"
        error={invalid ? 'Timbang isi harus lebih besar daripada timbang kosong' : undefined} />
      <FormField label="Timbang Kosong (Tare) - kg" value={tare} onChangeText={setTare} keyboardType="numeric" />
      <View style={{ alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#F1F8E9' }}>
        <Text style={{ color: '#558B2F', fontWeight: '600' }}>Berat Bersih (Netto)</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#33691E' }}>{entered && !invalid ? (isi - kosong).toLocaleString('id-ID') : 0} kg</Text>
      </View>
      <FormField label="Keterangan (Opsional)" value={note} onChangeText={setNote} multiline numberOfLines={3} />
      <Button title="Simpan Timbangan" loading={saving} disabled={saving || !policy.create || !entered || invalid} onPress={() => void save()} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
