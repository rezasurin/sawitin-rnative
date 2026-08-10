import { FormField, FormSelect } from '@/components/form';
import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { blokApi, lahanApi, tphApi } from '@/services';
import { bkmPanenApi } from '@/services/bkm-panen.service';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  onNext: () => void;
}

export function BKMCheckerFormStep1({ onNext }: Props) {
  const { header, setHeader } = useBkmCheckerStore();
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    queryFn: () => bkmPanenApi.getAll({ limit: 100 }),
  });

  const blokOptions = (blokData?.data ?? []).map((b) => ({
    label: b.nama,
    value: b.id,
  }));

  const lahanBlokMap = new Map<string, string | null>();
  (lahanData?.data ?? []).forEach((l) => lahanBlokMap.set(l.id, l.blok_id));

  const tphOptions = (tphData?.data ?? [])
    .filter((t) => !header.blok_id || lahanBlokMap.get(t.lahan_id) === header.blok_id)
    .map((t) => ({ label: t.nama, value: t.id }));

  const panenOptions = (panenData?.data ?? []).map((p) => ({
    label: `${p.blok?.nama ?? p.blok_id} — ${p.tanggal_laporan}`,
    value: p.id,
  }));

  const isValid = !!header.blok_id && !!header.tph_id && !!header.tanggal_laporan;

  const parsedDate = header.tanggal_laporan
    ? new Date(header.tanggal_laporan)
    : new Date();

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      setHeader({ tanggal_laporan: `${y}-${m}-${d}` });
    }
  };

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
        placeholder="Pilih TPH"
        searchable
      />

      <View style={styles.fieldWrapper}>
        <Text style={styles.label}>Tanggal Laporan</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateText, !header.tanggal_laporan && styles.placeholder]}>
            {header.tanggal_laporan || 'Pilih Tanggal'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={parsedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              themeVariant="light"
            />
            {Platform.OS === 'ios' && (
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
        value={header.keterangan ?? ''}
        onChangeText={(val) => setHeader({ keterangan: val })}
        placeholder="Catatan tambahan"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
        onPress={onNext}
        disabled={!isValid}
        activeOpacity={0.7}
      >
        <Text style={styles.nextButtonText}>Lanjutkan ke Truk & Grading</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 16 },
  fieldWrapper: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  dateButton: {
    height: 48,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: BrandColors.white,
  },
  dateText: { fontSize: 16, color: BrandColors.textPrimary },
  placeholder: { color: BrandColors.textMuted },
  nextButton: {
    backgroundColor: BrandColors.button,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
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
