import { Button } from '@/components/core/Button';
import { FormSelect } from '@/components/form';
import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { usePanenOfDay } from '@/hooks/useBkmChecker';
import { useOpenRestan } from '@/hooks/useOpenRestan';
import { blokApi, lahanApi, tphApi } from '@/services';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { queuedPanenAt, restanAgeDays } from '@/utils/dispatch';
import { estateDate } from '@/utils/estateDate';
import { isWholeKg } from '@/utils/field-summary';
import { agronomyLabel, operationalTphs } from '@/utils/plantation';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import type { TripLineDraft } from '@/types/bkm-checker';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const SOURCE_OPTIONS = [
  { label: 'Langsung (Panen hari ini)', value: 'LANGSUNG' },
  { label: 'Titip (restan hari sebelumnya)', value: 'TITIP' },
];

const GRADING_FIELDS = [
  { key: 'janjang_normal' as const, label: 'Normal' },
  { key: 'buah_mentah' as const, label: 'Buah Mentah' },
  { key: 'over_ripe' as const, label: 'Over Ripe' },
  { key: 'tangkai_panjang' as const, label: 'Tangkai Panjang' },
  { key: 'buah_abnormal' as const, label: 'Buah Abnormal' },
  { key: 'janjang_kosong' as const, label: 'Janjang Kosong' },
];

const emptyGrading = {
  janjang_normal: 0, buah_mentah: 0, over_ripe: 0, tangkai_panjang: 0, buah_abnormal: 0, janjang_kosong: 0,
  jumlah_janjang: 0, jumlah_brondol: 0,
};

let lineCounter = 0;
/** Fixed when the line is added; the server replays a line by this key. */
const newLineKey = () => `line_${Date.now().toString(36)}_${++lineCounter}_${Math.random().toString(36).slice(2, 8)}`;

type StoredLine = ReturnType<typeof useBkmCheckerStore.getState>['details'][number];

function LineCard({ line, onUpdate, onDelete }: { line: StoredLine; onUpdate: (updates: Partial<TripLineDraft>) => void; onDelete: () => void }) {
  const source = line.tipe_pengiriman === 'TITIP'
    ? `Titip · restan ${line.restan_max ?? 0} janjang`
    : line.bkm_panen_client_request_id ? 'Langsung · Panen belum terkirim' : 'Langsung · Panen hari ini';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardTitle}>{line.tph_nama}</Text>
          <Text style={styles.cardSubtitle}>{source}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn} activeOpacity={0.7} accessibilityLabel="Hapus muatan">
          <Ionicons name="trash-outline" size={18} color={BrandColors.error} />
        </TouchableOpacity>
      </View>

      {GRADING_FIELDS.map((field) => (
        <View key={field.key} style={styles.gradingRow}>
          <Text style={styles.gradingLabel}>{field.label}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => onUpdate({ [field.key]: Math.max(0, line[field.key] - 1) })} activeOpacity={0.7}>
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperValue}
              value={String(line[field.key])}
              keyboardType="numeric"
              onChangeText={(val) => {
                const n = parseInt(val, 10);
                if (!isNaN(n) && n >= 0) onUpdate({ [field.key]: n });
              }}
            />
            <TouchableOpacity style={styles.stepperBtn} onPress={() => onUpdate({ [field.key]: line[field.key] + 1 })} activeOpacity={0.7}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Janjang</Text>
        <Text style={styles.totalValue}>{line.jumlah_janjang}</Text>
      </View>

      <View style={styles.brondolRow}>
        <Text style={styles.brondolLabel}>Brondol (kg)</Text>
        <TextInput
          style={styles.brondolInput}
          value={String(line.jumlah_brondol ?? '')}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={BrandColors.textMuted}
          onChangeText={(val) => {
            if (val === '') onUpdate({ jumlah_brondol: 0 });
            else if (isWholeKg(val)) onUpdate({ jumlah_brondol: Number(val) });
          }}
        />
      </View>
    </View>
  );
}

