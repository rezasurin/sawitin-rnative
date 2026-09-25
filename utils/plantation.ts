import type { AgronomyMetadata } from '@/types/master-data';
import type { MappedRecord, PlantationGeometry } from '@/types/geometry';

export function memberLabel(member: { nama?: string; kode?: string | null } | null | undefined, fallback: string): string {
  const name = member?.nama || fallback;
  return member?.kode ? `${name} (${member.kode})` : name;
}

/** Zero from a register import means unconfigured, never a target to divide by. */
export function configuredBasis(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function tphLabel(tph: { nama: string; basis_jjg_perhari?: number; basis_jjg_perbulan?: number }): string {
  const daily = configuredBasis(tph.basis_jjg_perhari);
  const monthly = configuredBasis(tph.basis_jjg_perbulan);
  return `${tph.nama} · Basis/hari: ${daily ?? 'belum diatur'} · Basis/bulan: ${monthly ?? 'belum diatur'}`;
}

/** Undefined means untouched; only an explicit null requests clearing. */
export function geometryPatch(geometry?: PlantationGeometry | null): MappedRecord {
  return geometry === undefined ? {} : { geometry };
}

export function pointFromLocation(location: { longitude: number; latitude: number }): Extract<PlantationGeometry, { type: 'Point' }> {
  const { longitude, latitude } = location;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
    throw new Error('Koordinat GPS tidak valid');
  }
  return { type: 'Point', coordinates: [longitude, latitude] };
}

export function geometryLabel(record: MappedRecord & { koordinat_lokasi?: number[] | null }): string {
  if (!record.geometry) return record.koordinat_lokasi?.length
    ? 'Koordinat lama perlu ditinjau' : 'Belum dipetakan';
  if (record.geometry.type === 'Point') {
    const [longitude, latitude] = record.geometry.coordinates;
    return `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
  return `Batas ${record.geometry.type} tersimpan`;
}

/** Never infer maturity from planting year: cached server values are authoritative. */
export function agronomyLabel(record: { nama: string } & AgronomyMetadata): string {
  return `${record.nama} · ${record.maturitas ?? '—'} · ${record.umur_tanam == null ? '—' : `${record.umur_tanam} th`}`;
}

/** An unassigned parcel is valid master data, but never an operational source. */
export function operationalLands<T extends { blok_id: string | null }>(lands: T[], blokId?: string): T[] {
  return blokId ? lands.filter((land) => !!land.blok_id && land.blok_id === blokId) : [];
}

export function operationalTphs<T extends { lahan_id: string }>(
  tphs: T[], lands: { id: string; blok_id: string | null }[], blokId?: string, lahanId?: string,
): T[] {
  const eligible = new Set(operationalLands(lands, blokId)
    .filter((land) => !lahanId || land.id === lahanId).map((land) => land.id));
  return tphs.filter((tph) => eligible.has(tph.lahan_id));
}
