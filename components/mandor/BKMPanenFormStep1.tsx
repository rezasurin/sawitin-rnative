import { FormField, FormSelect } from "@/components/form";
import { Text, View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import { blokApi, lahanApi, grupPekerjaApi } from "@/services";
import { useBkmPanenStore } from "@/stores/useBkmPanenStore";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

interface Props {
  onNext: () => void;
}

export function BKMPanenFormStep1({ onNext }: Props) {
  const { header, setHeader } = useBkmPanenStore();
  const insets = useSafeAreaInsets();

  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const parsedDate = header.tanggal_laporan
    ? new Date(header.tanggal_laporan)
    : new Date();

  const handleDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setHeader({ tanggal_laporan: formatTanggal(selectedDate) });
    }
  };

  const formatTanggal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

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

      <View style={styles.fieldWrapper}>
        <Text style={styles.label}>Tanggal Laporan</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dateText,
              !header.tanggal_laporan && styles.placeholder,
            ]}
          >
            {header.tanggal_laporan ? header.tanggal_laporan : "Pilih Tanggal"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={parsedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              themeVariant="light"
            />
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Selesai</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

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

      <TouchableOpacity
        style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
        onPress={onNext}
        disabled={!isValid}
        activeOpacity={0.7}
      >
        <Text style={styles.nextButtonText}>Lanjutkan ke Pekerja & TPH</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { padding: 16 },
  fieldWrapper: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  dateButton: {
    height: 48,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: BrandColors.white,
  },
  dateText: { fontSize: 16, color: BrandColors.textPrimary },
  placeholder: { color: BrandColors.textMuted },
  nextButton: {
    backgroundColor: BrandColors.button,
    height: 48,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerContainer: {
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    overflow: 'hidden',
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  datePickerDoneText: {
    color: BrandColors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
