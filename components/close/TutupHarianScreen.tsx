import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/home';
import { Button } from '@/components/core/Button';
import { FormDateField, FormSelect } from '@/components/form';
import { ClosePreview, Section } from '@/components/close/ClosePreview';
import { BrandColors } from '@/constants/Colors';
import { useKelompokLahanList } from '@/hooks/useKelompokLahan';
import { useOrgSetting } from '@/hooks/useOrgConfig';
import { useClosePreview } from '@/hooks/useTutupHarian';
import { tutupHarianApi } from '@/services/tutup-harian.service';
import { tutupHarianKeys } from '@/services/queryKeys';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { CLOSE_OFFLINE_TEXT, closeFailure, initialCounts, noteItems, noteOf, submitBlock, submitPayload, type Counts, type Notes } from '@/utils/close';
import { estateDate } from '@/utils/estateDate';
import type { CloseTph } from '@/types/tutup-harian';

/** Mandor: preview a farm's day, confirm the restan count, note the exceptions, submit. Online only. */
export default function TutupHarianScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const online = useNetworkStore((state) => state.isOnline);
  const canWrite = useAuthStore((state) => state.hasPermission('mod_bkm_checker', 'write'));
  const tolerancePct = useOrgSetting('discrepancy_tolerance_pct');
  const farms = useKelompokLahanList({ limit: 200 });
  const [farmId, setFarmId] = useState('');
  const [tanggal, setTanggal] = useState(estateDate());
  const [counts, setCounts] = useState<Counts>({});
  const [notes, setNotes] = useState<Notes>({});
  const [catatan, setCatatan] = useState('');
  const [extraKeys, setExtraKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const query = useClosePreview(farmId, tanggal);
  const preview = online ? query.data : undefined;

  // A new preview (first load, refetch after a 409) restarts the count at the submitted figure or the remainder.
  useEffect(() => { if (query.data) setCounts(initialCounts(query.data.tph)); }, [query.data]);
  useEffect(() => { setExtraKeys([]); setSent(false); }, [farmId, tanggal]);

  const block = submitBlock({ online, preview, counts, notes, tolerancePct, extraKeys, canWrite });
  const items = useMemo(() => (preview ? noteItems(preview, counts, tolerancePct, extraKeys) : []), [preview, counts, tolerancePct, extraKeys]);
  const editable = online && !!preview && canWrite && !['SUBMITTED', 'APPROVED'].includes(preview.tutup_harian?.status ?? '');

  const submit = async () => {
    const body = preview && submitPayload(preview, counts, notes, tolerancePct, catatan, extraKeys);
    if (!body || block || busy) return;
    setBusy(true);
    try {
      client.setQueryData(tutupHarianKeys.preview(farmId, tanggal), await tutupHarianApi.submit(body));
      setSent(true);
    } catch (error) {
      const failure = closeFailure(error);
      if (failure.missing?.length) setExtraKeys((keys) => [...new Set([...keys, ...failure.missing!])]);
      if (failure.refetch) await query.refetch();
      Alert.alert('Tutup harian belum terkirim', failure.text);
    } finally { setBusy(false); }
  };

  const tphInput = (row: CloseTph) => {
    const value = counts[row.tph_id] ?? { janjang: '', brondol: '' };
    const set = (field: 'janjang' | 'brondol') => (text: string) => setCounts((all) => ({ ...all, [row.tph_id]: { ...value, [field]: text } }));
    return <View style={styles.counts}>
      <Text style={styles.label}>Restan dihitung (sistem: {row.restan_usulan_janjang} jjg)</Text>
      <View style={styles.row}>
        <TextInput accessibilityLabel={`Restan janjang ${row.nama}`} style={styles.input} keyboardType="number-pad" editable={editable}
          value={value.janjang} onChangeText={set('janjang')} placeholder="Janjang" />
        <TextInput accessibilityLabel={`Restan brondol kg ${row.nama}`} style={styles.input} keyboardType="number-pad" editable={editable}
          value={value.brondol} onChangeText={set('brondol')} placeholder="Brondol (kg)" />
      </View>
    </View>;
  };

  const noteFields = <Section title={`Perlu catatan (${items.length})`}>
    {items.length === 0 && <Text style={styles.muted}>Tidak ada pengecualian yang perlu catatan.</Text>}
    {items.map((item) => <View key={item.key} style={styles.counts}>
      <Text>{item.message}</Text>
      <TextInput accessibilityLabel={`Catatan ${item.key}`} style={[styles.input, !noteOf(item, notes) && styles.missing]} editable={editable} multiline maxLength={500}
        value={notes[item.key] ?? item.catatan ?? ''} onChangeText={(text) => setNotes((all) => ({ ...all, [item.key]: text }))} placeholder="Catatan wajib" />
    </View>)}
  </Section>;

  return <View style={styles.screen}>
    <PageHeader title="Tutup Harian" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!online && <View style={styles.offline}><Text style={styles.offlineText}>{CLOSE_OFFLINE_TEXT}. Sambungkan perangkat untuk melihat dan mengajukan penutupan; tidak ada yang disimpan di antrian.</Text></View>}
      <FormSelect label="Kelompok lahan" value={farmId} onSelect={setFarmId} disabled={!online} searchable
        options={(farms.data?.data ?? []).map((farm) => ({ label: farm.nama, value: farm.id }))} placeholder="Pilih kelompok lahan" />
      <FormDateField label="Tanggal" value={tanggal} onChange={setTanggal} />
      {online && !farmId && <Text style={styles.muted}>Pilih kelompok lahan untuk melihat pratinjau.</Text>}
      {online && !!farmId && query.isLoading && <ActivityIndicator />}
      {online && query.isError && <View style={styles.stack}>
        <Text style={styles.error}>{closeFailure(query.error).text}</Text>
        <Button title="Coba lagi" variant="secondary" onPress={() => void query.refetch()} />
      </View>}
      {preview && <>
        <ClosePreview preview={preview} tphInput={tphInput} notes={noteFields} />
        <TextInput accessibilityLabel="Catatan penutupan" style={styles.input} editable={editable} multiline maxLength={1000}
          value={catatan} onChangeText={setCatatan} placeholder="Catatan penutupan (opsional)" />
        {sent && <Text style={styles.success}>Tutup harian diajukan. Restan yang dihitung kini sudah bisa diambil truk; Asisten menyetujui paling lambat batas persetujuan.</Text>}
        {block && <Text style={styles.error}>{block}</Text>}
        <Button title="Ajukan tutup harian" loading={busy} disabled={!!block}
          onPress={() => Alert.alert('Ajukan tutup harian?', 'Restan yang dihitung langsung tersedia untuk truk.', [
            { text: 'Batal', style: 'cancel' }, { text: 'Ajukan', onPress: () => void submit() }])} />
      </>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: 16, gap: 14, paddingBottom: 120 },
  stack: { gap: 8 },
  offline: { padding: 14, borderRadius: 10, backgroundColor: '#FFF3E0' },
  offlineText: { color: BrandColors.error, fontWeight: '600' },
  counts: { gap: 4, paddingVertical: 6 },
  row: { flexDirection: 'row', gap: 8 },
  label: { color: BrandColors.textSecondary, fontSize: 13 },
  input: { flex: 1, borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, backgroundColor: '#FFF' },
  missing: { borderColor: BrandColors.error },
  muted: { color: BrandColors.textSecondary },
  error: { color: BrandColors.error },
  success: { color: BrandColors.success, fontWeight: '600' },
});
