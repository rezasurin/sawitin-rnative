import { FormField } from '@/components/form/FormField';
import { FormSelect } from '@/components/form/FormSelect';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useCreateMaterial } from '@/hooks/useMaterial';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
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

  const BackButton = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <FontAwesome name="arrow-left" size={20} color={BrandColors.white} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tambah Material"
        showMenuButton={false}
        actionBtn={BackButton}
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

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit as any)}
          disabled={mutation.isPending}
          activeOpacity={0.8}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={BrandColors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Simpan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  submitBtn: {
    backgroundColor: BrandColors.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
