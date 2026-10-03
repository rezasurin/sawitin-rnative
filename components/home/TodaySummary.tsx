import { estateDate } from '@/utils/estateDate';
import { approvalLabel, approvalTarget, displayMeasure, generatedLocalTime } from '@/utils/field-summary';
import { BrandColors } from '@/constants/Colors';
import { useKraniTimbangList } from '@/hooks/useKraniTimbang';
import type { useFieldSummary } from '@/hooks/useFieldSummary';
import { useAuthStore } from '@/stores/useAuthStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { RelativePathString, useFocusEffect, useRouter, useSegments } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface SummaryStat {
  id: string;
  label: string;
  value: string;
  route?: string;
}

type FieldSummaryState = ReturnType<typeof useFieldSummary>;

export function TodaySummary({ fieldSummary }: { fieldSummary: FieldSummaryState }) {
  const group = useSegments()[0] ?? '';
  if (group === '(mandor)' || group === '(asisten)') {
    return <FieldSummaryCard group={group} summary={fieldSummary} />;
  }
  if (group === '(krani)') return <KraniTodaySummary />;
  return null;
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <View style={styles.card}>
    <View style={styles.headerRow}>
      <FontAwesome name={icon as any} size={16} color={BrandColors.primary} />
      <Text style={styles.title}>{title}</Text>
    </View>
    {children}
  </View>;
}

function StatRow({ stats }: { stats: SummaryStat[] }) {
  const router = useRouter();
  return <View style={styles.statsRow}>{stats.map((stat) => <Pressable
    key={stat.id} style={styles.statItem} disabled={!stat.route}
    onPress={() => stat.route && router.push(stat.route as RelativePathString)}>
    <Text style={styles.statValue}>{stat.value}</Text>
    <Text style={styles.statLabel}>{stat.label}</Text>
  </Pressable>)}</View>;
}

function FieldSummaryCard({ group, summary }: { group: string; summary: FieldSummaryState }) {
  const router = useRouter();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  if (!summary.available) return null;
  const data = summary.data;
  if (!data) return <SectionCard title="Ringkasan Lapangan" icon="bar-chart">
    {summary.loading ? <ActivityIndicator color={BrandColors.primary} /> : <>
      <Text style={styles.muted}>{summary.error ?? 'Belum ada ringkasan tersimpan. Hubungkan perangkat untuk memuat data.'}</Text>
      {!summary.offline && <Pressable accessibilityRole="button" onPress={() => void summary.refresh()}><Text style={styles.link}>Coba lagi</Text></Pressable>}
    </>}
  </SectionCard>;

  const time = generatedLocalTime(data.generated_at);
  const pendingTotal = data.persetujuan.reduce((total, row) => total + row.menunggu, 0);
  const staleText = !summary.stale ? `Diperbarui ${time}` :
    summary.offline ? `Data per ${time}, offline` :
    summary.error ? `Data per ${time}, belum diperbarui` : `Data per ${time}, memuat pembaruan`;
  return <SectionCard title="Ringkasan Lapangan" icon="bar-chart">
    <Text style={styles.date}>{data.tanggal} · {staleText}{summary.refreshing ? ' · memperbarui…' : ''}</Text>
    <View style={styles.tile}>
      <Text style={styles.tileTitle}>Panen hari ini</Text>
      <Text style={styles.big}>{displayMeasure(data.produksi.approved.janjang)} janjang disetujui</Text>
      <Text style={styles.muted}>{displayMeasure(data.produksi.approved.kg_estimasi)} kg janjang (estimasi)</Text>
      <Text style={styles.muted}>{displayMeasure(data.produksi.approved.kg_estimasi_total)} kg total (estimasi, termasuk brondol)</Text>
      <Text style={styles.pending}>{displayMeasure(data.produksi.submitted.janjang)} janjang · {displayMeasure(data.produksi.submitted.kg_estimasi)} kg janjang (estimasi) menunggu persetujuan</Text>
    </View>
    <View style={styles.tile}>
      <Text style={styles.tileTitle}>Restan terbuka</Text>
      <Text style={styles.big}>{displayMeasure(data.restan.approved.janjang)} janjang disetujui</Text>
      <Text style={styles.muted}>{displayMeasure(data.restan.approved.baris)} baris TPH · tertua {displayMeasure(data.restan.approved.umur_tertua_hari)} hari</Text>
      <Text style={styles.pending}>{displayMeasure(data.restan.submitted.janjang)} janjang · {displayMeasure(data.restan.submitted.baris)} baris menunggu persetujuan</Text>
    </View>
    <View style={styles.tile}>
      <Text style={styles.tileTitle}>Menunggu persetujuan · {displayMeasure(pendingTotal)}</Text>
      {data.persetujuan.length === 0 ? <Text style={styles.muted}>Tidak ada keputusan yang menunggu Anda.</Text> :
        data.persetujuan.map((row) => {
          const target = approvalTarget(row.dokumen, group, (module) => hasPermission(module, 'read'));
          return <Pressable key={row.dokumen} disabled={!target} accessibilityRole={target ? 'button' : undefined}
            onPress={() => target && router.push({ pathname: target as RelativePathString, params: { status: 'SUBMITTED' } })}
            style={styles.approvalRow}>
            <Text style={styles.approvalName}>{approvalLabel(row.dokumen)}{target ? ' ›' : ''}</Text>
            <Text style={styles.muted}>{displayMeasure(row.menunggu)} menunggu · tertua {displayMeasure(row.tertua_hari)} hari</Text>
            {row.dikembalikan > 0 && <Text style={styles.muted}>{displayMeasure(row.dikembalikan)} dikembalikan ke pembuat</Text>}
            {!!row.terlambat && <Text style={styles.muted}>{displayMeasure(row.terlambat)} melewati batas persetujuan</Text>}
          </Pressable>;
        })}
      <Text style={styles.note}>Persetujuan mencakup seluruh organisasi.</Text>
    </View>
    <Text style={styles.footer}>{data.definition.id} v{data.definition.version} · {data.timezone} · BJR organisasi {displayMeasure(data.bjr_used)}</Text>
  </SectionCard>;
}

