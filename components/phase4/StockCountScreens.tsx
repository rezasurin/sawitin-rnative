import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/home';
import { Button } from '@/components/core/Button';
import { AuditTrail } from './AuditTrail';
import { BrandColors } from '@/constants/Colors';
import { stockOpnameApi } from '@/services/stock-opname.service';

const number = (value: number | string) => Number(value).toLocaleString('id-ID', { maximumFractionDigits: 3 });
export function StockCountList() {
  const router = useRouter();
  const group = useSegments()[0] === '(asisten)' ? '(asisten)' : '(admin)';
  const list = useQuery({ queryKey: ['stockOpname', 'list'], queryFn: () => stockOpnameApi.getAll({ limit: 50, sort: 'tanggal:desc' }) });
  return <View style={styles.root}><PageHeader title="Stok Opname" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.muted}>Hasil hitung fisik dapat dilihat saat terhubung.</Text>
      {list.isLoading && <ActivityIndicator />}
      {list.isError && <Button title="Muat ulang" onPress={() => void list.refetch()} />}
      {(list.data?.data ?? []).map((item) => <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/${group}/stock-opname/${item.id}` as never)}>
        <Text style={styles.title}>{new Date(item.tanggal).toLocaleDateString('id-ID')}</Text>
        <Text>{item.status} · {item.details?.length ?? 0} material</Text>
      </Pressable>)}
      {!list.isLoading && !list.data?.data.length && <Text>Belum ada stok opname.</Text>}
    </ScrollView>
  </View>;
}

export function StockCountDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery({ queryKey: ['stockOpname', id], queryFn: () => stockOpnameApi.getById(id) });
  const row = detail.data;
  return <View style={styles.root}><PageHeader title="Detail Stok Opname" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      {detail.isLoading && <ActivityIndicator />}
      {detail.isError && <Button title="Muat ulang" onPress={() => void detail.refetch()} />}
      {row && <>
        <Text style={styles.title}>{new Date(row.tanggal).toLocaleDateString('id-ID')} · {row.status}</Text>
        {!!row.catatan && <Text>{row.catatan}</Text>}
        <Text style={styles.muted}>Penyesuaian saat persetujuan memakai selisih hitung, bukan menetapkan stok ke angka fisik.</Text>
        {row.details.map((line) => { const variance = Number(line.stok_fisik) - Number(line.stok_sistem); return <View key={line.id} style={styles.card}>
          <Text style={styles.title}>{line.material?.nama ?? line.material_id}</Text>
          <Text>Stok sistem saat dihitung: {number(line.stok_sistem)} {line.material?.satuan ?? ''}</Text>
          <Text>Stok fisik: {number(line.stok_fisik)} {line.material?.satuan ?? ''}</Text>
          <Text style={{ color: variance < 0 ? BrandColors.error : BrandColors.textPrimary }}>Penyesuaian: {variance > 0 ? '+' : ''}{number(variance)} {line.material?.satuan ?? ''}</Text>
          {!!line.catatan && <Text>{line.catatan}</Text>}
        </View>; })}
        <AuditTrail path={`/stockOpname/${id}/history`} />
      </>}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: BrandColors.background }, content: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 12, backgroundColor: BrandColors.cardBg, gap: 5 }, title: { fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary }, muted: { color: BrandColors.textSecondary } });