/** One line per TPH the truck loads from: today's Panen there (Langsung) or an open restan there (Titip). */
export function BKMCheckerFormStep2({ onNext, onBack }: Props) {
  const { header, details, addDetail, updateDetail, removeDetail } = useBkmCheckerStore();
  const [blokId, setBlokId] = useState('');
  const [tphId, setTphId] = useState('');
  const [tipe, setTipe] = useState<'LANGSUNG' | 'TITIP'>('LANGSUNG');
  const [panenId, setPanenId] = useState('');
  const [restanId, setRestanId] = useState('');

  const { data: blokData } = useQuery({ queryKey: ['blok', 'all'], queryFn: () => blokApi.getAll({ limit: 200 }) });
  const { data: tphData } = useQuery({ queryKey: ['tph', 'all'], queryFn: () => tphApi.getAll({ limit: 200 }) });
  const { data: lahanData } = useQuery({ queryKey: ['lahan', 'all'], queryFn: () => lahanApi.getAll({ limit: 200 }) });
  const panenOfDay = usePanenOfDay(header.tanggal);
  const { loaded: restanLoaded, restan } = useOpenRestan(details);
  const queue = useSyncQueueStore((state) => state.queue);

  const tphs = operationalTphs(tphData?.data ?? [], lahanData?.data ?? [], blokId);
  const panenAtTph = (panenOfDay.data ?? []).filter((panen) => panen.details?.some((row) => row.tph_id === tphId));
  // Panen recorded on this phone and not synced yet: it has no server id, so the line names its offline id.
  const queuedAtTph = queuedPanenAt(queue, tphId, header.tanggal, panenOfDay.data);
  const restanAtTph = restan.filter((row) => row.tph_id === tphId);
  const today = estateDate();

  const panenOptions = panenAtTph.map((panen) => ({
    label: `${panen.blok?.nama ?? panen.blok_id ?? 'Panen'} · ${panen.details!.filter((row) => row.tph_id === tphId)
      .reduce((sum, row) => sum + row.jumlah_janjang, 0)} janjang · ${panen.status}`,
    value: panen.id,
  })).concat(queuedAtTph.map((panen) => ({
    label: `${blokData?.data.find((b) => b.id === panen.blok_id)?.nama ?? 'Panen'} · ${panen.janjang} janjang · belum terkirim`,
    value: panen.client_request_id,
  })));
  const restanOptions = restanAtTph.map((row) => ({
    label: `Panen ${estateDate(new Date(row.tanggal))} · ${restanAgeDays(row.tanggal, today)} hari · ${row.jumlah_janjang} janjang`,
    value: row.id,
  }));

  const canAdd = !!tphId && (tipe === 'LANGSUNG' ? !!panenId : !!restanId);

  const handleAdd = useCallback(() => {
    const tph = tphs.find((row) => row.id === tphId);
    if (!tph) return;
    const base = { client_detail_id: newLineKey(), tph_id: tph.id, tph_nama: tph.nama, ...emptyGrading };
    if (tipe === 'LANGSUNG') {
      const panen = panenAtTph.find((row) => row.id === panenId);
      if (panen) {
        addDetail({ ...base, tipe_pengiriman: 'LANGSUNG', bkm_panen_id: panen.id, panen_day: estateDate(new Date(panen.tanggal_laporan)) });
      } else if (queuedAtTph.some((row) => row.client_request_id === panenId)) {
        // The dispatch day was already matched when the queued Panen was listed.
        addDetail({ ...base, tipe_pengiriman: 'LANGSUNG', bkm_panen_client_request_id: panenId, panen_day: header.tanggal });
      } else return;
    } else {
      const row = restanAtTph.find((item) => item.id === restanId);
      if (!row) return;
      // A full pickup is the usual case; the Mandor lowers it for a partial one.
      addDetail({ ...base, tipe_pengiriman: 'TITIP', restan_id: row.id, restan_max: row.jumlah_janjang, janjang_normal: row.jumlah_janjang });
    }
    setPanenId('');
    setRestanId('');
  }, [tphs, tphId, tipe, panenAtTph, queuedAtTph, panenId, restanAtTph, restanId, addDetail, header.tanggal]);

  const handleDelete = (tempId: string) =>
    Alert.alert('Hapus Muatan?', 'Muatan TPH ini akan dihapus dari SPB.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => removeDetail(tempId) },
    ]);

  const totalJanjang = details.reduce((sum, d) => sum + d.jumlah_janjang, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Tambah Muatan dari TPH</Text>

        <FormSelect label="Blok" value={blokId} searchable placeholder="Pilih Blok"
          options={(blokData?.data ?? []).map((b) => ({ label: agronomyLabel(b), value: b.id }))}
          onSelect={(val) => { setBlokId(val); setTphId(''); setPanenId(''); setRestanId(''); }} />
        <FormSelect label="TPH" value={tphId} searchable disabled={!blokId}
          placeholder={blokId ? 'Pilih TPH' : 'Pilih Blok terlebih dahulu'}
          options={tphs.map((t) => ({ label: t.nama, value: t.id }))}
          onSelect={(val) => { setTphId(val); setPanenId(''); setRestanId(''); }} />
        <FormSelect label="Sumber Muatan" value={tipe} options={SOURCE_OPTIONS}
          onSelect={(val) => { setTipe(val as 'LANGSUNG' | 'TITIP'); setPanenId(''); setRestanId(''); }} />

        {tipe === 'LANGSUNG' ? (
          <FormSelect label="BKM Panen hari berangkat" value={panenId} options={panenOptions} disabled={!tphId}
            placeholder={tphId ? (panenOptions.length ? 'Pilih BKM Panen' : `Tidak ada Panen tanggal ${header.tanggal} di TPH ini`) : 'Pilih TPH terlebih dahulu'}
            onSelect={setPanenId} />
        ) : (
          <>
            <FormSelect label="Restan terbuka" value={restanId} options={restanOptions} disabled={!tphId}
              placeholder={tphId ? (restanOptions.length ? 'Pilih restan' : 'Tidak ada restan terbuka di TPH ini') : 'Pilih TPH terlebih dahulu'}
              onSelect={setRestanId} />
            {!restanLoaded && <Text style={styles.note}>Daftar restan belum pernah diunduh. Hubungkan internet lalu sinkronkan.</Text>}
          </>
        )}

        <TouchableOpacity style={[styles.addButton, !canAdd && styles.addButtonOff]} disabled={!canAdd} onPress={handleAdd} activeOpacity={0.7}>
          <Ionicons name="add-circle" size={20} color={BrandColors.white} />
          <Text style={styles.addButtonText}>Tambah Muatan</Text>
        </TouchableOpacity>

        {details.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Muatan ({details.length}) · {totalJanjang} janjang</Text>
            {details.map((line) => (
              <LineCard key={line._tempId} line={line} onUpdate={(updates) => updateDetail(line._tempId, updates)} onDelete={() => handleDelete(line._tempId)} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.navButtons}>
        <Button title="Kembali" onPress={onBack} variant="secondary" style={{ flex: 1 }} />
        <Button title="Review & Konfirmasi" onPress={onNext} disabled={details.length === 0} variant="primary" style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary, marginBottom: 12 },
  note: { fontSize: 12, color: BrandColors.textSecondary, marginBottom: 8 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BrandColors.primary, height: 44, borderRadius: 4, gap: 8, marginTop: 8,
  },
  addButtonOff: { opacity: 0.5 },
  addButtonText: { color: BrandColors.white, fontSize: 15, fontWeight: '600' },
  listSection: { marginTop: 24 },
  card: { backgroundColor: BrandColors.cardBg, borderRadius: 4, padding: 16, marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BrandColors.inputBorder,
  },
  cardHeaderInfo: { flex: 1, marginRight: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: BrandColors.background },
  cardTitle: { fontSize: 15, fontWeight: '600', color: BrandColors.textPrimary },
  cardSubtitle: { fontSize: 13, color: BrandColors.textSecondary, marginTop: 2 },
  gradingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  gradingLabel: { fontSize: 14, color: BrandColors.textPrimary, flex: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: { width: 36, height: 36, borderRadius: 4, backgroundColor: BrandColors.primary, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { color: BrandColors.white, fontSize: 18, fontWeight: '700' },
  stepperValue: {
    width: 56, height: 36, borderWidth: 1, borderColor: BrandColors.inputBorder, borderRadius: 4,
    textAlign: 'center', fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary, backgroundColor: BrandColors.white,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BrandColors.inputBorder,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: BrandColors.primary },
  totalValue: { fontSize: 18, fontWeight: '700', color: BrandColors.primary },
  brondolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  brondolLabel: { fontSize: 14, color: BrandColors.textSecondary },
  brondolInput: {
    width: 80, height: 36, borderWidth: 1, borderColor: BrandColors.inputBorder, borderRadius: 4,
    textAlign: 'center', fontSize: 14, color: BrandColors.textPrimary, backgroundColor: BrandColors.white,
  },
  navButtons: {
    flexDirection: 'row', gap: 12, padding: 16, backgroundColor: BrandColors.background,
    borderTopWidth: 1, borderTopColor: BrandColors.inputBorder,
  },
});
