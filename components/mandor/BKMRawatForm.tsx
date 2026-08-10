import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormSelect, FormField, FormDateField } from '@/components/form';
import { BrandColors } from '@/constants/Colors';
import {
  useLahanList,
  useBlokList,
  useKelompokLahanList,
} from '@/hooks';
import { useCreateBkmRawat } from '@/hooks/useBkmRawat';

interface Props {
  onSuccess: () => void;
}

interface FormErrors {
  kelompok_lahan_id?: string;
  lahan_id?: string;
  tanggal?: string;
  nama_pengawas?: string;
}

export function BKMRawatForm({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateBkmRawat();

  const [kelompokLahanId, setKelompokLahanId] = useState('');
  const [lahanId, setLahanId] = useState('');
  const [blokId, setBlokId] = useState('');
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [namaPengawas, setNamaPengawas] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: kelompokLahanList } = useKelompokLahanList({ limit: 200 });
  const { data: lahanList, isFetching: isFetchingLahan } = useLahanList({
    limit: 200,
    kelompok_lahan_id: kelompokLahanId || undefined,
  });
  const { data: blokList, isFetching: isFetchingBlok } = useBlokList({
    limit: 200,
    lahan_id: lahanId || undefined,
  });

  const kelompokLahanOptions = useMemo(
    () =>
      (kelompokLahanList?.data ?? []).map((g) => ({
        label: g.nama,
        value: g.id,
      })),
    [kelompokLahanList],
  );

  const lahanOptions = useMemo(
    () =>
      (lahanList?.data ?? []).map((l) => ({
        label: l.nama,
        value: l.id,
      })),
    [lahanList],
  );

  const blokOptions = useMemo(
    () => [
      { label: 'Tanpa Blok', value: '' },
      ...(blokList?.data ?? []).map((b) => ({
        label: b.nama,
        value: b.id,
      })),
    ],
    [blokList],
  );

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};

    if (!kelompokLahanId) {
      nextErrors.kelompok_lahan_id = 'Kelompok lahan wajib dipilih';
    }
    if (!lahanId) {
      nextErrors.lahan_id = 'Lahan wajib dipilih';
    }
    if (!tanggal) {
      nextErrors.tanggal = 'Tanggal pelaksanaan wajib diisi';
    }
    if (!namaPengawas.trim()) {
      nextErrors.nama_pengawas = 'Nama pengawas wajib diisi';
    }

    setErrors(nextErrors);
    setTouched({
      kelompok_lahan_id: true,
      lahan_id: true,
      tanggal: true,
      nama_pengawas: true,
    });
    return Object.keys(nextErrors).length === 0;
  }, [kelompokLahanId, lahanId, tanggal, namaPengawas]);

  const handleKelompokChange = useCallback((value: string) => {
    setKelompokLahanId(value);
    setLahanId('');
    setBlokId('');
    setErrors((prev) => ({
      ...prev,
      kelompok_lahan_id: undefined,
      lahan_id: undefined,
    }));
    if (value) {
      setTouched((prev) => ({ ...prev, kelompok_lahan_id: true }));
    }
  }, []);

  const handleLahanChange = useCallback((value: string) => {
    setLahanId(value);
    setBlokId('');
    setErrors((prev) => ({
      ...prev,
      lahan_id: undefined,
    }));
    if (value) {
      setTouched((prev) => ({ ...prev, lahan_id: true }));
    }
  }, []);

  const handleBlokChange = useCallback((value: string) => {
    setBlokId(value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const payload = {
      kelompok_lahan_id: kelompokLahanId,
      lahan_id: lahanId,
      blok_id: blokId || undefined,
      tanggal: new Date(tanggal).toISOString(),
      nama_pengawas: namaPengawas.trim(),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Berhasil', 'Dokumen BKM Rawat berhasil dibuat.');
        onSuccess();
      },
      onError: (err) => {
        Alert.alert(
          'Gagal',
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat menyimpan BKM Rawat.',
        );
      },
    });
  }, [
    validate,
    kelompokLahanId,
    lahanId,
    blokId,
    tanggal,
    namaPengawas,
    createMutation,
    onSuccess,
  ]);

  const isValid =
    !!kelompokLahanId && !!lahanId && !!tanggal && !!namaPengawas.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormSelect
          label="Kelompok Lahan"
          placeholder="Pilih kelompok lahan kebun"
          value={kelompokLahanId}
          options={kelompokLahanOptions}
          onSelect={handleKelompokChange}
          error={touched.kelompok_lahan_id ? errors.kelompok_lahan_id : undefined}
          searchable
        />

        <FormSelect
          label="Lahan (Field)"
          placeholder={
            kelompokLahanId
              ? isFetchingLahan
                ? 'Memuat lahan...'
                : 'Pilih lahan perkebunan'
              : 'Pilih kelompok lahan terlebih dahulu'
          }
          value={lahanId}
          options={lahanOptions}
          onSelect={handleLahanChange}
          error={touched.lahan_id ? errors.lahan_id : undefined}
          searchable
          disabled={!kelompokLahanId || isFetchingLahan}
        />

        <FormSelect
          label="Blok Kebun (Opsional)"
          placeholder={
            lahanId
              ? isFetchingBlok
                ? 'Memuat blok...'
                : 'Pilih blok (opsional)'
              : 'Pilih lahan terlebih dahulu'
          }
          value={blokId}
          options={blokOptions}
          onSelect={handleBlokChange}
          searchable
          disabled={!lahanId || isFetchingBlok}
        />

        <FormDateField
          label="Tanggal Pelaksanaan"
          value={tanggal}
          onChange={setTanggal}
          error={touched.tanggal ? errors.tanggal : undefined}
        />

        <FormField
          label="Nama Pengawas"
          placeholder="Masukkan nama pengawas lapangan"
          value={namaPengawas}
          onChangeText={(text) => {
            setNamaPengawas(text);
            setErrors((prev) => ({ ...prev, nama_pengawas: undefined }));
            setTouched((prev) => ({ ...prev, nama_pengawas: true }));
          }}
          error={touched.nama_pengawas ? errors.nama_pengawas : undefined}
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isValid || createMutation.isPending) && styles.submitBtnDisabled,
          ]}
          activeOpacity={0.7}
          onPress={handleSubmit}
          disabled={!isValid || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={BrandColors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Simpan BKM Rawat</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  submitBtn: {
    backgroundColor: BrandColors.button,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
