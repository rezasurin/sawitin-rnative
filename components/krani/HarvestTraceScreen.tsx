import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/home';
import { Button } from '@/components/core/Button';
import { AuthenticatedImage } from '@/components/core/AuthenticatedImage';
import { BrandColors } from '@/constants/Colors';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { kraniTimbangApi } from '@/services/krani-timbang.service';
import type { HarvestTrace, TraceGrade } from '@/types/harvest-trace';
import { nettoSumberLabel, traceLineRows } from '@/utils/harvest-trace';

const labels: Record<string, string> = {
  checker_grading_breakdown_mismatch: 'Grading Checker tidak cocok',
  panen_grading_breakdown_mismatch: 'Grading Panen tidak cocok',
  pks_netto_disagrees_with_sale: 'Netto PKS berbeda dari penjualan',
  restan_exceeds_weighed: 'Restan melebihi jumlah ditimbang',
  no_pks_ticket: 'Tiket PKS belum ada',
  vehicle_not_registered: 'Kendaraan belum terdaftar',
  no_internal_weighing: 'Tidak ditimbang di jembatan timbang sendiri',
};

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
    <Text style={{ flex: 1 }}>{label}</Text><Text style={{ fontWeight: '600', textAlign: 'right' }}>{value ?? '—'}</Text>
  </View>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ padding: 16, borderRadius: 10, backgroundColor: BrandColors.cardBg, gap: 6 }}>
    <Text style={{ fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary }}>{title}</Text>{children}
  </View>;
}
function Grade({ title, grade }: { title: string; grade: TraceGrade }) {
  return <View style={{ gap: 3 }}><Text style={{ fontWeight: '600' }}>{title}</Text>
    <Row label="Janjang dicatat" value={grade.jumlah_janjang} />
    <Row label="Jumlah kolom grading" value={grade.breakdown_total} />
    <Text style={{ color: grade.reconciles ? BrandColors.success : BrandColors.error }}>
      {grade.reconciles ? 'Grading cocok' : 'Periksa rincian grading'}</Text>
    {(['janjang_normal', 'buah_mentah', 'over_ripe', 'tangkai_panjang', 'buah_abnormal', 'janjang_kosong'] as const)
      .map((key) => <Row key={key} label={key.replaceAll('_', ' ')} value={grade[key]} />)}
  </View>;
}

