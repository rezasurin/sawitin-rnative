import { FormDateField, FormField, FormSelect } from '@/components/form';
import { Button } from '@/components/core/Button';
import { agronomyLabel, operationalTphs, tphLabel } from '@/utils/plantation';
import { TphLocation } from './TphLocation';
import { blokApi, lahanApi, tphApi } from '@/services';
import { bkmPanenApi } from '@/services/bkm-panen.service';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

interface Props {
  onNext: () => void;
}

function formatLaporanDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function BKMCheckerFormStep1({ onNext }: Props) {
  const { header, setHeader } = useBkmCheckerStore();

  const { data: blokData } = useQuery({
    queryKey: ['blok', 'all'],
    queryFn: () => blokApi.getAll({ limit: 200 }),
  });

  const { data: tphData } = useQuery({
    queryKey: ['tph', 'all'],
    queryFn: () => tphApi.getAll({ limit: 200 }),
  });

  const { data: lahanData } = useQuery({
    queryKey: ['lahan', 'all'],
    queryFn: () => lahanApi.getAll({ limit: 200 }),
  });

  const { data: panenData } = useQuery({
    queryKey: ['bkmPanen', 'approved'],
    queryFn: () => bkmPanenApi.getAll({
      limit: 100,
      sort: 'tanggal_laporan:desc',
      filters: JSON.stringify({ status: 'APPROVED' }),
    }),
  });

  const blokOptions = (blokData?.data ?? []).map((b) => ({
    label: agronomyLabel(b),
    value: b.id,
  }));

  const tphOptions = operationalTphs(tphData?.data ?? [], lahanData?.data ?? [], header.blok_id)
    .map((t) => ({ label: tphLabel(t), value: t.id }));

  const panenOptions = (panenData?.data ?? []).map((p) => ({
    label: `${p.blok?.nama ?? p.blok_id} — ${formatLaporanDate(p.tanggal_laporan)}`,
    value: p.id,
  }));

  const isValid = !!header.blok_id && tphOptions.some((t) => t.value === header.tph_id) && !!header.tanggal_laporan;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <FormSelect
        label="BKM Panen (Opsional)"
        value={header.bkm_panen_id ?? ''}
        options={panenOptions}
        onSelect={(val) => setHeader({ bkm_panen_id: val })}
        placeholder="Pilih BKM Panen yang sudah disetujui"
        searchable
      />

      <FormSelect
        label="Blok"
        value={header.blok_id}
        options={blokOptions}
        onSelect={(val) => {
          setHeader({ blok_id: val, tph_id: '' });
        }}
        placeholder="Pilih Blok"
        searchable
      />

      <FormSelect
        label="TPH"
        value={header.tph_id}
        options={tphOptions}
        onSelect={(val) => setHeader({ tph_id: val })}
        placeholder={header.blok_id ? 'Pilih TPH' : 'Pilih Blok terlebih dahulu'}
        disabled={!header.blok_id}
        searchable
      />

      <TphLocation key={header.tph_id} tph={tphData?.data?.find((t) => t.id === header.tph_id)} />

      <FormDateField
        label="Tanggal Laporan"
        value={header.tanggal_laporan ?? ''}
        onChange={(val) => setHeader({ tanggal_laporan: val })}
      />

      <FormField
        label="Keterangan (Opsional)"
        value={header.keterangan ?? ''}
        onChangeText={(val) => setHeader({ keterangan: val })}
        placeholder="Catatan tambahan"
        multiline
        numberOfLines={3}
      />

      <Button
        title="Lanjutkan ke Truk & Grading"
        disabled={!isValid}
        onPress={onNext}
        style={styles.nextButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 16 },
  nextButton: {
    marginTop: 24,
  },
});
