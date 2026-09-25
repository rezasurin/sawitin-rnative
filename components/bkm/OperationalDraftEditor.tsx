import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/core/Button';
import { FormField, FormSelect } from '@/components/form';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { useFleetChoices } from '@/hooks/useFleetChoices';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { apiClient } from '@/services/api';
import { withPrecondition } from '@/services/precondition';
import { isWholeKg } from '@/utils/field-summary';
import type { DocumentStatus } from '@/types/common';

type Field = { key: string; label: string; numeric?: boolean };
const checkerFields: Field[] = [
  { key: 'nama_sopir', label: 'Nama sopir' }, { key: 'nomor_truk', label: 'Nomor truk' }, { key: 'tujuan_kirim', label: 'Tujuan kirim' },
  ...[['janjang_normal', 'Janjang normal'], ['jumlah_brondol', 'Brondol (kg)'], ['buah_mentah', 'Buah mentah'], ['over_ripe', 'Buah terlalu matang'], ['tangkai_panjang', 'Tangkai panjang'], ['buah_abnormal', 'Buah abnormal'], ['janjang_kosong', 'Janjang kosong'], ['jumlah_janjang', 'Jumlah janjang']].map(([key, label]) => ({ key, label, numeric: true })),
];

/** Correct an existing Checker or manual weighing after explicitly reopening it. */
export function OperationalDraftEditor({ module, document }: {
  module: 'bkmChecker' | 'kraniTimbang';
  document: { id: string; status: DocumentStatus; modified_at: string; details?: { id: string }[] };
}) {
  const policy = useOperationalPolicy(module, document.status, document.details?.length);
  const online = useNetworkStore((state) => state.isOnline);
  const queue = useSyncQueueStore((state) => state.queue);
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const client = useQueryClient();
  const fleet = useFleetChoices();
  const [editing, setEditing] = useState<{ id: string; detail: boolean; baseline?: string; fields: Field[];
    originalVehicleId?: string; originalDriverId?: string } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const queueModule = module === 'bkmChecker' ? 'bkm_checker' : 'krani_timbang';
  const headerFields: Field[] = module === 'bkmChecker' ? [
    { key: 'tanggal_laporan', label: 'Tanggal laporan (YYYY-MM-DD)' }, { key: 'keterangan', label: 'Keterangan' },
  ] : [
    { key: 'nama_supir', label: 'Nama sopir' }, { key: 'nomor_kendaraan', label: 'Nomor kendaraan' },
    { key: 'nomor_dokumen', label: 'Nomor dokumen perjalanan' },
    { key: 'tujuan_kirim', label: 'Tujuan kirim' }, { key: 'tanggal', label: 'Tanggal (YYYY-MM-DD)' },
    { key: 'timbang_isi', label: 'Timbang isi', numeric: true }, { key: 'timbang_kosong', label: 'Timbang kosong', numeric: true },
    { key: 'keterangan', label: 'Keterangan' },
  ];
  const detailFields: Field[] = module === 'bkmChecker' ? checkerFields : [
    { key: 'jumlah_janjang', label: 'Jumlah janjang', numeric: true }, { key: 'jumlah_brondol', label: 'Brondol (kg)', numeric: true },
  ];
  const open = (record: { id: string }, detail: boolean) => {
    const row = record as unknown as Record<string, unknown>;
    const fields = detail ? detailFields : headerFields;
    setValues({ ...Object.fromEntries(fields.map((field) => [field.key, String(row[field.key] ?? '')])),
      kendaraan_id: String(row.kendaraan_id ?? ''), supir_id: String(row.supir_id ?? '') });
    setEditing({ id: record.id, detail, fields, baseline: typeof row.modified_at === 'string' ? row.modified_at : undefined,
      originalVehicleId: String(row.kendaraan_id ?? ''), originalDriverId: String(row.supir_id ?? '') });
  };
  const save = async () => {
    if (!editing || !policy.edit || busy) return;
    setBusy(true);
    try {
      const data: Record<string, string | number | null> = {};
      for (const field of editing.fields) {
        const value = values[field.key]?.trim() ?? '';
        if (field.numeric) {
          const number = Number(value);
          if (!value || !Number.isFinite(number) || number < 0) throw new Error(`${field.label} harus berupa angka positif atau nol.`);
          if (field.key === 'jumlah_brondol' && !isWholeKg(value)) throw new Error('Brondol harus berupa kilogram bulat.');
          data[field.key] = number;
        } else data[field.key] = field.key === 'nomor_dokumen' ? value || null : value;
      }
      if ((module === 'bkmChecker' && editing.detail) || (module === 'kraniTimbang' && !editing.detail)) {
        if (values.kendaraan_id) data.kendaraan_id = values.kendaraan_id;
        else if (editing.originalVehicleId) data.kendaraan_id = null;
        if (values.supir_id) data.supir_id = values.supir_id;
        else if (editing.originalDriverId) data.supir_id = null;
      }
      if (module === 'kraniTimbang' && !editing.detail) {
        if (Number(data.timbang_isi) <= Number(data.timbang_kosong)) throw new Error('Timbang isi harus lebih besar dari timbang kosong.');
        data.netto = Number(data.timbang_isi) - Number(data.timbang_kosong);
      }
      const endpoint = `/${module}/${editing.detail ? 'detail/' : ''}${editing.id}`;
      const pending = queue.some((item) => item.module.startsWith(queueModule) && (item.payload?.documentId ?? item.payload?.id) === document.id);
      if (!online || pending) {
        await addToQueue({ module: `${queueModule}${editing.detail ? '_detail' : ''}`, action: 'UPDATE', endpoint,
          payload: { id: editing.id, data, documentId: document.id, expectedStatus: document.status }, precondition: editing.baseline });
        Alert.alert('Tersimpan', 'Perubahan akan disinkronkan sesuai urutan.');
      } else await apiClient.put(endpoint, data, withPrecondition(editing.baseline));
      setEditing(null);
      if (online && !pending) await client.invalidateQueries();
    } catch (error) {
      if ((error as { status?: number }).status === 409) await client.invalidateQueries();
      Alert.alert('Perubahan belum tersimpan', (error as { status?: number }).status === 409 ? 'Dokumen telah berubah. Periksa data terbaru sebelum mencoba kembali.' : (error as Error).message);
    } finally { setBusy(false); }
  };
  if (!policy.edit) return null;
  return <View style={{ padding: 16, gap: 12 }}>
    <Text style={{ fontWeight: '700' }}>Perbaiki draft</Text>
    {!editing ? <>
      <Button title="Ubah informasi dokumen" onPress={() => open(document, false)} />
      {document.details?.map((detail, index) => <Button key={detail.id} title={`Ubah detail ${index + 1}`} variant="secondary" onPress={() => open(detail, true)} />)}
    </> : <>
      {((module === 'bkmChecker' && editing.detail) || (module === 'kraniTimbang' && !editing.detail)) && <>
        <FormSelect label="Kendaraan" searchable value={values.kendaraan_id || '__manual__'}
          options={[...fleet.vehicles.map((row) => ({ label: row.nomor_kendaraan, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
          onSelect={(id) => { const row = fleet.vehicles.find((item) => item.id === id);
            setValues((previous) => ({ ...previous, kendaraan_id: row?.id ?? '',
              [module === 'bkmChecker' ? 'nomor_truk' : 'nomor_kendaraan']: row?.nomor_kendaraan ?? previous[module === 'bkmChecker' ? 'nomor_truk' : 'nomor_kendaraan'] })); }} />
        <FormSelect label="Sopir" searchable value={values.supir_id || '__manual__'}
          options={[...fleet.drivers.map((row) => ({ label: row.nama, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
          onSelect={(id) => { const row = fleet.drivers.find((item) => item.id === id);
            setValues((previous) => ({ ...previous, supir_id: row?.id ?? '',
              [module === 'bkmChecker' ? 'nama_sopir' : 'nama_supir']: row?.nama ?? previous[module === 'bkmChecker' ? 'nama_sopir' : 'nama_supir'] })); }} />
      </>}
      {editing.fields.map((field) => <FormField key={field.key} label={field.label} value={values[field.key]}
        onChangeText={(value) => setValues((previous) => ({ ...previous, [field.key]: value,
          ...(field.key === 'nomor_truk' || field.key === 'nomor_kendaraan' ? { kendaraan_id: '' } : {}),
          ...(field.key === 'nama_sopir' || field.key === 'nama_supir' ? { supir_id: '' } : {}) }))}
        keyboardType={field.numeric ? 'decimal-pad' : 'default'} editable={!busy} />)}
      <Button title="Simpan perubahan" loading={busy} onPress={() => void save()} />
      <Button title="Batal" variant="secondary" disabled={busy} onPress={() => setEditing(null)} />
    </>}
  </View>;
}
