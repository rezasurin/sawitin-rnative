import { Button } from "@/components/core/Button";
import { agronomyLabel, operationalLands } from '@/utils/plantation';
import { tbmReasonMissing, standMaturityOn } from '@/utils/maturity';
import { FormDateField, FormField, FormSelect } from "@/components/form";
import { blokApi, lahanApi, grupPekerjaApi } from "@/services";
import { useBkmPanenStore } from "@/stores/useBkmPanenStore";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text } from "react-native";

interface Props {
  onNext: () => void;
}

export function BKMPanenFormStep1({ onNext }: Props) {
  const { header, setHeader } = useBkmPanenStore();
  const insets = useSafeAreaInsets();

  const { data: blokData } = useQuery({
    queryKey: ["blok", "all"],
    queryFn: () => blokApi.getAll({ limit: 200 }),
  });

  const { data: lahanData } = useQuery({
    queryKey: ["lahan", "all"],
    queryFn: () => lahanApi.getAll({ limit: 200 }),
  });

  const { data: grupData } = useQuery({
    queryKey: ["grupPekerja", "all"],
    queryFn: () => grupPekerjaApi.getAll({ limit: 200 }),
  });

  const blokOptions = (blokData?.data ?? []).map((b) => ({
    label: agronomyLabel(b),
    value: b.id,
  }));

  const lahanOptions = operationalLands(lahanData?.data ?? [], header.blok_id)
    .map((l) => ({
      label: agronomyLabel(l),
      value: l.id,
    }));

  const grupOptions = (grupData?.data ?? []).map((g) => ({
    label: g.nama,
    value: g.id,
  }));

  // Harvest on immature (TBM) land is allowed, but only with a stated reason: most
  // of it is a wrong block or lahan. Judged on the Panen date with the TM date
  // when there is one, the same rule the server applies when the queue drains.
  const selectedLahan = lahanData?.data?.find((l) => l.id === header.lahan_id);
  const selectedBlok = blokData?.data?.find((b) => b.id === header.blok_id);
  const day = header.tanggal_laporan ?? '';
  const immature = standMaturityOn(selectedLahan, selectedBlok, day) === 'TBM';
  const reasonMissing = tbmReasonMissing({ lahan: selectedLahan, blok: selectedBlok, day, alasan: header.alasan_tbm });

  const isValid = !!header.blok_id && !!header.tanggal_laporan && !reasonMissing
    && (!header.lahan_id || lahanOptions.some((l) => l.value === header.lahan_id));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <FormSelect
        label="Blok"
        value={header.blok_id ?? ""}
        options={blokOptions}
        onSelect={(val) => {
          setHeader({
            blok_id: val,
            lahan_id: '',
          });
        }}
        placeholder="Pilih Blok"
        searchable
      />

      <FormSelect
        label="Lahan"
        value={header.lahan_id ?? ""}
        options={lahanOptions}
        onSelect={(val) => setHeader({ lahan_id: val })}
        placeholder={header.blok_id ? "Pilih Lahan" : "Pilih Blok terlebih dahulu"}
        searchable
        disabled={!header.blok_id}
      />
      {immature && (
        <Text style={styles.warning} accessibilityRole="alert">
          Pada tanggal ini {selectedLahan?.tanggal_tm || selectedLahan?.tahun_tanam != null ? 'lahan' : 'blok'} tercatat TBM (belum menghasilkan). Pastikan blok dan lahan sudah benar; jika memang dipanen, isi alasannya di bawah.
        </Text>
      )}

      <FormDateField
        label="Tanggal Laporan"
        value={header.tanggal_laporan ?? ""}
        onChange={(val) => setHeader({ tanggal_laporan: val })}
      />

      {immature && (
        <FormField
          label="Alasan Panen di Lahan TBM"
          value={header.alasan_tbm ?? ""}
          onChangeText={(val) => setHeader({ alasan_tbm: val })}
          placeholder="Wajib diisi untuk lahan TBM"
          multiline
          numberOfLines={2}
          maxLength={500}
        />
      )}

      <FormField
        label="Keterangan (Opsional)"
        value={header.keterangan ?? ""}
        onChangeText={(val) => setHeader({ keterangan: val })}
        placeholder="Catatan tambahan"
        multiline
        numberOfLines={3}
      />

      <FormSelect
        label="Grup Pekerja (Opsional)"
        value={header.grup_pekerja_id ?? ""}
        options={grupOptions}
        onSelect={(val) => setHeader({ grup_pekerja_id: val })}
        placeholder="Pilih Grup"
        searchable
      />

      <Button
        title="Lanjutkan ke Pekerja & TPH"
        onPress={onNext}
        disabled={!isValid}
        variant="primary"
        style={styles.nextButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { padding: 16 },
  nextButton: { marginTop: 24 },
  warning: { color: '#E65100', backgroundColor: '#FFF3E0', borderColor: '#E65100', borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 },
});
