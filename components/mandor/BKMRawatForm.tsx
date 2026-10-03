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
import { useBkmRawatLookups } from '@/hooks/useBkmRawat';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { agronomyLabel, operationalLands } from '@/utils/plantation';
import { estateDate } from '@/utils/estateDate';

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
  const isOnline = useNetworkStore((state) => state.isOnline);
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const { data: rawatLookups } = useBkmRawatLookups();

  const [kelompokLahanId, setKelompokLahanId] = useState('');
  const [lahanId, setLahanId] = useState('');
  const [blokId, setBlokId] = useState('');
  // Estate day (WIB): the UTC date is still yesterday before 07:00.
  const [tanggal, setTanggal] = useState(estateDate());
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
      (kelompokLahanList?.data ?? rawatLookups?.groups ?? []).map((g) => ({
        label: g.nama,
        value: g.id,
      })),
    [kelompokLahanList, rawatLookups],
  );

  const blokOptions = useMemo(
    () =>
      (blokList?.data ?? rawatLookups?.blocks ?? []).filter((b) => b.kelompok_lahan_id === kelompokLahanId).map((b) => ({
        label: agronomyLabel(b),
        value: b.id,
      })),
    [blokList, rawatLookups, kelompokLahanId],
  );

  const lahanOptions = useMemo(
    () => [
      { label: 'Tanpa Lahan', value: '' },
      ...operationalLands(lahanList?.data ?? rawatLookups?.lands ?? [], blokId).map((l) => ({
        label: agronomyLabel(l),
        value: l.id,
      })),
    ],
    [lahanList, rawatLookups, blokId],
  );

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};

    if (!kelompokLahanId) {
      nextErrors.kelompok_lahan_id = 'Kebun wajib dipilih';
    }
    if (!blokId) {
      nextErrors.blok_id = 'Blok wajib dipilih';
    }
    if (lahanId && !lahanOptions.some((l) => l.value === lahanId)) {
      nextErrors.lahan_id = 'Pilih lahan yang terhubung ke blok ini';
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
  }, [kelompokLahanId, blokId, lahanId, lahanOptions, tanggal, namaPengawas]);

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

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const payload = {
      kelompok_lahan_id: kelompokLahanId,
      blok_id: blokId,
      lahan_id: lahanId || undefined,
      tanggal: new Date(tanggal).toISOString(),
      nama_pengawas: namaPengawas.trim(),
    };

    if (!isOnline) {
      try {
        const queued = await addToQueue({
          module: 'bkm_rawat',
          action: 'CREATE',
          endpoint: '/bkmRawat',
          payload: {
            header: payload,
            details: [],
            submit: false,
            display: {
              kelompok_lahan_nama: kelompokLahanOptions.find((option) => option.value === kelompokLahanId)?.label,
              blok_nama: blokOptions.find((option) => option.value === blokId)?.label,
              lahan_nama: lahanOptions.find((option) => option.value === lahanId)?.label,
            },
          },
        });
        Alert.alert('Tersimpan offline', 'Tambahkan pekerjaan lalu kirim dokumen. Data akan disinkronkan saat online.');
        onSuccess(`local:${queued.id}`);
      } catch (error) {
        Alert.alert('Gagal Menyimpan', error instanceof Error ? error.message : 'Antrian offline gagal disimpan.');
      }
      return;
    }

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
    isOnline,
    addToQueue,
    kelompokLahanOptions,
    blokOptions,
    lahanOptions,
    onSuccess,
  ]);

  const isValid =
    !!kelompokLahanId && !!blokId && !!tanggal && !!namaPengawas.trim()
    && (!lahanId || lahanOptions.some((l) => l.value === lahanId));

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
          label="Kebun"
          placeholder="Pilih kebun"
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
              : 'Pilih kebun terlebih dahulu'
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
