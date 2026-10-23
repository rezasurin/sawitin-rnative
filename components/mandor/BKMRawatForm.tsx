import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useAuthStore } from '@/stores/useAuthStore';
import { agronomyLabel, operationalLands } from '@/utils/plantation';
import { estateDate } from '@/utils/estateDate';
import { isRetryable } from '@/services/sync-errors';

interface Props {
  onSuccess: (id: string) => void;
}

/** A supervisor outside the app (contractor, ketua kelompok): sent as a typed name only. */
const PENGAWAS_LUAR = 'luar';

interface FormErrors {
  kelompok_lahan_id?: string;
  blok_id?: string;
  lahan_id?: string;
  tanggal?: string;
  pengawas_id?: string;
  nama_pengawas?: string;
}

export function BKMRawatForm({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateBkmRawat();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const { data: rawatLookups } = useBkmRawatLookups();
  const user = useAuthStore((state) => state.user);

  const [kelompokLahanId, setKelompokLahanId] = useState('');
  const [lahanId, setLahanId] = useState('');
  const [blokId, setBlokId] = useState('');
  // Estate day (WIB): the UTC date is still yesterday before 07:00.
  const [tanggal, setTanggal] = useState(estateDate());
  /** null until picked: a mandor usually files their own BKM, so it then defaults to them. */
  const [pickedPengawas, setPickedPengawas] = useState<string | null>(null);
  const [namaPengawas, setNamaPengawas] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const requestKey = useRef(`rawat_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

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

  const pengawasOptions = useMemo(() => {
    // Lookups cached before the list was sent offer the signed-in user only.
    const users = rawatLookups?.pengawas
      ?? (user ? [{ id: user.id, nama: user.member?.nama ?? user.username }] : []);
    return [
      ...users.map((u) => ({ label: u.nama, value: u.id })),
      { label: 'Lainnya (di luar sistem)', value: PENGAWAS_LUAR },
    ];
  }, [rawatLookups, user]);
  const pengawasId = pickedPengawas
    ?? (pengawasOptions.some((o) => o.value === user?.id) ? user!.id : '');
  const isLuar = pengawasId === PENGAWAS_LUAR;

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
    if (!pengawasId) {
      nextErrors.pengawas_id = 'Pengawas wajib dipilih';
    }
    if (isLuar && !namaPengawas.trim()) {
      nextErrors.nama_pengawas = 'Nama pengawas wajib diisi';
    }

    setErrors(nextErrors);
    setTouched({
      kelompok_lahan_id: true,
      blok_id: true,
      tanggal: true,
      pengawas_id: true,
      nama_pengawas: true,
    });
    return Object.keys(nextErrors).length === 0;
  }, [kelompokLahanId, blokId, lahanId, lahanOptions, tanggal, pengawasId, isLuar, namaPengawas]);

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
    if (savingRef.current || !validate()) return;

    const payload = {
      // Sent online too: if the answer is lost and the save falls back to the
      // queue, the replay carries the same key and the server keeps one document.
      client_request_id: requestKey.current,
      kelompok_lahan_id: kelompokLahanId,
      blok_id: blokId,
      lahan_id: lahanId || undefined,
      tanggal: new Date(tanggal).toISOString(),
      // The name travels with a picked user too, so the queued item reads right offline.
      ...(isLuar
        ? { nama_pengawas: namaPengawas.trim() }
        : {
            pengawas_id: pengawasId,
            nama_pengawas: pengawasOptions.find((o) => o.value === pengawasId)?.label ?? '',
          }),
    };

    const queueIt = async () => {
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
    };

    savingRef.current = true;
    setSaving(true);
    try {
      if (!isOnline) {
        await queueIt();
        return;
      }
      try {
        const created = await createMutation.mutateAsync(payload);
        Alert.alert('Berhasil', 'Dokumen BKM Rawat berhasil dibuat.');
        onSuccess(created.id);
      } catch (err) {
        if (isRetryable(err)) {
          await queueIt();
          return;
        }
        Alert.alert('Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan BKM Rawat.');
      }
    } catch (error) {
      Alert.alert('Gagal Menyimpan', error instanceof Error ? error.message : 'Antrian offline gagal disimpan.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    validate,
    kelompokLahanId,
    lahanId,
    blokId,
    tanggal,
    pengawasId,
    isLuar,
    pengawasOptions,
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
    !!kelompokLahanId && !!blokId && !!tanggal && !!pengawasId && (!isLuar || !!namaPengawas.trim())
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

        <FormSelect
          label="Pengawas"
          placeholder="Pilih pengawas"
          value={pengawasId}
          options={pengawasOptions}
          onSelect={(value) => {
            setPickedPengawas(value);
            setErrors((prev) => ({ ...prev, pengawas_id: undefined, nama_pengawas: undefined }));
          }}
          error={touched.pengawas_id ? errors.pengawas_id : undefined}
          searchable
        />

        {isLuar && (
          <FormField
            label="Nama Pengawas"
            placeholder="Mis. mandor kontraktor atau ketua kelompok"
            value={namaPengawas}
            onChangeText={(text) => {
              setNamaPengawas(text);
              setErrors((prev) => ({ ...prev, nama_pengawas: undefined }));
              setTouched((prev) => ({ ...prev, nama_pengawas: true }));
            }}
            error={touched.nama_pengawas ? errors.nama_pengawas : undefined}
          />
        )}

        <Button
          title="Simpan BKM Rawat"
          onPress={handleSubmit}
          loading={saving}
          disabled={!isValid || saving}
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