export default function HarvestTraceScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const online = useNetworkStore((state) => state.isOnline);
  const trace = useQuery({ queryKey: ['kraniTimbang', tripId, 'trace'],
    queryFn: () => kraniTimbangApi.trace(tripId), enabled: !!tripId && online,
    retry: false, refetchOnMount: 'always' });
  const data: HarvestTrace | undefined = trace.data;
  return <View style={{ flex: 1, backgroundColor: BrandColors.background }}>
    <PageHeader title="Jejak panen" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
      {!online && <Text>Jejak panen memerlukan data server terkini. Sambungkan perangkat lalu buka ulang.</Text>}
      {trace.isLoading && online && <ActivityIndicator />}
      {trace.isError && online && <View style={{ gap: 8 }}>
        <Text>{(trace.error as { status?: number })?.status === 404 ? 'Trip tidak ditemukan.' :
          (trace.error as { status?: number })?.status === 403 ? 'Akses ditolak.' : 'Jejak panen tidak tersedia.'}</Text>
        <Button title="Coba lagi" onPress={() => void trace.refetch()} />
      </View>}
      {data && online && <>
        <Section title="Temuan">
          {data.flags.length === 0 ? <Text style={{ color: BrandColors.success }}>Tidak ada temuan.</Text> :
            data.flags.map((flag, index) => <View key={`${flag.code}:${index}`} style={{ paddingVertical: 5 }}>
              <Text style={{ fontWeight: '700', color: BrandColors.error }}>{labels[flag.code] ?? flag.code}</Text>
              <Text>{flag.detail}</Text></View>)}
        </Section>
        <Section title="Sumber: baris SPB dan Panen">
          <Row label="SPB" value={data.trip.nomor_spb} />
          <Row label="Janjang Panen" value={data.quantities.janjang.panen} />
          <Row label="Janjang di baris SPB" value={data.quantities.janjang.checker_total} />
          {data.lines ? traceLineRows(data).map((line) => <View key={line.key} style={{ paddingVertical: 7 }}>
            <Text style={{ fontWeight: '600' }}>{line.tempat}</Text>
            <Text>{line.sumber}</Text>
            <Text>{line.janjang} janjang · brondol {line.brondol} kg</Text>
          </View>) : data.sources.map((source) => <View key={source.bkm_checker.id} style={{ paddingVertical: 7 }}>
            <Text>{source.bkm_checker.blok?.nama ?? 'Blok —'} · {source.bkm_checker.lahan?.nama ?? 'Lahan —'} · {source.bkm_checker.tph?.nama ?? 'TPH —'}</Text>
            <Text>Checker {source.bkm_checker.id.slice(0, 8)} · {source.bkm_checker.status} · Disetujui: {source.bkm_checker.approved_by ?? '—'}</Text>
            {!!source.bkm_panen && <Text>Panen {source.bkm_panen.id.slice(0, 8)}</Text>}
          </View>)}
          <Text>Pekerja: {data.workers.map((worker) => worker.nama ?? worker.id).join(', ') || '—'}</Text>
        </Section>
        <Section title="Grading dan muatan">
          <Grade title="Checker" grade={data.quantities.grading.checker} />
          <Grade title="Panen" grade={data.quantities.grading.panen} />
          <Row label="Janjang dimuat" value={data.quantities.janjang.checker_loaded} />
          <Row label="Janjang restan di sumber" value={data.quantities.janjang.checker_restan} />
          <Row label="Restan tertinggal" value={data.quantities.janjang.restan_left_at_source} />
          <Row label="Brondol Checker (kg)" value={data.quantities.brondol.checker} />
        </Section>
        <Section title="Truk dan timbang internal">
          <Row label="Dokumen" value={data.trip.nomor_dokumen} />
          <Row label="Kendaraan" value={data.trip.kendaraan?.nomor_kendaraan ?? data.trip.nomor_kendaraan} />
          <Row label="Sopir" value={data.trip.supir?.nama ?? data.trip.nama_supir} />
          <Row label="Tujuan" value={data.trip.tujuan_kirim} />
          <Row label="Status" value={data.trip.status} />
          <Row label="Janjang ditimbang" value={data.quantities.janjang.weighed} />
          <Text>Termasuk restan dari hari sebelumnya: {data.quantities.janjang.restan_carried_from_earlier} janjang.</Text>
          <Row label="Brondol ditimbang (kg)" value={data.quantities.brondol.weighed} />
          <Row label="Bruto internal (kg)" value={data.quantities.berat_kg.internal_bruto} />
          <Row label="Tara internal (kg)" value={data.quantities.berat_kg.internal_tara} />
          <Row label="Netto internal (kg)" value={data.quantities.berat_kg.internal_netto} />
        </Section>
        <Section title="Tiket PKS dan penjualan">
          <Row label="Nomor tiket" value={data.pks_ticket?.nomor_tiket} />
          <Row label="Bruto PKS (kg)" value={data.quantities.berat_kg.pks_bruto} />
          <Row label="Tara PKS (kg)" value={data.quantities.berat_kg.pks_tara} />
          <Row label="Netto PKS (kg)" value={data.quantities.berat_kg.pks_netto} />
          <Row label="Netto acuan (kg)" value={data.quantities.berat_kg.netto_acuan} />
          <Row label="Sumber netto acuan" value={nettoSumberLabel(data.quantities.berat_kg.netto_sumber)} />
          <Row label="Susut (kg)" value={data.quantities.berat_kg.susut} />
          <Row label="Netto penjualan (kg)" value={data.quantities.berat_kg.sale_netto_pabrik} />
        </Section>
        <Section title="Bukti">
          {data.evidence.length === 0 ? <Text>Belum ada foto atau GPS.</Text> :
            data.evidence.map((item) => <View key={`${item.source}:${item.id}`} style={{ gap: 4 }}>
              <Text>{item.source} · {item.tph?.nama ?? 'PKS'}</Text>
              {!!item.foto_url && <AuthenticatedImage uri={item.foto_url} style={{ width: 180, height: 140 }} />}
              {item.lat != null && item.lng != null && <Text>GPS: {item.lat}, {item.lng}</Text>}
            </View>)}
        </Section>
        <Section title="Riwayat dan persetujuan">
          <Row label="Trip disetujui oleh" value={data.trip.approved_by} />
          {data.history.map((event) => <Text key={event.id}>{new Date(event.created_at).toLocaleString('id-ID')} · {event.document_type} · {event.action} · {event.created_by}</Text>)}
        </Section>
      </>}
    </ScrollView>
  </View>;
}
