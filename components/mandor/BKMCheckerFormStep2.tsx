import { Button } from '@/components/core/Button';
import { FormField, FormSelect } from '@/components/form';
import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import { useFleetChoices } from '@/hooks/useFleetChoices';
import { checkerLoadConflict } from '@/utils/transport';
import { isWholeKg } from '@/utils/field-summary';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
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
  kendaraan_id: string;
  supir_id: string;
  manualVehicle: boolean;
  manualDriver: boolean;
  nomor_truk: string;
  nama_sopir: string;
  tujuan_kirim: string;
}

const emptyDetailForm: DetailFormLocal = {
  tipe_pengiriman: 'LANGSUNG',
  kendaraan_id: '',
  supir_id: '',
  manualVehicle: false,
  manualDriver: false,
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
  onEdit: () => void;
  onDelete: () => void;
}

function GradingRow({ detail, onUpdate, onEdit, onDelete }: GradingRowProps) {
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
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardTitle}>
            {detail.tipe_pengiriman} · Truk: {detail.nomor_truk || '-'}
          </Text>
          <Text style={styles.cardSubtitle}>
            Sopir: {detail.nama_sopir || '-'} · Tujuan: {detail.tujuan_kirim || '-'}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color={BrandColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={BrandColors.error} />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.brondolLabel}>Brondol (kg)</Text>
        <TextInput
          style={styles.brondolInput}
          value={String(detail.jumlah_brondol ?? '')}
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

