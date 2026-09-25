import { Button } from '@/components/core/Button';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { FormSelect } from '@/components/form';
import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { pekerjaApi, tphApi, tipePekerjaanApi, lahanApi } from '@/services';
import { memberLabel, operationalTphs, tphLabel } from '@/utils/plantation';
import { TphLocation } from './TphLocation';
import { useBkmPanenStore } from '@/stores/useBkmPanenStore';
import type { Pekerja } from '@/types/master-data';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@/hooks/useLocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

interface DetailFormLocal {
  pekerja_id: string;
  tph_id: string;
  jenis_pekerjaan: string;
  lat: number | null;
  lng: number | null;
  gps_accuracy: number | null;
  captured_at: string | null;
}

const emptyDetailForm: DetailFormLocal = {
  pekerja_id: '',
  tph_id: '',
  jenis_pekerjaan: '',
  lat: null,
  lng: null,
  gps_accuracy: null,
  captured_at: null,
};

export function BKMPanenFormStep2({ onNext, onBack }: Props) {
  const { header, details, addDetail, removeDetail, updateDetail, isEditing } = useBkmPanenStore();
  const policy = useOperationalPolicy('bkmPanen', 'DRAFT', details.length);
  const [form, setForm] = useState<DetailFormLocal>({ ...emptyDetailForm });
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const { captureLocation, loading: locationLoading } = useLocation();
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const insets = useSafeAreaInsets();

  const { data: pekerjaData } = useQuery({
    queryKey: ['pekerja', 'all'],
    queryFn: () => pekerjaApi.getAll({ limit: 200 }),
  });

  const { data: tphData } = useQuery({
    queryKey: ['tph', 'all'],
    queryFn: () => tphApi.getAll({ limit: 200 }),
  });

  const { data: lahanData } = useQuery({
    queryKey: ['lahan', 'all'],
    queryFn: () => lahanApi.getAll({ limit: 200 }),
  });

  const { data: tipePekerjaanData } = useQuery({
    queryKey: ['tipePekerjaan', 'all'],
    queryFn: () => tipePekerjaanApi.getAll({ limit: 200 }),
  });

  const pekerjaById = useMemo(() => {
    const map = new Map<string, Pekerja>();
    (pekerjaData?.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [pekerjaData]);

  const pekerjaOptions = (pekerjaData?.data ?? []).map((p) => ({
    label: memberLabel(p.member, p.id),
    value: p.id,
  }));

  const tphOptions = operationalTphs(tphData?.data ?? [], lahanData?.data ?? [], header.blok_id, header.lahan_id).map((t) => ({
    label: tphLabel(t),
    value: t.id,
  }));

  const tipePekerjaanOptions = (tipePekerjaanData?.data ?? []).map((tp) => ({
    label: tp.nama,
    value: tp.id,
  }));

  const detailFormValid =
    !!form.pekerja_id && tphOptions.some((t) => t.value === form.tph_id) && !!form.jenis_pekerjaan;

  const handleSaveDetail = useCallback(() => {
    if (!detailFormValid || !editingTempId && !policy.addDetail) return;
    if (editingTempId) {
      updateDetail(editingTempId, {
        pekerja_id: form.pekerja_id,
        tph_id: form.tph_id,
        jenis_pekerjaan: form.jenis_pekerjaan,
        lat: form.lat ?? undefined,
        lng: form.lng ?? undefined,
        gps_accuracy: form.gps_accuracy ?? undefined,
        captured_at: form.captured_at ?? undefined,
      });
      setEditingTempId(null);
    } else {
      addDetail({
        bkm_panen_id: '',
        pekerja_id: form.pekerja_id,
        tph_id: form.tph_id,
        jenis_pekerjaan: form.jenis_pekerjaan,
        janjang_normal: 0,
        buah_mentah: 0,
        over_ripe: 0,
        tangkai_panjang: 0,
        buah_abnormal: 0,
        janjang_kosong: 0,
        jumlah_janjang: 0,
        lat: form.lat ?? undefined,
        lng: form.lng ?? undefined,
        gps_accuracy: form.gps_accuracy ?? undefined,
        captured_at: form.captured_at ?? undefined,
      });
    }
    setForm({ ...emptyDetailForm });
    setGpsCaptured(false);
  }, [form, detailFormValid, addDetail, updateDetail, editingTempId, policy.addDetail]);

  const handleEditDetail = useCallback((item: any) => {
    setForm({
      pekerja_id: item.pekerja_id,
      tph_id: item.tph_id,
      jenis_pekerjaan: item.jenis_pekerjaan,
      lat: item.lat ?? null,
      lng: item.lng ?? null,
      gps_accuracy: item.gps_accuracy ?? null,
      captured_at: item.captured_at ?? null,
    });
    setGpsCaptured(!!item.lat && !!item.lng);
    setEditingTempId(item._tempId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setForm({ ...emptyDetailForm });
    setGpsCaptured(false);
    setEditingTempId(null);
  }, []);

  const handleCaptureGps = useCallback(async () => {
    setGpsCaptured(false);
    const loc = await captureLocation();
    if (loc) {
      // Accuracy and capture time travel with the position. The capture time is
      // the platform's, not the moment this row is finally uploaded.
      setForm((f) => ({
        ...f,
        lat: loc.latitude,
        lng: loc.longitude,
        gps_accuracy: loc.accuracy,
        captured_at: loc.capturedAt,
      }));
      setGpsCaptured(true);
    }
  }, [captureLocation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Tambah Pekerja & TPH</Text>

        <FormSelect
        label="Pekerja"
        value={form.pekerja_id}
        options={pekerjaOptions}
        onSelect={(val) => setForm((f) => ({ ...f, pekerja_id: val }))}
        placeholder="Pilih Pekerja"
        searchable
      />

      <FormSelect
        label="TPH"
        value={form.tph_id}
        options={tphOptions}
        onSelect={(val) => setForm((f) => ({ ...f, tph_id: val }))}
        placeholder="Pilih TPH"
        searchable
      />

      <TphLocation key={form.tph_id} tph={tphData?.data?.find((t) => t.id === form.tph_id)} />

      <FormSelect
        label="Jenis Pekerjaan"
        value={form.jenis_pekerjaan}
        options={tipePekerjaanOptions}
        onSelect={(val) => setForm((f) => ({ ...f, jenis_pekerjaan: val }))}
        placeholder="Pilih Jenis Pekerjaan"
      />

      <TouchableOpacity
        style={[styles.gpsButton, gpsCaptured && styles.gpsButtonCaptured]}
        onPress={handleCaptureGps}
        disabled={locationLoading}
        activeOpacity={0.7}
      >
        <Ionicons
          name={gpsCaptured ? 'location' : 'location-outline'}
          size={20}
          color={gpsCaptured ? BrandColors.success : BrandColors.textSecondary}
        />
        <Text style={[styles.gpsButtonText, gpsCaptured && styles.gpsButtonTextCaptured]}>
          {locationLoading
            ? 'Mengambil lokasi...'
            : gpsCaptured
              ? `GPS: ${form.lat?.toFixed(5)}, ${form.lng?.toFixed(5)}${form.gps_accuracy ? ` · ±${Math.round(form.gps_accuracy)} m` : ''}`
              : 'Ambil Lokasi GPS'}
        </Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        {editingTempId && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.addButton,
            !detailFormValid && styles.addButtonDisabled,
          ]}
          onPress={handleSaveDetail}
          disabled={!detailFormValid || !editingTempId && !policy.addDetail}
          activeOpacity={0.7}
        >
          <Ionicons name={editingTempId ? "checkmark-circle" : "add-circle"} size={20} color={BrandColors.white} />
          <Text style={styles.addButtonText}>{editingTempId ? 'Update Detail' : 'Tambah Detail'}</Text>
        </TouchableOpacity>
      </View>

      {details.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            Detail Ditambahkan ({details.length})
          </Text>

          <FlatList
            data={details}
            keyExtractor={(item) => item._tempId}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const p = pekerjaById.get(item.pekerja_id);
              return (
                <View style={styles.detailCard}>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailName}>
                      {memberLabel(p?.member, item.pekerja_id)}
                    </Text>
                    <Text style={styles.detailMeta}>
                      TPH: {tphData?.data?.find((t) => t.id === item.tph_id)?.nama ?? item.tph_id}
                    </Text>
              <Text style={styles.detailMeta}>
                {tipePekerjaanData?.data?.find((tp) => tp.id === item.jenis_pekerjaan)?.nama ?? item.jenis_pekerjaan}
              </Text>
              {item.lat != null && item.lng != null && (
                <Text style={styles.detailMeta}>
                  GPS: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                </Text>
              )}
            </View>
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      onPress={() => handleEditDetail(item)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={{ marginRight: 16 }}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={20}
                        color={BrandColors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={isEditing && !!item.serverId && !policy.deleteDetail}
                      onPress={() => { if (!isEditing || !item.serverId || policy.deleteDetail) removeDetail(item._tempId); }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={BrandColors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Ringkasan Aktif</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricValue}>{new Set(details.map((d) => d.tph_id)).size}</Text>
            <Text style={styles.summaryMetricLabel}>TPH</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricValue}>{new Set(details.map((d) => d.pekerja_id)).size}</Text>
            <Text style={styles.summaryMetricLabel}>Pekerja</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricValue}>{details.length}</Text>
            <Text style={styles.summaryMetricLabel}>Detail</Text>
          </View>
        </View>
      </View>

      </ScrollView>

      <View style={[styles.navButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="Kembali"
          onPress={onBack}
          variant="secondary"
          style={{ flex: 1 }}
        />

        <Button
          title="Lanjutkan ke Grading"
          onPress={onNext}
          disabled={details.length === 0 || details.some((d) => !tphOptions.some((t) => t.value === d.tph_id))}
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
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    backgroundColor: BrandColors.white,
    gap: 8,
    marginTop: 12,
  },
  gpsButtonCaptured: {
    borderColor: BrandColors.success,
    backgroundColor: '#F0FFF0',
  },
  gpsButtonText: {
    color: BrandColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  gpsButtonTextCaptured: {
    color: BrandColors.success,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: BrandColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    height: 44,
    borderRadius: 4,
    gap: 8,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: {
    color: BrandColors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  listSection: { marginTop: 24 },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  detailInfo: { flex: 1 },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailName: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  detailMeta: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
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
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryMetric: {
    alignItems: 'center',
  },
  summaryMetricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  summaryMetricLabel: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 2,
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
