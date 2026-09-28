import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/core/Button';
import { FormDateField, FormField, FormSelect } from '@/components/form';
import { PageHeader } from '@/components/home';
import { AuditTrail } from './AuditTrail';
import { BrandColors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { usePekerjaList } from '@/hooks/usePekerja';
import { useBkmRawatList, useBkmRawatLookups } from '@/hooks/useBkmRawat';
import { kendaraanApi, supirApi, pemakaianKendaraanApi as usageApi } from '@/services/vehicle-usage.service';
import type { CreatePemakaianKendaraanPayload, PemakaianKendaraan } from '@/types/vehicle-usage';
import { estateDate } from '@/utils/estateDate';

const listKey = ['pemakaianKendaraan', 'list'];
const errText = (error: unknown) => error instanceof Error ? error.message : 'Coba lagi.';
function useGroup() { const first = useSegments()[0]; return first === '(admin)' ? '(admin)' : first === '(asisten)' ? '(asisten)' : '(mandor)'; }
function isLocal(id: string) { return id.startsWith('local:'); }

export function VehicleUsageList() {
  const router = useRouter(); const group = useGroup();
  const canWrite = useAuthStore((s) => s.hasPermission('mod_bkm_rawat', 'write'));
  const queue = useSyncQueueStore((s) => s.queue);
  const list = useQuery({ queryKey: listKey, queryFn: () => usageApi.getAll({ limit: 50, sort: 'tanggal:desc' }) });
  const local = queue.filter((item) => item.module === 'pemakaian_kendaraan' && item.action === 'CREATE')
    .map((item) => ({ ...((item.payload as { data: CreatePemakaianKendaraanPayload }).data), id: `local:${item.id}`, status: (item.payload as { submit: boolean }).submit ? 'SUBMITTED' : 'DRAFT' }));
  const rows = [...local, ...(list.data?.data ?? [])];
  return <View style={styles.root}><PageHeader title="Pemakaian Kendaraan" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      {list.isLoading && <ActivityIndicator />}
      {list.isError && <Button title="Muat ulang" onPress={() => void list.refetch()} />}
      {rows.map((row) => <Pressable key={row.id} style={styles.card} onPress={() => router.push(`/${group}/pemakaian-kendaraan/${row.id}` as never)}>
        <Text style={styles.title}>{'kendaraan' in row && row.kendaraan ? row.kendaraan.nomor_kendaraan : row.kendaraan_id}</Text>
        <Text>{new Date(row.tanggal).toLocaleDateString('id-ID')} · {row.status}{isLocal(row.id) ? ' · Offline' : ''}</Text>
        {row.jumlah_bbm != null && <Text>BBM: {row.jumlah_bbm} {('material' in row && row.material?.satuan) || ''}</Text>}
      </Pressable>)}
      {!list.isLoading && !rows.length && <Text>Belum ada pemakaian kendaraan.</Text>}
      {canWrite && <Button title="Catat pemakaian" onPress={() => router.push(`/${group}/pemakaian-kendaraan/add` as never)} />}
    </ScrollView>
  </View>;
}

export function VehicleUsageForm() {
  const router = useRouter(); const group = useGroup();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const record = useQuery({ queryKey: ['pemakaianKendaraan', id], queryFn: () => usageApi.getById(id!), enabled: editing });
  const client = useQueryClient();
  const online = useNetworkStore((s) => s.isOnline);
  const addToQueue = useSyncQueueStore((s) => s.addToQueue);
  const canReadMasters = useAuthStore((s) => s.hasPermission('mod_krani_timbang', 'read'));
  const vehicles = useQuery({ queryKey: ['kendaraan', 200], queryFn: () => kendaraanApi.getAll({ limit: 200 }), enabled: canReadMasters });
  const drivers = useQuery({ queryKey: ['supir', 200], queryFn: () => supirApi.getAll({ limit: 200 }), enabled: canReadMasters });
  const workers = usePekerjaList({ limit: 200 });
  const materials = useBkmRawatLookups();
  const vehicleRows = vehicles.data?.data ?? materials.data?.vehicles ?? [];
  const driverRows = drivers.data?.data ?? materials.data?.drivers ?? [];
  const rawat = useBkmRawatList({ limit: 100 });
  const key = useRef(`usage_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [vehicleId, setVehicleId] = useState(''); const [driverId, setDriverId] = useState('');
  const [workerId, setWorkerId] = useState(''); const [rawatId, setRawatId] = useState('');
  const [date, setDate] = useState(estateDate());
  const [meterStart, setMeterStart] = useState(''); const [meterEnd, setMeterEnd] = useState('');
  const [meterUnit, setMeterUnit] = useState('km'); const [fuelId, setFuelId] = useState('');
  const [fuelAmount, setFuelAmount] = useState(''); const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const recent = useQuery({ queryKey: ['lastVehicleMeter', vehicleId], queryFn: () => usageApi.getAll({ limit: 50, filters: JSON.stringify({ kendaraan_id: vehicleId, status: 'APPROVED' }), sort: 'tanggal:desc' }), enabled: !!vehicleId && online });

  useEffect(() => {
    if (!record.data) return; const row = record.data;
    setVehicleId(row.kendaraan_id); setDriverId(row.supir_id ?? ''); setWorkerId(row.pekerja_id ?? '');
    setRawatId(row.bkm_rawat_id ?? ''); setDate(row.tanggal.slice(0, 10));
    setMeterStart(row.meter_awal == null ? '' : String(row.meter_awal));
    setMeterEnd(row.meter_akhir == null ? '' : String(row.meter_akhir));
    setMeterUnit(row.satuan_meter ?? 'km'); setFuelId(row.material_id ?? '');
    setFuelAmount(row.jumlah_bbm == null ? '' : String(row.jumlah_bbm)); setNote(row.keterangan ?? '');
  }, [record.data]);
  useEffect(() => {
    if (editing || meterStart || !recent.data?.data?.length) return;
    const last = recent.data.data.find((row) => row.meter_akhir != null);
    if (last?.meter_akhir != null) setMeterStart(String(last.meter_akhir));
  }, [recent.data, editing, meterStart]);

  const save = async (submit: boolean) => {
    const start = meterStart.trim() ? Number(meterStart) : undefined;
    const end = meterEnd.trim() ? Number(meterEnd) : undefined;
    const fuel = fuelAmount.trim() ? Number(fuelAmount) : undefined;
    if (!vehicleId || !date || (start !== undefined && (!Number.isFinite(start) || start < 0)) ||
      (end !== undefined && (!Number.isFinite(end) || end < 0)) ||
      (start !== undefined && end !== undefined && end < start) || Boolean(fuelId) !== (fuel !== undefined) ||
      (fuel !== undefined && (!Number.isFinite(fuel) || fuel <= 0)) || note.length > 2000) {
      Alert.alert('Data belum valid', 'Pilih kendaraan dan tanggal; periksa meter serta pasangan material/BBM.'); return;
    }
    const data: CreatePemakaianKendaraanPayload = {
      client_request_id: key.current, kendaraan_id: vehicleId, tanggal: new Date(date).toISOString(),
      ...(driverId ? { supir_id: driverId } : {}), ...(workerId ? { pekerja_id: workerId } : {}),
      ...(rawatId ? { bkm_rawat_id: rawatId } : {}), ...(start !== undefined ? { meter_awal: start } : {}),
      ...(end !== undefined ? { meter_akhir: end } : {}),
      ...((start !== undefined || end !== undefined) ? { satuan_meter: meterUnit } : {}),
      ...(fuelId ? { material_id: fuelId, jumlah_bbm: fuel! } : {}),
      ...(note.trim() ? { keterangan: note.trim() } : {}),
    };
    setSaving(true);
    try {
      if (editing) {
        if (!online) throw new Error('Ubah pemakaian membutuhkan koneksi internet.');
        const { client_request_id: _replayKey, ...update } = data;
        await usageApi.update(id!, { ...update, supir_id: driverId || null, pekerja_id: workerId || null,
          bkm_rawat_id: rawatId || null, meter_awal: start ?? null, meter_akhir: end ?? null,
          satuan_meter: start !== undefined || end !== undefined ? meterUnit : null,
          material_id: fuelId || null, jumlah_bbm: fuel ?? null, keterangan: note.trim() || null,
          ...(submit ? { status: 'SUBMITTED' as const } : {}) });
      } else if (online) {
        const created = await usageApi.create(data);
        if (submit && created.status === 'DRAFT') await usageApi.update(created.id, { status: 'SUBMITTED' });
      } else await addToQueue({ module: 'pemakaian_kendaraan', action: 'CREATE', endpoint: '/pemakaianKendaraan', payload: { data, submit } });
      await client.invalidateQueries({ queryKey: listKey });
      router.replace(`/${group}/pemakaian-kendaraan` as never);
    } catch (error) { Alert.alert('Gagal menyimpan', errText(error)); }
    finally { setSaving(false); }
  };

  const last = recent.data?.data.find((row) => row.meter_akhir != null)?.meter_akhir;
  const jump = last != null && meterEnd && Number(meterEnd) - Number(last) > (meterUnit === 'jam' ? 24 : 500);
  return <View style={styles.root}><PageHeader title={editing ? 'Ubah Pemakaian' : 'Catat Pemakaian'} showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!vehicleRows.length && <Text style={styles.warn}>Daftar kendaraan tidak tersedia. Hubungkan perangkat saat pertama kali mengisi cache.</Text>}
      <FormSelect label="Kendaraan / alat" value={vehicleId} options={vehicleRows.filter((row) => row.status === 'ACTIVE').map((row) => ({ label: `${row.nomor_kendaraan} · ${row.jenis_kendaraan}`, value: row.id }))} onSelect={(v) => { setVehicleId(v); const row = vehicleRows.find((item) => item.id === v); setMeterUnit(/traktor|sprayer|alat/i.test(row?.jenis_kendaraan ?? '') ? 'jam' : 'km'); setMeterStart(''); }} searchable />
      <FormSelect label="Supir (opsional)" value={driverId} options={[{ label: 'Tanpa supir terdaftar', value: '' }, ...driverRows.filter((row) => row.status === 'ACTIVE').map((row) => ({ label: row.nama, value: row.id }))]} onSelect={(v) => { setDriverId(v); if (v) setWorkerId(''); }} searchable />
      <FormSelect label="Operator pekerja (opsional)" value={workerId} options={[{ label: 'Tanpa operator terdaftar', value: '' }, ...(workers.data?.data ?? []).map((row) => ({ label: row.member?.nama ?? row.id, value: row.id }))]} onSelect={(v) => { setWorkerId(v); if (v) setDriverId(''); }} searchable />
      <FormDateField label="Tanggal" value={date} onChange={setDate} />
      <FormSelect label="BKM Rawat (opsional)" value={rawatId} options={[{ label: 'Tanpa BKM Rawat', value: '' }, ...(rawat.data?.data ?? []).filter((row) => row.tanggal.slice(0, 10) === date).map((row) => ({ label: `${row.blok?.nama ?? row.blok_id} · ${row.kelompok_lahan?.nama ?? ''}`, value: row.id }))]} onSelect={setRawatId} searchable />
      <FormSelect label="Satuan meter" value={meterUnit} options={[{ label: 'km', value: 'km' }, { label: 'jam', value: 'jam' }]} onSelect={setMeterUnit} />
      <FormField label="Meter awal" value={meterStart} onChangeText={setMeterStart} keyboardType="decimal-pad" />
      <FormField label="Meter akhir" value={meterEnd} onChangeText={setMeterEnd} keyboardType="decimal-pad" />
      {jump && <Text style={styles.warn}>Kenaikan meter terlihat besar. Periksa kembali sebelum menyimpan.</Text>}
      <Text style={styles.title}>BBM (opsional)</Text>
      <FormSelect label="Material BBM" value={fuelId} options={[{ label: 'Tanpa BBM', value: '' }, ...(materials.data?.materials ?? []).map((row) => ({ label: `${row.nama} · ${row.satuan}`, value: row.id }))]} onSelect={(v) => { setFuelId(v); if (!v) setFuelAmount(''); }} searchable />
      {!!fuelId && <FormField label="Jumlah BBM" value={fuelAmount} onChangeText={setFuelAmount} keyboardType="decimal-pad" />}
      <FormField label="Keterangan" value={note} onChangeText={setNote} multiline />
      <Button title="Simpan draft" loading={saving} disabled={saving || !vehicleId || (editing && !online)} onPress={() => void save(false)} />
      <Button title="Simpan dan kirim" loading={saving} disabled={saving || !vehicleId || (editing && !online)} onPress={() => void save(true)} />
    </ScrollView>
  </View>;
}

export function VehicleUsageDetail() {
  const router = useRouter(); const group = useGroup();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const online = useNetworkStore((s) => s.isOnline);
  const queue = useSyncQueueStore((s) => s.queue);
  const updateQueue = useSyncQueueStore((s) => s.updatePayload);
  const addToQueue = useSyncQueueStore((s) => s.addToQueue);
  const canUpdate = useAuthStore((s) => s.hasPermission('mod_bkm_rawat', 'update'));
  const canApprove = useAuthStore((s) => s.hasPermission('mod_bkm_rawat', 'approve'));
  const userCode = useAuthStore((s) => s.user?.user_code);
  const [rejectionNote, setRejectionNote] = useState('');
  const record = useQuery({ queryKey: ['pemakaianKendaraan', id], queryFn: () => usageApi.getById(id), enabled: !isLocal(id) });
  const pending = isLocal(id) ? queue.find((item) => item.id === id.slice(6)) : undefined;
  const row = isLocal(id) ? ({ ...((pending?.payload as { data: CreatePemakaianKendaraanPayload } | undefined)?.data),
    status: (pending?.payload as { submit?: boolean } | undefined)?.submit ? 'SUBMITTED' : 'DRAFT' } as PemakaianKendaraan) : record.data;
  if (!row?.kendaraan_id) return <View style={styles.root}><PageHeader title="Pemakaian" showBackButton onBack={() => router.back()} />
    {record.isLoading ? <ActivityIndicator /> : <Text style={styles.content}>Dokumen tidak tersedia.</Text>}</View>;
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: listKey }); if (!isLocal(id)) await record.refetch(); };
  const submit = async () => {
    try {
      if (pending) await updateQueue(pending.id, { ...(pending.payload ?? {}), submit: true });
      else if (online) await usageApi.update(id, { status: 'SUBMITTED' });
      else await addToQueue({ module: 'pemakaian_kendaraan', action: 'UPDATE', endpoint: `/pemakaianKendaraan/${id}`, payload: { id, data: { status: 'SUBMITTED' } } });
      await refresh();
    } catch (error) { Alert.alert('Gagal', errText(error)); }
  };
  const approve = () => Alert.alert('Setujui pemakaian?', row.jumlah_bbm != null ? `${row.jumlah_bbm} ${row.material?.satuan ?? ''} ${row.material?.nama ?? 'BBM'} akan dikurangi dari stok.` : 'Tidak ada BBM yang dikurangi.', [
    { text: 'Batal' }, { text: 'Setujui', onPress: async () => {
      try { await usageApi.approve(id); await refresh(); await queryClient.invalidateQueries({ queryKey: ['material'] }); }
      catch (error) { Alert.alert('Persetujuan gagal; dokumen tetap SUBMITTED', errText(error)); await refresh(); }
    } },
  ]);
  const reject = () => Alert.alert('Kembalikan untuk revisi?', 'Dokumen akan kembali ke pembuat untuk diperbaiki.', [
    { text: 'Batal' }, { text: 'Kembalikan', onPress: async () => {
      try { await usageApi.reject(id, rejectionNote.trim()); setRejectionNote(''); await refresh(); }
      catch (error) { Alert.alert('Gagal menolak', errText(error)); await refresh(); }
    } },
  ]);
  return <View style={styles.root}><PageHeader title="Detail Pemakaian" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{row.kendaraan?.nomor_kendaraan ?? row.kendaraan_id}</Text>
      <Text>{new Date(row.tanggal).toLocaleDateString('id-ID')} · {row.status}</Text>
      {!!row.supir_id && <Text>Supir: {row.supir?.nama ?? row.supir_id}</Text>}
      {!!row.pekerja_id && <Text>Operator: {row.pekerja_id}</Text>}
      {!!row.bkm_rawat_id && <Text>BKM Rawat: {row.bkm_rawat_id}</Text>}
      {row.meter_awal != null && <Text>Meter awal: {row.meter_awal} {row.satuan_meter ?? ''}</Text>}
      {row.meter_akhir != null && <Text>Meter akhir: {row.meter_akhir} {row.satuan_meter ?? ''}</Text>}
      {row.jumlah_bbm != null && <Text>BBM: {row.jumlah_bbm} {row.material?.satuan ?? ''} {row.material?.nama ?? row.material_id}</Text>}
      {!!row.keterangan && <Text>{row.keterangan}</Text>}
      {!!row.rejection_note && <Text>Catatan penolakan: {row.rejection_note}</Text>}
      {isLocal(id) && <Text style={styles.muted}>Menunggu sinkronisasi</Text>}
      {!isLocal(id) && row.status === 'DRAFT' && canUpdate && online && <Button title="Ubah" onPress={() => router.push(`/${group}/pemakaian-kendaraan/add?id=${id}` as never)} />}
      {row.status === 'DRAFT' && canUpdate && <Button title="Kirim untuk persetujuan" onPress={() => void submit()} />}
      {!isLocal(id) && row.status === 'REVISION_REQUESTED' && canUpdate && online && <Button title="Buka kembali sebagai draft" onPress={async () => { try { await usageApi.update(id, { status: 'DRAFT' }); await refresh(); } catch (error) { Alert.alert('Gagal', errText(error)); } }} />}
      {!isLocal(id) && row.status === 'SUBMITTED' && canApprove && online && row.created_by !== userCode && <>
        <Button title="Setujui" onPress={approve} />
        <FormField label="Catatan revisi" value={rejectionNote} onChangeText={setRejectionNote} />
        <Button title="Kembalikan untuk revisi" variant="secondary" onPress={reject} />
      </>}
      {!isLocal(id) && <AuditTrail path={`/pemakaianKendaraan/${id}/history`} />}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 100 }, card: { padding: 16, borderRadius: 12, backgroundColor: BrandColors.cardBg, gap: 6 },
  title: { fontSize: 17, fontWeight: '700', color: BrandColors.textPrimary }, muted: { color: BrandColors.textSecondary },
  warn: { color: BrandColors.error } });