export function BKMCheckerFormStep2({ onNext, onBack }: Props) {
  const { details, addDetail, updateDetail, removeDetail } = useBkmCheckerStore();
  const fleet = useFleetChoices();
  const [form, setForm] = useState<DetailFormLocal>({ ...emptyDetailForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const handleEditDetail = useCallback(
    (detail: (typeof details)[number]) => {
      setForm({
        tipe_pengiriman: detail.tipe_pengiriman,
        kendaraan_id: detail.kendaraan_id ?? '',
        supir_id: detail.supir_id ?? '',
        manualVehicle: !detail.kendaraan_id,
        manualDriver: !detail.supir_id,
        nomor_truk: detail.nomor_truk ?? '',
        nama_sopir: detail.nama_sopir ?? '',
        tujuan_kirim: detail.tujuan_kirim ?? '',
      });
      setEditingId(detail._tempId);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    },
    [details],
  );

  const handleDeleteDetail = useCallback(
    (tempId: string) => {
      Alert.alert('Hapus Detail?', 'Detail truk ini akan dihapus dari BKM Checker.', [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            removeDetail(tempId);
            setEditingId((prev) => (prev === tempId ? null : prev));
          },
        },
      ]);
    },
    [removeDetail],
  );

  const handleAddDetail = useCallback(() => {
    if (!form.tipe_pengiriman) return;

    if (form.tipe_pengiriman !== 'RESTAN') {
      const missing: string[] = [];
      if (!form.nomor_truk.trim()) missing.push('Nomor Truk');
      if (!form.nama_sopir.trim()) missing.push('Nama Sopir');
      if (!form.tujuan_kirim.trim()) missing.push('Tujuan Kirim');
      if (missing.length > 0) {
        Alert.alert('Data Belum Lengkap', `Lengkapi ${missing.join(', ')} untuk pengiriman ${form.tipe_pengiriman}.`);
        return;
      }
    }

    const truckFields = {
      tipe_pengiriman: form.tipe_pengiriman,
      kendaraan_id: form.kendaraan_id || undefined,
      supir_id: form.supir_id || undefined,
      nomor_truk: form.nomor_truk || undefined,
      nama_sopir: form.nama_sopir || undefined,
      tujuan_kirim: form.tujuan_kirim || undefined,
    };

    const candidate = editingId
      ? details.map((row) => row._tempId === editingId ? { ...row, ...truckFields } : row)
      : [...details, truckFields];
    const conflict = checkerLoadConflict(candidate);
    if (conflict) { Alert.alert('Muatan berbeda', conflict); return; }

    if (editingId) {
      updateDetail(editingId, truckFields);
    } else {
      addDetail({
        bkm_checker_id: '',
        ...truckFields,
        janjang_normal: 0,
        buah_mentah: 0,
        over_ripe: 0,
        tangkai_panjang: 0,
        buah_abnormal: 0,
        janjang_kosong: 0,
        jumlah_janjang: 0,
        jumlah_brondol: 0,
      });
    }

    setEditingId(null);
    setForm({ ...emptyDetailForm });
  }, [form, editingId, addDetail, updateDetail]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyDetailForm });
  }, []);

  const totalAllJanjang = details.reduce((sum, d) => sum + d.jumlah_janjang, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Tambah Truk & Pengiriman</Text>

        {editingId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerText}>
              Mengedit detail — ubah data lalu tekan Simpan Perubahan.
            </Text>
            <TouchableOpacity onPress={handleCancelEdit} activeOpacity={0.7}>
              <Text style={styles.editingBannerCancel}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}

        <FormSelect
          label="Tipe Pengiriman"
          value={form.tipe_pengiriman}
          options={TIPE_PENGIRIMAN_OPTIONS}
          onSelect={(val) => setForm((f) => ({ ...f, tipe_pengiriman: val as any }))}
          placeholder="Pilih Tipe"
        />

        <FormSelect label="Kendaraan" searchable
          value={form.manualVehicle ? '__manual__' : form.kendaraan_id}
          options={[...fleet.vehicles.map((row) => ({ label: row.nomor_kendaraan, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
          onSelect={(id) => {
            const row = fleet.vehicles.find((vehicle) => vehicle.id === id);
            setForm((current) => ({ ...current, manualVehicle: id === '__manual__',
              kendaraan_id: row?.id ?? '', nomor_truk: row?.nomor_kendaraan ?? (id === '__manual__' ? current.nomor_truk : '') }));
          }} placeholder="Pilih kendaraan atau ketik manual" />
        {(form.manualVehicle || !fleet.vehicles.length) && <FormField
          label="Nomor Truk" value={form.nomor_truk}
          onChangeText={(val) => setForm((f) => ({ ...f, kendaraan_id: '', manualVehicle: true, nomor_truk: val }))}
          placeholder="B 1234 XY" />}

        <FormSelect label="Sopir" searchable
          value={form.manualDriver ? '__manual__' : form.supir_id}
          options={[...fleet.drivers.map((row) => ({ label: row.nama, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
          onSelect={(id) => {
            const row = fleet.drivers.find((driver) => driver.id === id);
            setForm((current) => ({ ...current, manualDriver: id === '__manual__',
              supir_id: row?.id ?? '', nama_sopir: row?.nama ?? (id === '__manual__' ? current.nama_sopir : '') }));
          }} placeholder="Pilih sopir atau ketik manual" />
        {(form.manualDriver || !fleet.drivers.length) && <FormField
          label="Nama Sopir" value={form.nama_sopir}
          onChangeText={(val) => setForm((f) => ({ ...f, supir_id: '', manualDriver: true, nama_sopir: val }))}
          placeholder="Nama sopir" />}

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
          <Ionicons name={editingId ? 'checkmark-circle' : 'add-circle'} size={20} color={BrandColors.white} />
          <Text style={styles.addButtonText}>
            {editingId ? 'Simpan Perubahan' : 'Tambah Detail'}
          </Text>
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
                  onEdit={() => handleEditDetail(item)}
                  onDelete={() => handleDeleteDetail(item._tempId)}
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
        <Button title="Kembali" onPress={onBack} variant="secondary" style={{ flex: 1 }} />
        <Button
          title="Review & Konfirmasi"
          onPress={onNext}
          disabled={details.length === 0}
          variant="primary"
          style={{ flex: 2 }}
        />
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.background,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E1',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  editingBannerText: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  editingBannerCancel: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.primary,
    marginLeft: 8,
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
    padding: 16,
    backgroundColor: BrandColors.background,
    borderTopWidth: 1,
    borderTopColor: BrandColors.inputBorder,
  },
});
