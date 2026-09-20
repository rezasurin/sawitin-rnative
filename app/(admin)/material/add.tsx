import { FormField } from '@/components/form/FormField';
import { FormSelect } from '@/components/form/FormSelect';
import { Button } from '@/components/core/Button';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useCreateMaterial } from '@/hooks/useMaterial';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { z } from 'zod';

const schema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib diisi'),
  satuan: z.string().min(1, 'Satuan wajib diisi'),
  harga_satuan: z.number().optional(),
  stok: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type FormData = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Nonaktif', value: 'INACTIVE' },
];

export default function AddMaterialScreen() {
  const router = useRouter();
  const mutation = useCreateMaterial();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      status: 'ACTIVE',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data);
      router.back();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan material. Silakan coba lagi.');
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tambah Material"
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

        <Controller
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
        />

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
          loading={mutation.isPending}
          disabled={mutation.isPending}
          onPress={handleSubmit(onSubmit as any)}
          style={styles.submitBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  submitBtn: {
    marginTop: 8,
  },
});
