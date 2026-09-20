import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/core/Button';
import { FormSelect, FormField, FormDateField } from '@/components/form';
import {
  useLahanList,
  useBlokList,
  useKelompokLahanList,
} from '@/hooks';
import { useCreateBkmRawat } from '@/hooks/useBkmRawat';

interface Props {
  onSuccess: (id: string) => void;
}

interface FormErrors {
  kelompok_lahan_id?: string;
  blok_id?: string;
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
  const { data: blokList, isFetching: isFetchingBlok } = useBlokList({
    limit: 200,
    kelompok_lahan_id: kelompokLahanId || undefined,
  });
  const { data: lahanList, isFetching: isFetchingLahan } = useLahanList({
    limit: 200,
    blok_id: blokId || undefined,
  });

  const kelompokLahanOptions = useMemo(
    () =>
      (kelompokLahanList?.data ?? []).map((g) => ({
        label: g.nama,
        value: g.id,
      })),
    [kelompokLahanList],
  );

  const blokOptions = useMemo(
    () =>
      (blokList?.data ?? []).map((b) => ({
        label: b.nama,
        value: b.id,
      })),
    [blokList],
  );

  const lahanOptions = useMemo(
    () => [
      { label: 'Tanpa Lahan', value: '' },
      ...(lahanList?.data ?? []).map((l) => ({
        label: l.nama,
        value: l.id,
      })),
    ],
    [lahanList],
  );

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};

    if (!kelompokLahanId) {
      nextErrors.kelompok_lahan_id = 'Kelompok lahan wajib dipilih';
    }
    if (!blokId) {
      nextErrors.blok_id = 'Blok wajib dipilih';
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
      blok_id: true,
      tanggal: true,
      nama_pengawas: true,
    });
    return Object.keys(nextErrors).length === 0;
  }, [kelompokLahanId, blokId, tanggal, namaPengawas]);

  const handleKelompokChange = useCallback((value: string) => {
    setKelompokLahanId(value);
    setBlokId('');
    setLahanId('');
    setErrors((prev) => ({
      ...prev,
      kelompok_lahan_id: undefined,
      blok_id: undefined,
      lahan_id: undefined,
    }));
    if (value) {
      setTouched((prev) => ({ ...prev, kelompok_lahan_id: true }));
    }
  }, []);

  const handleBlokChange = useCallback((value: string) => {
    setBlokId(value);
    setLahanId('');
    setErrors((prev) => ({
      ...prev,
      blok_id: undefined,
      lahan_id: undefined,
    }));
    if (value) {
      setTouched((prev) => ({ ...prev, blok_id: true }));
    }
  }, []);

  const handleLahanChange = useCallback((value: string) => {
    setLahanId(value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const payload = {
      kelompok_lahan_id: kelompokLahanId,
      blok_id: blokId,
      lahan_id: lahanId || undefined,
      tanggal: new Date(tanggal).toISOString(),
      nama_pengawas: namaPengawas.trim(),
    };

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        Alert.alert('Berhasil', 'Dokumen BKM Rawat berhasil dibuat.');
        onSuccess(created.id);
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
    !!kelompokLahanId && !!blokId && !!tanggal && !!namaPengawas.trim();

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
          label="Blok"
          placeholder={
            kelompokLahanId
              ? isFetchingBlok
                ? 'Memuat blok...'
                : 'Pilih blok kebun'
              : 'Pilih kelompok lahan terlebih dahulu'
          }
          value={blokId}
          options={blokOptions}
          onSelect={handleBlokChange}
          error={touched.blok_id ? errors.blok_id : undefined}
          searchable
          disabled={!kelompokLahanId || isFetchingBlok}
        />

        <FormSelect
          label="Lahan (Opsional)"
          placeholder={
            blokId
              ? isFetchingLahan
                ? 'Memuat lahan...'
                : 'Pilih lahan (opsional)'
              : 'Pilih blok terlebih dahulu'
          }
          value={lahanId}
          options={lahanOptions}
          onSelect={handleLahanChange}
          error={touched.lahan_id ? errors.lahan_id : undefined}
          searchable
          disabled={!blokId || isFetchingLahan}
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

        <Button
          title="Simpan BKM Rawat"
          onPress={handleSubmit}
          loading={createMutation.isPending}
          disabled={!isValid}
          variant="primary"
          style={styles.submitBtn}
        />
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
    marginTop: 24,
  },
});
