import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from '@/components/Themed';
import { PageHeader } from '@/components/home';
import { Button } from '@/components/core/Button';
import { FormField, FormSelect } from '@/components/form';
import { DocStatusBadge } from '@/components/bkm/DocStatusBadge';
import { BrandColors } from '@/constants/Colors';
import { useBkmRawatActions, useBkmRawatDetail } from '@/hooks/useBkmRawat';
import { useMaterialList } from '@/hooks/useMaterial';
import { bkmRawatApi } from '@/services/bkm-rawat.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { DetailBkmRawat } from '@/types/bkm-rawat';

type MaterialRow = { material_id: string; jumlah: number };

export default function RawatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useBkmRawatDetail(id);
  const { hasPermission } = useAuthStore();
  const actions = useBkmRawatActions();
  const lookups = useQuery({ queryKey: ['bkmRawat', 'lookups'], queryFn: bkmRawatApi.getLookups });
  const materials = useMaterialList({ limit: 200 });
  const [editing, setEditing] = useState<DetailBkmRawat | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [typeId, setTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemId, setItemId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [workerCount, setWorkerCount] = useState('1');
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  const canEdit = data?.status === 'DRAFT' && hasPermission('mod_bkm_rawat', 'update');
  const canAdd = data?.status === 'DRAFT' && hasPermission('mod_bkm_rawat', 'write');
  const canDeleteDetail = data?.status === 'DRAFT' && hasPermission('mod_bkm_rawat', 'delete');
  const canApprove = data?.status === 'SUBMITTED' && hasPermission('mod_bkm_rawat', 'approve');

  const openForm = (detail?: DetailBkmRawat) => {
    setEditing(detail ?? null);
    setTypeId(detail?.tipe_pekerjaan_id ?? '');
    setCategoryId(detail?.kategori_pekerjaan_id ?? '');
    setItemId(detail?.item_pekerjaan_id ?? '');
    setWorkerName(detail?.nama_pekerja ?? '');
    setWorkerCount(String(detail?.jumlah_pekerja ?? 1));
    setResult(detail?.hasil_pekerjaan == null ? '' : String(detail.hasil_pekerjaan));
    setUnit(detail?.satuan_hasil ?? '');
    setNote(detail?.keterangan ?? '');
    setMaterialRows(detail?.materials?.map((m) => ({ material_id: m.material_id, jumlah: Number(m.jumlah) })) ?? []);
    setMaterialId('');
    setMaterialQty('');
    setFormOpen(true);
  };

  const saveDetail = async () => {
    const count = Number(workerCount);
    const output = result.trim() ? Number(result) : undefined;
    if (!typeId || !categoryId || !itemId || !workerName.trim() || !Number.isInteger(count) || count < 1 || (output !== undefined && (!Number.isFinite(output) || output < 0))) {
      Alert.alert('Data belum lengkap', 'Isi jenis pekerjaan, kategori, item, nama pekerja, dan jumlah pekerja yang valid.');
      return;
    }
    try {
      const payload = {
        tipe_pekerjaan_id: typeId,
        kategori_pekerjaan_id: categoryId,
        item_pekerjaan_id: itemId,
        nama_pekerja: workerName.trim(),
        jumlah_pekerja: count,
        hasil_pekerjaan: output,
        satuan_hasil: unit.trim() || undefined,
        keterangan: note.trim() || undefined,
        materials: materialRows,
      };
      if (editing) await actions.updateDetail.mutateAsync({ id: editing.id, data: payload });
      else await actions.addDetail.mutateAsync({ bkm_rawat_id: id, ...payload });
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const addMaterial = () => {
    const quantity = Number(materialQty);
    if (!materialId || !Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Material belum lengkap', 'Pilih material dan isi jumlah lebih dari nol.');
      return;
    }
    setMaterialRows((rows) => [...rows.filter((m) => m.material_id !== materialId), { material_id: materialId, jumlah: quantity }]);
    setMaterialId('');
    setMaterialQty('');
  };

  const confirmAction = (title: string, message: string, run: () => Promise<unknown>) => {
    Alert.alert(title, message, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Lanjutkan', onPress: async () => {
        try { await run(); }
        catch (error) { Alert.alert('Gagal', error instanceof Error ? error.message : 'Coba lagi.'); }
      } },
    ]);
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={BrandColors.primary} /></View>;
  if (isError || !data) return <View style={styles.center}><Text>Gagal memuat BKM Rawat.</Text><Button title="Coba lagi" onPress={() => refetch()} /></View>;

  const details = data.detail_rawat ?? data.details ?? [];
  const materialNames = new Map((materials.data?.data ?? []).map((m) => [m.id, m.nama]));
  const itemOptions = (lookups.data?.items ?? []).filter((item) => item.kategori_pekerjaan_id === categoryId).map((item) => ({ label: item.nama, value: item.id }));

  return (
    <View style={styles.container}>
      <PageHeader title="Detail BKM Rawat" showBackButton onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.title}>{data.blok?.nama ?? data.blok_id}</Text><DocStatusBadge status={data.status} /></View>
          <Text style={styles.meta}>Tanggal: {new Date(data.tanggal).toLocaleDateString('id-ID')}</Text>
          <Text style={styles.meta}>Pengawas: {data.nama_pengawas}</Text>
          <Text style={styles.meta}>Lahan: {data.lahan?.nama ?? 'Tanpa lahan'}</Text>
          {data.rejection_note ? <Text style={styles.meta}>Catatan penolakan: {data.rejection_note}</Text> : null}
        </View>

        <Text style={styles.section}>Pekerjaan ({details.length})</Text>
        {details.map((detail) => (
          <View key={detail.id} style={styles.card}>
            <Text style={styles.title}>{detail.item_pekerjaan?.nama ?? detail.nama_pekerja}</Text>
            <Text style={styles.meta}>{detail.nama_pekerja} · {detail.jumlah_pekerja} pekerja</Text>
            <Text style={styles.meta}>{detail.tipe_pekerjaan?.nama ?? detail.tipe_pekerjaan_id} · {detail.kategori_pekerjaan?.nama ?? detail.kategori_pekerjaan_id}</Text>
            {detail.hasil_pekerjaan != null && <Text style={styles.meta}>Hasil: {detail.hasil_pekerjaan} {detail.satuan_hasil ?? ''}</Text>}
            {detail.keterangan && <Text style={styles.meta}>{detail.keterangan}</Text>}
            {(detail.materials ?? []).map((material) => <Text key={material.id} style={styles.meta}>Material: {material.material?.nama ?? materialNames.get(material.material_id) ?? material.material_id} · {material.jumlah}</Text>)}
            {(canEdit || canDeleteDetail) && <View style={styles.row}>
              {canEdit && <Button title="Ubah" variant="secondary" size="sm" onPress={() => openForm(detail)} />}
              {canDeleteDetail && <Button title="Hapus" variant="danger" size="sm" onPress={() => confirmAction('Hapus pekerjaan?', 'Detail dan materialnya akan dihapus.', () => actions.deleteDetail.mutateAsync(detail.id))} />}
            </View>}
          </View>
        ))}
        {details.length === 0 && <Text style={styles.meta}>Belum ada pekerjaan. Tambahkan detail sebelum mengirim dokumen.</Text>}

        {canAdd && !formOpen && <Button title="Tambah pekerjaan" onPress={() => openForm()} />}
        {formOpen && (editing ? canEdit : canAdd) && <View style={styles.card}>
          <Text style={styles.section}>{editing ? 'Ubah pekerjaan' : 'Tambah pekerjaan'}</Text>
          <FormSelect label="Tipe pekerjaan" value={typeId} options={(lookups.data?.types ?? []).map((v) => ({ label: v.nama, value: v.id }))} onSelect={setTypeId} searchable />
          <FormSelect label="Kategori pekerjaan" value={categoryId} options={(lookups.data?.categories ?? []).map((v) => ({ label: v.nama, value: v.id }))} onSelect={(v) => { setCategoryId(v); setItemId(''); }} searchable />
          <FormSelect label="Item pekerjaan" value={itemId} options={itemOptions} onSelect={setItemId} searchable disabled={!categoryId} />
          <FormField label="Nama pekerja / kelompok" value={workerName} onChangeText={setWorkerName} />
          <FormField label="Jumlah pekerja" value={workerCount} onChangeText={setWorkerCount} keyboardType="number-pad" />
          <FormField label="Hasil pekerjaan" value={result} onChangeText={setResult} keyboardType="decimal-pad" />
          <FormField label="Satuan hasil" value={unit} onChangeText={setUnit} />
          <FormField label="Keterangan" value={note} onChangeText={setNote} />
          <Text style={styles.section}>Material</Text>
          {materialRows.map((row) => <TouchableOpacity key={row.material_id} onPress={() => setMaterialRows((rows) => rows.filter((m) => m.material_id !== row.material_id))}><Text style={styles.meta}>{materialNames.get(row.material_id) ?? row.material_id} · {row.jumlah}  ×</Text></TouchableOpacity>)}
          <FormSelect label="Pilih material" value={materialId} options={(materials.data?.data ?? []).map((m) => ({ label: m.nama, value: m.id }))} onSelect={setMaterialId} searchable />
          <FormField label="Jumlah material" value={materialQty} onChangeText={setMaterialQty} keyboardType="decimal-pad" />
          <Button title="Tambahkan material" variant="secondary" onPress={addMaterial} />
          <View style={styles.row}><Button title="Batal" variant="ghost" onPress={() => setFormOpen(false)} /><Button title="Simpan pekerjaan" loading={actions.addDetail.isPending || actions.updateDetail.isPending} onPress={saveDetail} /></View>
        </View>}

        {canEdit && !formOpen && <Button title="Kirim untuk persetujuan" disabled={details.length === 0} onPress={() => confirmAction('Kirim BKM Rawat?', 'Dokumen tidak dapat diubah setelah dikirim.', () => actions.update.mutateAsync({ id, data: { status: 'SUBMITTED' } }))} />}
        {canApprove && <View style={styles.actions}>
          <Button title="Setujui" onPress={() => confirmAction('Setujui BKM Rawat?', 'Persediaan material akan dikurangi.', () => actions.approve.mutateAsync(id))} />
          <Button title="Tolak" variant="danger" onPress={() => setRejectionOpen(true)} />
          {rejectionOpen && <View style={styles.card}>
            <FormField label="Alasan penolakan" value={rejectionNote} onChangeText={setRejectionNote} multiline />
            <View style={styles.row}>
              <Button title="Batal" variant="ghost" onPress={() => setRejectionOpen(false)} />
              <Button title="Kirim penolakan" variant="danger" disabled={!rejectionNote.trim()} loading={actions.reject.isPending} onPress={async () => {
                try {
                  await actions.reject.mutateAsync({ id, note: rejectionNote.trim() });
                  setRejectionOpen(false);
                  setRejectionNote('');
                } catch (error) { Alert.alert('Gagal', error instanceof Error ? error.message : 'Coba lagi.'); }
              }} />
            </View>
          </View>}
        </View>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  content: { padding: 16, paddingBottom: 100, gap: 14 },
  card: { backgroundColor: BrandColors.white, borderRadius: 10, padding: 16, gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary, flexShrink: 1 },
  section: { fontSize: 17, fontWeight: '600', color: BrandColors.textPrimary },
  meta: { fontSize: 14, color: BrandColors.textSecondary },
  actions: { gap: 10 },
});
