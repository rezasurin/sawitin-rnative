import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/core/Badge';
import { BrandColors } from '@/constants/Colors';
import { blockingOf, closeStatusLabel } from '@/utils/close';
import type { CloseTph, TutupHarianPreview } from '@/types/tutup-harian';

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: BrandColors.textMuted, bg: '#F0F0F0' },
  SUBMITTED: { color: '#2196F3', bg: '#E3F2FD' },
  APPROVED: { color: BrandColors.success, bg: '#E8F5E9' },
  REVISION_REQUESTED: { color: BrandColors.error, bg: '#FFEBEE' },
};

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.title}>{title}</Text>{children}</View>;
}
const Line = ({ left, right }: { left: string; right?: string }) => (
  <View style={styles.line}><Text style={styles.left}>{left}</Text>{right !== undefined && <Text style={styles.right}>{right}</Text>}</View>
);
const kg = (value: number | null | undefined) => (value == null ? '—' : `${value} kg`);

/** Where the close stands: Draft, Diajukan, Disetujui or Ditolak (with why), and whether it is late. */
export function CloseStatus({ preview }: { preview: TutupHarianPreview }) {
  const record = preview.tutup_harian;
  const status = record?.status ?? 'DRAFT';
  const tone = STATUS_COLOR[status] ?? STATUS_COLOR.DRAFT;
  return <Section title="Status tutup harian">
    <View style={styles.badges}>
      <Badge label={closeStatusLabel(status)} color={tone.color} bg={tone.bg} />
      {preview.terlambat && <Badge label="Terlambat" color={BrandColors.error} bg="#FFEBEE" />}
    </View>
    <Text style={styles.muted}>Batas persetujuan: {new Date(preview.batas_approval_at).toLocaleString('id-ID')}</Text>
    {record?.submitted_by && <Text style={styles.muted}>Diajukan oleh {record.submitted_by}</Text>}
    {status === 'REVISION_REQUESTED' && <Text style={styles.reject}>Ditolak{record?.rejection_note ? `: ${record.rejection_note}` : '.'} Perbaiki lalu ajukan ulang.</Text>}
    {record?.catatan ? <Text style={styles.muted}>Catatan Mandor: {record.catatan}</Text> : null}
  </Section>;
}

export function ClosePreview({ preview, tphInput, notes }: {
  preview: TutupHarianPreview;
  /** Mandor: an editor for the restan count under each TPH. Omitted, the count is read-only. */
  tphInput?: (row: CloseTph) => React.ReactNode;
  /** Mandor: note fields in place of the read-only exception list. */
  notes?: React.ReactNode;
}) {
  const blocking = blockingOf(preview);
  const noted = preview.exceptions.filter((item) => item.severity === 'NOTE');
  return <View style={styles.stack}>
    <CloseStatus preview={preview} />
    {blocking.length > 0 && <Section title={`Menghalangi penutupan (${blocking.length})`}>
      {blocking.map((item) => <Text key={item.key} style={styles.reject}>{item.message}</Text>)}
    </Section>}
    <Section title="Keseimbangan per TPH">
      {preview.tph.length === 0 && <Text style={styles.muted}>Tidak ada Panen di hari ini.</Text>}
      {preview.tph.map((row) => <View key={row.tph_id} style={styles.block}>
        <Text style={styles.bold}>{row.nama}</Text>
        <Line left="Panen" right={`${row.panen_janjang} jjg · ${kg(row.panen_brondol_kg)}`} />
        <Line left="Dimuat (Langsung)" right={`${row.langsung_janjang} jjg · ${kg(row.langsung_brondol_kg)}`} />
        {row.titip_janjang > 0 && <Line left="Titip (restan hari lain, tidak dihitung)" right={`${row.titip_janjang} jjg`} />}
        {tphInput ? tphInput(row) : <Line left="Restan" right={`${row.restan_hitung_janjang ?? row.restan_usulan_janjang} jjg · ${kg(row.restan_hitung_brondol_kg ?? row.restan_usulan_brondol_kg)}`} />}
      </View>)}
    </Section>
    <Section title={`Trip (${preview.trips.length})`}>
      {preview.trips.length === 0 && <Text style={styles.muted}>Tidak ada trip berangkat di hari ini.</Text>}
      {preview.trips.map((trip) => <View key={trip.id} style={styles.block}>
        <Text style={styles.bold}>{trip.nomor_spb ?? 'Dokumen lama'} · {trip.nomor_truk ?? '—'}</Text>
        <Line left={`${trip.jumlah_janjang} jjg · ${kg(trip.brondol_kg)}`} right={trip.status} />
        <Text style={trip.ditimbang ? styles.muted : styles.reject}>
          {trip.ditimbang ? `Ditimbang: netto ${kg(trip.netto_acuan)}${trip.netto_sumber ? ` (${trip.netto_sumber})` : ''}${trip.bjr_aktual != null ? ` · BJR ${trip.bjr_aktual}` : ''}` : 'Belum ditimbang'}
        </Text>
      </View>)}
    </Section>
    <Section title="Brondol dan BJR per blok">
      {preview.brondol.length === 0 && <Text style={styles.muted}>Brondol belum dicatat.</Text>}
      {preview.brondol.map((row) => <View key={row.blok_id} style={styles.block}>
        <Text style={styles.bold}>{row.nama}</Text>
        <Line left={`${row.janjang} jjg · ${kg(row.brondol_kg)} · BJR ${row.bjr}`} right={`${row.pct}%`} />
        {row.band !== 'IN_BAND' && <Text style={styles.reject}>{row.band === 'BELOW_BAND' ? 'Di bawah batas wajar' : 'Di atas batas wajar'}{row.hint ? `: ${row.hint}` : ''}</Text>}
      </View>)}
    </Section>
    <Section title={`Restan tercatat (${preview.restan.length})`}>
      {preview.restan.length === 0 && <Text style={styles.muted}>Belum ada restan dari penutupan ini.</Text>}
      {preview.restan.map((row) => <Line key={row.id} left={`${preview.tph.find((t) => t.tph_id === row.tph_id)?.nama ?? 'TPH'} · ${row.jumlah_janjang} jjg`}
        right={row.sudah_dikirim ? 'Sudah diambil truk' : 'Belum diambil'} />)}
    </Section>
    {notes ?? <Section title={`Perlu catatan (${noted.length})`}>
      {noted.length === 0 && <Text style={styles.muted}>Tidak ada pengecualian.</Text>}
      {noted.map((item) => <View key={item.key} style={styles.block}>
        <Text>{item.message}</Text>
        <Text style={item.catatan ? styles.muted : styles.reject}>{item.catatan ? `Catatan Mandor: ${item.catatan}` : 'Belum ada catatan'}</Text>
      </View>)}
    </Section>}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  section: { padding: 16, borderRadius: 10, backgroundColor: BrandColors.cardBg, gap: 6 },
  title: { fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary },
  block: { paddingVertical: 6, gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDD' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1, color: BrandColors.textPrimary },
  right: { fontWeight: '600', textAlign: 'right', color: BrandColors.textPrimary },
  bold: { fontWeight: '700', color: BrandColors.textPrimary },
  muted: { color: BrandColors.textSecondary, fontSize: 13 },
  reject: { color: BrandColors.error, fontSize: 13 },
  badges: { flexDirection: 'row', gap: 8 },
});
