import { estateDate } from '@/utils/estateDate';
import type { HarvestTrace } from '@/types/harvest-trace';

export interface TraceLineRow {
  key: string;
  spb: string | null;
  tempat: string;
  sumber: string;
  janjang: number;
  brondol: number;
}

const day = (iso: string | null | undefined) => (iso ? estateDate(new Date(iso)) : '—');

/**
 * One row per trip line (P6-MOB-01). A LANGSUNG line names the Panen it drew on
 * through its `(bkm_panen_id, tph_id)` pair, whose harvest the server lists once
 * in `panen` however many trucks loaded from that TPH; a TITIP line names the
 * restan it collected and that restan's harvest day.
 */
export function traceLineRows(trace: Pick<HarvestTrace, 'lines' | 'panen'>): TraceLineRow[] {
  const pairs = new Map((trace.panen ?? []).map((pair) => [pair.pair, pair]));
  return (trace.lines ?? []).map((line) => {
    const pair = line.panen_pair ? pairs.get(line.panen_pair) : undefined;
    const sumber =
      line.tipe_pengiriman === 'TITIP'
        ? `Titip · restan panen ${day(line.restan_diambil?.tanggal)}`
        : line.tipe_pengiriman === 'RESTAN'
          ? 'Restan ditinggal (dokumen lama)'
          : pair
            ? `Langsung · Panen ${day(pair.tanggal_laporan)} · ${pair.jumlah_janjang} jjg dipanen di TPH ini`
            : 'Langsung · Panen tidak ditemukan';
    return {
      key: line.id,
      spb: line.nomor_spb,
      tempat: `${line.tph?.nama ?? 'TPH —'} · ${line.blok?.nama ?? 'Blok —'}`,
      sumber,
      janjang: line.jumlah_janjang,
      brondol: line.jumlah_brondol,
    };
  });
}

export const nettoSumberLabel = (sumber: 'INTERNAL' | 'PKS' | null | undefined) =>
  sumber === 'INTERNAL' ? 'timbangan internal' : sumber === 'PKS' ? 'tiket PKS' : '—';
