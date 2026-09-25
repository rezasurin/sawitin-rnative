import { FormField } from '@/components/form/FormField';
import { FormSelect } from '@/components/form/FormSelect';
import { Button } from '@/components/core/Button';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { ModulePermissionGuard } from '@/components/core/ModulePermissionGuard';
import { useCreateMaterial, useMaterialDetail, useUpdateMaterial } from '@/hooks/useMaterial';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { z } from 'zod';

const schema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib diisi'),
  satuan: z.string().min(1, 'Satuan wajib diisi'),
  harga_satuan: z.number().nonnegative().optional(),
  stok: z.number().nonnegative().optional(),
  bahan_aktif: z.string().max(255).optional(),
  konsentrasi: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type FormData = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Nonaktif', value: 'INACTIVE' },
];

function MaterialFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial();
  const material = useMaterialDetail(id ?? '');
  const editing = Boolean(id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!material.data) return;
    const value = material.data;
    reset({ kode: value.kode, nama: value.nama, kategori: value.kategori, satuan: value.satuan,
      harga_satuan: value.harga_satuan ?? undefined, bahan_aktif: value.bahan_aktif ?? undefined,
      konsentrasi: value.konsentrasi ?? undefined, status: value.status });
  }, [material.data, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const normalized = { ...data, bahan_aktif: data.bahan_aktif?.trim() || null, konsentrasi: data.konsentrasi?.trim() || null };
      if (id) {
        const { stok: _openingStock, ...update } = normalized;
        await updateMutation.mutateAsync({ id, data: update });
      } else await createMutation.mutateAsync(normalized);
      router.back();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan material. Silakan coba lagi.');
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={editing ? 'Ubah Material' : 'Tambah Material'}
        showBackButton
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="kode"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Kode"
              placeholder="Masukkan kode material"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.kode?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="nama"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Nama"
              placeholder="Masukkan nama material"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.nama?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="kategori"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Kategori"
              placeholder="Masukkan kategori"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.kategori?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="satuan"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Satuan"
              placeholder="Contoh: kg, liter, pcs"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.satuan?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="harga_satuan"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Harga Satuan"
              placeholder="Masukkan harga satuan"
              value={value?.toString() ?? ''}
              onChangeText={(text) => onChange(text ? Number(text) : undefined)}
              onBlur={onBlur}
              keyboardType="numeric"
              error={errors.harga_satuan?.message}
            />
          )}
        />

        <Controller control={control} name="bahan_aktif" render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Bahan aktif" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} error={errors.bahan_aktif?.message} />
        )} />
        <Controller control={control} name="konsentrasi" render={({ field: { onChange, onBlur, value } }) => (
          <FormField label="Konsentrasi" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} error={errors.konsentrasi?.message} />
        )} />

        {editing ? <><Text style={{ color: BrandColors.textSecondary }}>Stok saat ini: {material.data?.stok ?? '—'}. Penyesuaian stok dicatat melalui stok opname.</Text><Button title="Lihat stok opname" variant="secondary" onPress={() => router.push('/(admin)/stock-opname' as never)} /></> : <Controller
          control={control}
          name="stok"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Stok Awal"
              placeholder="Masukkan stok awal"
              value={value?.toString() ?? ''}
              onChangeText={(text) => onChange(text ? Number(text) : undefined)}
              onBlur={onBlur}
              keyboardType="numeric"
              error={errors.stok?.message}
            />
          )}
        />}

        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <FormSelect
              label="Status"
              value={value}
              options={STATUS_OPTIONS}
              onSelect={onChange}
              error={errors.status?.message}
            />
          )}
        />

        <Button
          title="Simpan"
          loading={createMutation.isPending || updateMutation.isPending}
          disabled={createMutation.isPending || updateMutation.isPending || (editing && !material.data)}
          onPress={handleSubmit(onSubmit as any)}
          style={styles.submitBtn}
        />
      </ScrollView>
    </View>
  );
}

export default function AddMaterialScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <ModulePermissionGuard module="mod_material" action={id ? 'update' : 'write'}><MaterialFormScreen /></ModulePermissionGuard>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  submitBtn: {
    marginTop: 8,
  },
});
