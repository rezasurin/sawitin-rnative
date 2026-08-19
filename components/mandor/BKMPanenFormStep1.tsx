import { Button } from "@/components/core/Button";
import { FormDateField, FormField, FormSelect } from "@/components/form";
import { blokApi, lahanApi, grupPekerjaApi } from "@/services";
import { useBkmPanenStore } from "@/stores/useBkmPanenStore";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet } from "react-native";

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
    label: b.nama,
    value: b.id,
  }));

  const lahanOptions = (lahanData?.data ?? [])
    .filter((l) => !header.blok_id || l.blok_id === header.blok_id)
    .map((l) => ({
      label: l.nama,
      value: l.id,
    }));

  const grupOptions = (grupData?.data ?? []).map((g) => ({
    label: g.nama,
    value: g.id,
  }));

  const isValid = !!header.blok_id && !!header.tanggal_laporan;

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

      <FormDateField
        label="Tanggal Laporan"
        value={header.tanggal_laporan ?? ""}
        onChange={(val) => setHeader({ tanggal_laporan: val })}
      />

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
});
