import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { pekerjaApi, tphApi, uploadApi } from '@/services';
import { useBkmPanenStore } from '@/stores/useBkmPanenStore';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useImageCapture } from '@/hooks/useImageCapture';
import { Image } from 'react-native';
import React, { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const GRADING_FIELDS = [
  { key: 'janjang_normal' as const, label: 'Normal' },
  { key: 'buah_mentah' as const, label: 'Buah Mentah' },
  { key: 'over_ripe' as const, label: 'Over Ripe' },
  { key: 'tangkai_panjang' as const, label: 'Tangkai Panjang' },
  { key: 'buah_abnormal' as const, label: 'Buah Abnormal' },
  { key: 'janjang_kosong' as const, label: 'Janjang Kosong' },
];

function calcTotal(detail: Record<string, unknown>) {
  return GRADING_FIELDS.reduce(
    (sum, f) => sum + (Number(detail[f.key]) || 0),
    0,
  );
}

interface GradingRowProps {
  detail: ReturnType<typeof useBkmPanenStore.getState>['details'][number];
  onUpdate: (updates: Record<string, number>) => void;
  onPhotoCapture: () => void;
  photoLoading: boolean;
  uploading: boolean;
  pekerjaMap: Map<string, string>;
  tphMap: Map<string, string>;
}

function GradingRow({ detail, onUpdate, onPhotoCapture, photoLoading, uploading, pekerjaMap, tphMap }: GradingRowProps) {
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
        <Text style={styles.cardTitle}>{pekerjaMap.get(detail.pekerja_id) ?? detail.pekerja_id}</Text>
        <Text style={styles.cardSubtitle}>TPH: {tphMap.get(detail.tph_id) ?? detail.tph_id}</Text>
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

      <TouchableOpacity
        style={styles.photoButton}
        onPress={onPhotoCapture}
        disabled={photoLoading || uploading}
        activeOpacity={0.7}
      >
        <Ionicons
          name={detail.foto_url && !uploading ? 'camera' : 'camera-outline'}
          size={20}
          color={detail.foto_url && !uploading ? BrandColors.success : BrandColors.textSecondary}
        />
        <Text style={styles.photoButtonText}>
          {photoLoading
            ? 'Mengambil foto...'
            : uploading
              ? 'Mengunggah...'
              : detail.foto_url
                ? 'Foto terambil'
                : 'Ambil Foto'}
        </Text>
      </TouchableOpacity>

      {detail.foto_url && (
        <Image
          source={{ uri: detail.foto_url }}
          style={styles.photoPreview}
          resizeMode="cover"
        />
      )}

      <View style={styles.noteRow}>
        <Text style={styles.noteLabel}>Catatan</Text>
        <TextInput
          style={styles.noteInput}
          value={detail.note ?? ''}
          placeholder="Catatan opsional..."
          placeholderTextColor={BrandColors.textMuted}
          multiline
          numberOfLines={2}
          onChangeText={(val) => onUpdate({ note: val } as any)}
        />
      </View>
    </View>
  );
}

export function BKMPanenFormStep3({ onNext, onBack }: Props) {
  const { details, updateDetail } = useBkmPanenStore();
  const { captureFromCamera, loading: photoLoading } = useImageCapture();
  const insets = useSafeAreaInsets();
  const [activePhotoTempId, setActivePhotoTempId] = React.useState<string | null>(null);
  const [uploadingTempIds, setUploadingTempIds] = React.useState<Set<string>>(new Set());
  const { data: pekerjaData } = useQuery({
    queryKey: ['pekerja', 'all'],
    queryFn: () => pekerjaApi.getAll({ limit: 200 }),
  });
  const { data: tphData } = useQuery({
    queryKey: ['tph', 'all'],
    queryFn: () => tphApi.getAll({ limit: 200 }),
  });

  const pekerjaMap = useMemo(() => {
    const map = new Map<string, string>();
    (pekerjaData?.data ?? []).forEach((p) => map.set(p.id, p.member?.nama ?? p.id));
    return map;
  }, [pekerjaData]);

  const tphMap = useMemo(() => {
    const map = new Map<string, string>();
    (tphData?.data ?? []).forEach((t) => map.set(t.id, t.nama));
    return map;
  }, [tphData]);

  const totalAllJanjang = details.reduce((sum, d) => sum + d.jumlah_janjang, 0);

  const handlePhotoCapture = useCallback(async (tempId: string) => {
    setActivePhotoTempId(tempId);
    const result = await captureFromCamera();
    if (!result) {
      setActivePhotoTempId(null);
      return;
    }

    // Mark as uploading
    setUploadingTempIds((prev) => new Set(prev).add(tempId));
    try {
      const { url } = await uploadApi.uploadImage(result.uri, 'bkm-panen');
      updateDetail(tempId, { foto_url: url } as any);
    } catch {
      // Offline or network error — store local URI as fallback
      updateDetail(tempId, { foto_url: result.uri } as any);
    } finally {
      setUploadingTempIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
    setActivePhotoTempId(null);
  }, [captureFromCamera, updateDetail]);

  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <Text style={styles.stickyTitle}>
          Grading Janjang ({details.length} detail)
        </Text>
        <Text style={styles.stickyTotal}>
          Total Janjang: {totalAllJanjang}
        </Text>
      </View>

      <FlatList
        data={details}
        keyExtractor={(item) => item._tempId}
        renderItem={({ item }) => (
          <GradingRow
            detail={item}
            pekerjaMap={pekerjaMap}
            tphMap={tphMap}
            onPhotoCapture={() => handlePhotoCapture(item._tempId)}
            photoLoading={photoLoading && activePhotoTempId === item._tempId}
            uploading={uploadingTempIds.has(item._tempId)}
            onUpdate={(updates: Record<string, number>) =>
              updateDetail(item._tempId, updates)
            }
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.navButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNext}
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
  stickyHeader: {
    padding: 16,
    backgroundColor: BrandColors.primary,
  },
  stickyTitle: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  stickyTotal: {
    color: BrandColors.white,
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  listContent: { padding: 16, paddingBottom: 100 },
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
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    backgroundColor: BrandColors.white,
    gap: 8,
    marginTop: 12,
  },
  photoButtonText: {
    color: BrandColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    marginTop: 8,
  },
  noteRow: {
    marginTop: 12,
  },
  noteLabel: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    padding: 8,
    fontSize: 13,
    color: BrandColors.textPrimary,
    backgroundColor: BrandColors.white,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: BrandColors.background,
    borderTopWidth: 1,
    borderTopColor: BrandColors.inputBorder,
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
  nextButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
