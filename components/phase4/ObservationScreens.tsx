import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/core/Button';
import { FormDateField, FormField, FormSelect } from '@/components/form';
import { PageHeader } from '@/components/home';
import { AuditTrail } from './AuditTrail';
import { BrandColors } from '@/constants/Colors';
import { useKelompokLahanList } from '@/hooks/useKelompokLahan';
import { useBlokList } from '@/hooks/useBlok';
import { useLahanList } from '@/hooks/useLahan';
import { useTphList } from '@/hooks/useTph';
import { useImageCapture } from '@/hooks/useImageCapture';
import { useLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { uploadApi } from '@/services/upload.service';
import { observasiApi } from '@/services/observasi.service';
import type { CreateObservasiPayload, JenisObservasi, Observasi, TingkatObservasi } from '@/types/observasi';
import { estateDate } from '@/utils/estateDate';

const TYPES: { value: JenisObservasi; label: string; measure: string; unit: string }[] = [
  { value: 'HAMA', label: 'Hama', measure: 'Pokok terdampak', unit: 'pokok' },
  { value: 'PENYAKIT', label: 'Penyakit', measure: 'Pokok terdampak', unit: 'pokok' },
  { value: 'SENSUS_POKOK', label: 'Sensus pokok', measure: 'Jumlah pokok', unit: 'pokok' },
  { value: 'CURAH_HUJAN', label: 'Curah hujan', measure: 'Curah hujan', unit: 'mm' },
  { value: 'INFRASTRUKTUR', label: 'Infrastruktur', measure: 'Panjang / volume', unit: '' },
  { value: 'LAINNYA', label: 'Lainnya', measure: 'Nilai', unit: '' },
];
const severityKinds: JenisObservasi[] = ['HAMA', 'PENYAKIT', 'INFRASTRUKTUR'];
const labelFor = (kind: JenisObservasi) => TYPES.find((type) => type.value === kind)?.label ?? kind;
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Coba lagi.';
const localId = (id: string) => id.startsWith('local:');
const listKey = ['observasi', 'list'];

export function ObservationList() {
  const router = useRouter();
  const group = useLocalGroup();
  const canWrite = useAuthStore((state) => state.hasPermission('mod_bkm_rawat', 'write'));
  const [kind, setKind] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const queue = useSyncQueueStore((state) => state.queue);
  const since = useRef(new Date(Date.now() - 30 * 86400000).toISOString());
  const filters: Record<string, unknown> = {};
  if (kind) filters.jenis = kind;
  if (severity) filters.tingkat = severity;
  const list = useQuery({ queryKey: [...listKey, kind, severity, page], queryFn: () =>
    observasiApi.getAll({ page, limit: 100, filters: JSON.stringify(filters), sort: 'tanggal:desc' }) });
  const local = queue.filter((item) => item.module === 'observasi' && item.action === 'CREATE')
    .map((item) => ({ ...(item.payload as unknown as CreateObservasiPayload), id: `local:${item.id}` }));
  const rows = [...local.filter((item) => (!kind || item.jenis === kind) && (!severity || item.tingkat === severity) && item.tanggal >= since.current), ...(list.data?.data ?? []).filter((item) => item.tanggal >= since.current)];
  return <View style={styles.root}>
    <PageHeader title="Observasi Lapangan" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.muted}>30 hari terakhir</Text>
      <FormSelect label="Jenis" value={kind} options={[{ label: 'Semua', value: '' }, ...TYPES]} onSelect={(v) => { setKind(v); setPage(1); }} />
      <FormSelect label="Tingkat" value={severity} options={[{ label: 'Semua', value: '' }, ...(['RINGAN','SEDANG','BERAT'] as const).map((v) => ({ label: v, value: v }))]} onSelect={(v) => { setSeverity(v); setPage(1); }} />
      {list.isLoading && <ActivityIndicator />}
      {list.isError && <Button title="Muat ulang" onPress={() => void list.refetch()} />}
      {rows.map((item) => <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/${group}/observasi/${item.id}` as never)}>
        <Text style={styles.title}>{labelFor(item.jenis)} · {new Date(item.tanggal).toLocaleDateString('id-ID')}</Text>
        <Text style={styles.muted}>{item.nama_pengamat} · {item.nilai ?? '—'} {item.satuan ?? ''}{localId(item.id) ? ' · Menunggu sinkronisasi' : ''}</Text>
      </Pressable>)}
      {!list.isLoading && !rows.length && <Text>Belum ada observasi dalam 30 hari terakhir.</Text>}
      {page > 1 && <Button title="Halaman sebelumnya" variant="secondary" onPress={() => setPage((v) => v - 1)} />}
      {(list.data?.pagination?.totalPages ?? 0) > page && <Button title="Halaman berikutnya" variant="secondary" onPress={() => setPage((v) => v + 1)} />}
      {canWrite && <Button title="Tambah observasi" onPress={() => router.push(`/${group}/observasi/add` as never)} />}
    </ScrollView>
  </View>;
}

export function ObservationForm() {
  const router = useRouter();
  const group = useLocalGroup();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const remote = useQuery({ queryKey: ['observasi', id], queryFn: () => observasiApi.getById(id!), enabled: editing });
  const queryClient = useQueryClient();
  const online = useNetworkStore((state) => state.isOnline);
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const userName = useAuthStore((state) => state.user?.member?.nama ?? state.user?.username ?? '');
  const photo = useImageCapture();
  const gps = useLocation();
  const key = useRef(`observasi_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [kind, setKind] = useState<JenisObservasi>('CURAH_HUJAN');
  const [groupId, setGroupId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [landId, setLandId] = useState('');
  const [tphId, setTphId] = useState('');
  const [date, setDate] = useState(estateDate());
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('mm');
  const [severity, setSeverity] = useState<TingkatObservasi | ''>('');
  const [observer, setObserver] = useState(userName);
  const [note, setNote] = useState('');
  const [existingPhoto, setExistingPhoto] = useState('');
  const uploadedPhoto = useRef<{ source: string; url: string; hash: string; bytes: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const groups = useKelompokLahanList({ limit: 200 });
  const blocks = useBlokList({ limit: 200 });
  const lands = useLahanList({ limit: 200 });
  const tphs = useTphList({ limit: 200 });

  useEffect(() => { void gps.captureLocation(); }, []);
  useEffect(() => { if (!editing && !groupId && groups.data?.data.length === 1) setGroupId(groups.data.data[0].id); }, [groups.data, editing, groupId]);
  useEffect(() => {
    if (!remote.data) return;
    const row = remote.data;
    setKind(row.jenis); setGroupId(row.kelompok_lahan_id); setBlockId(row.blok_id ?? '');
    setLandId(row.lahan_id ?? ''); setTphId(row.tph_id ?? ''); setDate(row.tanggal.slice(0, 10));
    setValue(row.nilai == null ? '' : String(row.nilai)); setUnit(row.satuan ?? '');
    setSeverity(row.tingkat ?? ''); setObserver(row.nama_pengamat); setNote(row.catatan ?? '');
    setExistingPhoto(row.foto_url ?? '');
  }, [remote.data]);

  const changeKind = (next: string) => {
    const selected = TYPES.find((type) => type.value === next)!;
    setKind(selected.value); setUnit(selected.unit);
    if (!severityKinds.includes(selected.value)) setSeverity('');
    if (selected.value === 'CURAH_HUJAN') { setBlockId(''); setLandId(''); setTphId(''); }
  };

  const save = async () => {
    const numeric = value.trim() ? Number(value) : undefined;
    if (!groupId || !date || !observer.trim() || observer.trim().length > 255 || (numeric !== undefined && (!Number.isFinite(numeric) || numeric < 0)) || note.length > 2000 || unit.length > 50) {
      Alert.alert('Data belum valid', 'Isi kebun, tanggal, dan pengamat; periksa nilai, satuan, serta catatan.'); return;
    }
    const input: CreateObservasiPayload = {
      client_request_id: key.current, jenis: kind, kelompok_lahan_id: groupId,
      tanggal: new Date(date).toISOString(), nama_pengamat: observer.trim(),
      ...(blockId ? { blok_id: blockId } : {}), ...(landId ? { lahan_id: landId } : {}),
      ...(tphId ? { tph_id: tphId } : {}), ...(numeric !== undefined ? { nilai: numeric } : {}),
      ...(unit.trim() ? { satuan: unit.trim() } : {}),
      ...(severityKinds.includes(kind) && severity ? { tingkat: severity } : {}),
      ...(note.trim() ? { catatan: note.trim() } : {}),
      ...(gps.location ? { geometry: { type: 'Point', coordinates: [gps.location.longitude, gps.location.latitude] },
        gps_accuracy: gps.location.accuracy, captured_at: gps.location.capturedAt } : {}),
    };
    setSaving(true);
    try {
      const source = photo.image?.uri;
      if (!online && source) {
        if (!FileSystem.documentDirectory) throw new Error('Penyimpanan foto offline tidak tersedia.');
        const saved = `${FileSystem.documentDirectory}${key.current}.jpg`;
        const stored = await FileSystem.getInfoAsync(saved);
        if (!stored.exists) await FileSystem.copyAsync({ from: source, to: saved });
        input.foto_url = saved;
      } else if (online && source) {
        const uploaded = uploadedPhoto.current?.source === source ? uploadedPhoto.current : await uploadApi.uploadImage(source, 'observasi');
        uploadedPhoto.current = { source, url: uploaded.url, hash: uploaded.hash, bytes: uploaded.bytes };
        input.foto_url = uploaded.url; input.foto_hash = uploaded.hash; input.foto_bytes = uploaded.bytes;
        setExistingPhoto(uploaded.url);
      } else if (existingPhoto) input.foto_url = existingPhoto;
      if (editing) {
        if (!online) throw new Error('Perubahan observasi membutuhkan koneksi internet.');
        const { client_request_id: _replayKey, ...update } = input;
        await observasiApi.update(id!, { ...update,
          blok_id: blockId || null, lahan_id: landId || null, tph_id: tphId || null,
          nilai: numeric ?? null, satuan: unit.trim() || null, catatan: note.trim() || null,
          foto_url: input.foto_url ?? null,
          foto_hash: input.foto_url ? input.foto_hash : null,
          foto_bytes: input.foto_url ? input.foto_bytes : null,
          tingkat: severityKinds.includes(kind) ? severity || null : null });
      } else if (online) await observasiApi.create(input);
      else await addToQueue({ module: 'observasi', action: 'CREATE', endpoint: '/observasi', payload: input as unknown as Record<string, unknown> });
      await queryClient.invalidateQueries({ queryKey: listKey });
      router.replace(`/${group}/observasi` as never);
    } catch (error) { Alert.alert('Gagal menyimpan', errorText(error)); }
    finally { setSaving(false); }
  };

  const type = TYPES.find((item) => item.value === kind)!;
  return <View style={styles.root}>
    <PageHeader title={editing ? 'Ubah Observasi' : 'Tambah Observasi'} showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FormSelect label="Jenis" value={kind} options={TYPES} onSelect={changeKind} />
      <FormSelect label="Kebun" value={groupId} options={(groups.data?.data ?? []).map((row) => ({ label: row.nama, value: row.id }))} onSelect={(v) => { setGroupId(v); setBlockId(''); setLandId(''); setTphId(''); }} searchable />
      {kind !== 'CURAH_HUJAN' && <>
        <FormSelect label="Blok (opsional)" value={blockId} options={[{ label: 'Tanpa blok', value: '' }, ...(blocks.data?.data ?? []).filter((row) => row.kelompok_lahan_id === groupId).map((row) => ({ label: row.nama, value: row.id }))]} onSelect={(v) => { setBlockId(v); setLandId(''); setTphId(''); }} searchable />
        <FormSelect label="Lahan (opsional)" value={landId} options={[{ label: 'Tanpa lahan', value: '' }, ...(lands.data?.data ?? []).filter((row) => row.blok_id === blockId).map((row) => ({ label: row.nama, value: row.id }))]} onSelect={(v) => { setLandId(v); setTphId(''); }} searchable />
        <FormSelect label="TPH (opsional)" value={tphId} options={[{ label: 'Tanpa TPH', value: '' }, ...(tphs.data?.data ?? []).filter((row) => row.lahan_id === landId).map((row) => ({ label: row.nama, value: row.id }))]} onSelect={setTphId} searchable />
      </>}
      <FormDateField label="Tanggal" value={date} onChange={setDate} />
      <FormField label={type.measure} value={value} onChangeText={setValue} keyboardType="decimal-pad" />
      <FormField label="Satuan" value={unit} onChangeText={setUnit} />
      {severityKinds.includes(kind) && <View style={styles.row}>{(['RINGAN', 'SEDANG', 'BERAT'] as const).map((v) =>
        <Pressable key={v} onPress={() => setSeverity(severity === v ? '' : v)} style={[styles.chip, severity === v && styles.selected]}><Text>{v}</Text></Pressable>)}</View>}
      <FormField label="Nama pengamat" value={observer} onChangeText={setObserver} />
      <FormField label="Catatan" value={note} onChangeText={setNote} multiline />
      <Text style={styles.muted}>{gps.location ? 'GPS tercatat' : 'GPS tidak tersedia; observasi tetap dapat disimpan.'}</Text>
      <Button title={photo.image || existingPhoto ? 'Ganti foto' : 'Ambil foto'} variant="secondary" onPress={() => void photo.captureFromCamera()} />
      {!!(photo.image?.uri || existingPhoto) && <Image source={{ uri: photo.image?.uri ?? existingPhoto }} style={{ width: 120, height: 120 }} />}
      {!!(photo.image?.uri || existingPhoto) && <Button title="Hapus foto" variant="secondary" onPress={() => { photo.clearImage(); setExistingPhoto(''); uploadedPhoto.current = null; }} />}
      <Button title="Simpan observasi" loading={saving} disabled={saving || (editing && !online)} onPress={() => void save()} />
    </ScrollView>
  </View>;
}

export function ObservationDetail() {
  const router = useRouter();
  const group = useLocalGroup();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queue = useSyncQueueStore((state) => state.queue);
  const remove = useSyncQueueStore((state) => state.removeFromQueue);
  const canWrite = useAuthStore((state) => state.hasPermission('mod_bkm_rawat', 'update'));
  const canDelete = useAuthStore((state) => state.hasPermission('mod_bkm_rawat', 'delete'));
  const queryClient = useQueryClient();
  const remote = useQuery({ queryKey: ['observasi', id], queryFn: () => observasiApi.getById(id), enabled: !localId(id) });
  const pending = localId(id) ? queue.find((item) => item.id === id.slice(6))?.payload as unknown as Observasi | undefined : undefined;
  const row = pending ?? remote.data;
  if (!row) return <View style={styles.root}><PageHeader title="Observasi" showBackButton onBack={() => router.back()} />
    {remote.isLoading ? <ActivityIndicator /> : <ScrollView contentContainerStyle={styles.content}><Text>Observasi tidak tersedia atau sudah dihapus.</Text>{!localId(id) && <AuditTrail path={`/observasi/${id}/history`} />}</ScrollView>}</View>;
  const erase = () => Alert.alert('Hapus observasi?', 'Riwayat penghapusan tetap tercatat.', [
    { text: 'Batal' }, { text: 'Hapus', style: 'destructive', onPress: async () => {
      try { if (localId(id)) await remove(id.slice(6)); else await observasiApi.delete(id);
        await queryClient.invalidateQueries({ queryKey: listKey }); router.replace(`/${group}/observasi` as never);
      } catch (error) { Alert.alert('Gagal', errorText(error)); }
    } },
  ]);
  return <View style={styles.root}><PageHeader title="Detail Observasi" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{labelFor(row.jenis)} · {new Date(row.tanggal).toLocaleDateString('id-ID')}</Text>
      <Text>Kebun: {row.kelompok_lahan?.nama ?? row.kelompok_lahan_id}</Text>
      {!!row.blok_id && <Text>Blok: {row.blok?.nama ?? row.blok_id}</Text>}
      {!!row.lahan_id && <Text>Lahan: {row.lahan?.nama ?? row.lahan_id}</Text>}
      <Text>Pengamat: {row.nama_pengamat}</Text>
      {row.nilai != null && <Text>Nilai: {row.nilai} {row.satuan ?? ''}</Text>}
      {!!row.tingkat && <Text>Tingkat: {row.tingkat}</Text>}
      {!!row.catatan && <Text>{row.catatan}</Text>}
      {!!row.foto_url && <Image source={{ uri: row.foto_url }} style={{ width: 180, height: 180 }} />}
      {!!row.geometry && <Text>GPS: {row.geometry.type === 'Point' ? row.geometry.coordinates.join(', ') : 'Tersimpan'}</Text>}
      {localId(id) && <Text style={styles.muted}>Menunggu sinkronisasi</Text>}
      {!localId(id) && canWrite && <Button title="Ubah" onPress={() => router.push(`/${group}/observasi/add?id=${id}` as never)} />}
      {canDelete && <Button title="Hapus" variant="danger" onPress={erase} />}
      {!localId(id) && <AuditTrail path={`/observasi/${id}/history`} />}
    </ScrollView>
  </View>;
}

function useLocalGroup() {
  const segments = useSegments();
  return segments[0] === '(admin)' ? '(admin)' : segments[0] === '(asisten)' ? '(asisten)' : '(mandor)';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 12, backgroundColor: BrandColors.cardBg, gap: 5 },
  title: { fontSize: 17, fontWeight: '700', color: BrandColors.textPrimary },
  muted: { color: BrandColors.textSecondary },
  row: { flexDirection: 'row', gap: 8 },
  chip: { padding: 14, borderWidth: 1, borderColor: BrandColors.textMuted, borderRadius: 12, flex: 1, alignItems: 'center' },
  selected: { backgroundColor: '#DDE9C8', borderColor: BrandColors.primary },
});
