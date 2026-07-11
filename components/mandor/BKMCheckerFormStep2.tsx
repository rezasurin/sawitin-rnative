import { FormField, FormSelect } from '@/components/form';
import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const TIPE_PENGIRIMAN_OPTIONS = [
  { label: 'Langsung', value: 'LANGSUNG' },
  { label: 'Titip', value: 'TITIP' },
  { label: 'Restan', value: 'RESTAN' },
];

const GRADING_FIELDS = [
  { key: 'janjang_normal' as const, label: 'Normal' },
  { key: 'buah_mentah' as const, label: 'Buah Mentah' },
  { key: 'over_ripe' as const, label: 'Over Ripe' },
  { key: 'tangkai_panjang' as const, label: 'Tangkai Panjang' },
  { key: 'buah_abnormal' as const, label: 'Buah Abnormal' },
  { key: 'janjang_kosong' as const, label: 'Janjang Kosong' },
];

interface DetailFormLocal {
  tipe_pengiriman: 'LANGSUNG' | 'TITIP' | 'RESTAN';
  nomor_truk: string;
  nama_sopir: string;
  tujuan_kirim: string;
}

const emptyDetailForm: DetailFormLocal = {
  tipe_pengiriman: 'LANGSUNG',
  nomor_truk: '',
  nama_sopir: '',
  tujuan_kirim: '',
};

function calcTotal(detail: Record<string, unknown>) {
  return GRADING_FIELDS.reduce(
    (sum, f) => sum + (Number(detail[f.key]) || 0),
    0,
  );
}

interface GradingRowProps {
  detail: ReturnType<typeof useBkmCheckerStore.getState>['details'][number];
  onUpdate: (updates: Record<string, unknown>) => void;
}

function GradingRow({ detail, onUpdate }: GradingRowProps) {
  const handleStepper = useCallback(
    (key: string, delta: number) => {
      const current = Number(detail[key as keyof typeof detail] ?? 0);
      onUpdate({ [key]: Math.max(0, current + delta) });
    },
    [detail, onUpdate],
  );

  const total = calcTotal(detail as unknown as Record<string, unknown>);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {detail.tipe_pengiriman} · Truk: {detail.nomor_truk || '-'}
        </Text>
        <Text style={styles.cardSubtitle}>
          Sopir: {detail.nama_sopir || '-'} · Tujuan: {detail.tujuan_kirim || '-'}
        </Text>
      </View>

      {GRADING_FIELDS.map((field) => (
        <View key={field.key} style={styles.gradingRow}>
          <Text style={styles.gradingLabel}>{field.label}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => handleStepper(field.key, -1)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperValue}
              value={String(detail[field.key] ?? 0)}
              keyboardType="numeric"
              onChangeText={(val) => {
                const n = parseInt(val, 10);
                if (!isNaN(n) && n >= 0) {
                  onUpdate({ [field.key]: n });
                }
              }}
            />
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => handleStepper(field.key, 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Janjang</Text>
        <Text style={styles.totalValue}>{total}</Text>
      </View>

      <View style={styles.brondolRow}>
        <Text style={styles.brondolLabel}>Brondolan (kg)</Text>
        <TextInput
          style={styles.brondolInput}
          value={String(detail.jumlah_brondol ?? '')}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={BrandColors.textMuted}
          onChangeText={(val) => {
            const n = parseInt(val, 10);
            onUpdate({ jumlah_brondol: isNaN(n) ? 0 : n });
          }}
        />
      </View>
    </View>
  );
}

export function BKMCheckerFormStep2({ onNext, onBack }: Props) {
  const { details, addDetail, updateDetail, removeDetail } = useBkmCheckerStore();
  const [form, setForm] = useState<DetailFormLocal>({ ...emptyDetailForm });
  const [showGrading, setShowGrading] = useState<string | null>(null);

  const handleAddDetail = useCallback(() => {
    if (!form.tipe_pengiriman) return;
    addDetail({
      bkm_checker_id: '',
      tipe_pengiriman: form.tipe_pengiriman,
      nomor_truk: form.nomor_truk || undefined,
      nama_sopir: form.nama_sopir || undefined,
      tujuan_kirim: form.tujuan_kirim || undefined,
      janjang_normal: 0,
      buah_mentah: 0,
      over_ripe: 0,
      tangkai_panjang: 0,
      buah_abnormal: 0,
      janjang_kosong: 0,
      jumlah_janjang: 0,
      jumlah_brondol: 0,
    });
    setForm({ ...emptyDetailForm });
  }, [form, addDetail]);

  const totalAllJanjang = details.reduce((sum, d) => sum + d.jumlah_janjang, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Tambah Truk & Pengiriman</Text>

        <FormSelect
          label="Tipe Pengiriman"
          value={form.tipe_pengiriman}
          options={TIPE_PENGIRIMAN_OPTIONS}
          onSelect={(val) => setForm((f) => ({ ...f, tipe_pengiriman: val as any }))}
          placeholder="Pilih Tipe"
        />

        <FormField
          label="Nomor Truk"
          value={form.nomor_truk}
          onChangeText={(val) => setForm((f) => ({ ...f, nomor_truk: val }))}
          placeholder="B 1234 XY"
        />

        <FormField
          label="Nama Sopir"
          value={form.nama_sopir}
          onChangeText={(val) => setForm((f) => ({ ...f, nama_sopir: val }))}
          placeholder="Nama sopir"
        />

        <FormField
          label="Tujuan Kirim"
          value={form.tujuan_kirim}
          onChangeText={(val) => setForm((f) => ({ ...f, tujuan_kirim: val }))}
          placeholder="Nama PKS / tujuan"
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddDetail}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={20} color={BrandColors.white} />
          <Text style={styles.addButtonText}>Tambah Detail</Text>
        </TouchableOpacity>

        {details.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              Detail Ditambahkan ({details.length})
            </Text>

            <FlatList
              data={details}
              keyExtractor={(item) => item._tempId}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <GradingRow
                  detail={item}
                  onUpdate={(updates) => updateDetail(item._tempId, updates as any)}
                />
              )}
            />
          </View>
        )}

        {details.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ringkasan</Text>
            <Text style={styles.summaryText}>
              {details.length} detail · Total Janjang: {totalAllJanjang}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, details.length === 0 && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={details.length === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.nextButtonText}>Review & Konfirmasi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    height: 44,
    borderRadius: 4,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: BrandColors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  listSection: { marginTop: 24 },
  card: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  gradingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gradingLabel: {
    fontSize: 14,
    color: BrandColors.textPrimary,
    flex: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: BrandColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  stepperValue: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    backgroundColor: BrandColors.white,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BrandColors.inputBorder,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  brondolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  brondolLabel: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  brondolInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 14,
    color: BrandColors.textPrimary,
    backgroundColor: BrandColors.white,
  },
  summaryCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F3EA',
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.primary,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: BrandColors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 2,
    backgroundColor: BrandColors.button,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