function KraniTodaySummary() {
  const { data, isLoading, isError, refetch } = useKraniTimbangList({ limit: 100 });
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  // `tanggal` is a DateTime, so compare estate (WIB) calendar days, not raw strings.
  const todays = data?.data?.filter((row) => estateDate(new Date(row.tanggal)) === estateDate()) ?? [];
  const totalNetto = todays.reduce((total, row) => total + (Number(row.netto) || 0), 0);
  return <SectionCard title="Timbangan Hari Ini" icon="truck">
    {isLoading ? <ActivityIndicator color={BrandColors.primary} /> : <StatRow stats={[
      { id: 'count', label: 'Jumlah Timbangan', value: isError || !data ? 'Tidak tersedia' : String(todays.length), route: '/(krani)/timbangan' },
      { id: 'netto', label: 'Total Netto', value: isError || !data ? 'Tidak tersedia' : `${(totalNetto / 1000).toFixed(1)} t`, route: '/(krani)/timbangan' },
    ]} />}
  </SectionCard>;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, backgroundColor: BrandColors.cardBg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '700', color: BrandColors.textPrimary },
  date: { fontSize: 12, color: BrandColors.textSecondary, marginBottom: 6 },
  tile: { backgroundColor: BrandColors.white, borderWidth: 1, borderColor: BrandColors.inputBorder, borderRadius: 10, padding: 12, marginTop: 10 },
  tileTitle: { fontSize: 13, fontWeight: '700', color: BrandColors.textPrimary, marginBottom: 6 },
  big: { fontSize: 18, fontWeight: '800', color: BrandColors.primary },
  muted: { fontSize: 12, color: BrandColors.textSecondary, marginTop: 4 },
  pending: { fontSize: 12, color: BrandColors.textSecondary, marginTop: 8 },
  approvalRow: { paddingVertical: 7, borderTopWidth: 1, borderTopColor: BrandColors.inputBorder },
  approvalName: { fontSize: 13, fontWeight: '600', color: BrandColors.textPrimary },
  note: { fontSize: 11, color: BrandColors.textMuted, marginTop: 8 },
  footer: { fontSize: 11, color: BrandColors.textMuted, marginTop: 12 },
  link: { color: BrandColors.primary, fontWeight: '700', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, backgroundColor: BrandColors.white, borderRadius: 10, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: BrandColors.primary },
  statLabel: { fontSize: 12, color: BrandColors.textSecondary, marginTop: 2, textAlign: 'center' },
});
