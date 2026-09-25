import React, { useState } from 'react';
import { memberLabel } from '@/utils/plantation';
import { OperationalActions } from '@/components/bkm/OperationalActions';
import { OperationalHistory } from '@/components/bkm/OperationalHistory';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { usePekerjaList } from '@/hooks/usePekerja';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from '@/components/Themed';
import { PageHeader } from '@/components/home';
import { Button } from '@/components/core/Button';
import { FormField, FormSelect } from '@/components/form';
import { DocStatusBadge } from '@/components/bkm/DocStatusBadge';
import { BrandColors } from '@/constants/Colors';
import { bkmRawatKeys, useBkmRawatActions, useBkmRawatDetail, useBkmRawatLookups } from '@/hooks/useBkmRawat';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { materialApi } from '@/services/material.service';
import type { BkmRawat, CreateDetailBkmRawatPayload, DetailBkmRawat, QueuedBkmRawatPayload } from '@/types/bkm-rawat';

type MaterialRow = { material_id: string; jumlah: number; dosis?: number; satuan_dosis?: string };

export default function RawatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isLocal = id.startsWith('local:');
  const queueId = isLocal ? id.slice('local:'.length) : '';
  const remote = useBkmRawatDetail(id);
  const actions = useBkmRawatActions();
  const lookups = useBkmRawatLookups();
  const canReadMaterial = useAuthStore((state) => state.hasPermission('mod_material', 'read'));
  const workers = usePekerjaList({ limit: 200 });
  const isOnline = useNetworkStore((state) => state.isOnline);
  const queue = useSyncQueueStore((state) => state.queue);
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const updateQueuePayload = useSyncQueueStore((state) => state.updatePayload);
  const removeFromQueue = useSyncQueueStore((state) => state.removeFromQueue);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DetailBkmRawat | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [typeId, setTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemId, setItemId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerCount, setWorkerCount] = useState('1');
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [area, setArea] = useState('');
  const [trees, setTrees] = useState('');
  const [method, setMethod] = useState('');
  const [condition, setCondition] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [materialDose, setMaterialDose] = useState('');
  const [materialDoseUnit, setMaterialDoseUnit] = useState('');
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const productDetail = useQuery({ queryKey: ['rawatProduct', materialId], queryFn: () => materialApi.getById(materialId), enabled: !!materialId && canReadMaterial });

  const localItem = isLocal ? queue.find((item) => item.id === queueId && item.module === 'bkm_rawat' && item.action === 'CREATE') : undefined;
  const localPayload = localItem?.payload as unknown as QueuedBkmRawatPayload | undefined;
  const localData: BkmRawat | undefined = localPayload ? {
    id,
    org_id: 'local',
    ...localPayload.header,
    lahan_id: localPayload.header.lahan_id ?? null,
    status: localPayload.submit ? 'SUBMITTED' : 'DRAFT',
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_note: null,
    created_at: new Date(localItem!.createdAt).toISOString(),
    created_by: 'local',
    modified_at: new Date(localItem!.createdAt).toISOString(),
    modified_by: null,
    kelompok_lahan: { id: localPayload.header.kelompok_lahan_id, nama: localPayload.display?.kelompok_lahan_nama ?? localPayload.header.kelompok_lahan_id } as BkmRawat['kelompok_lahan'],
    blok: { id: localPayload.header.blok_id, nama: localPayload.display?.blok_nama ?? localPayload.header.blok_id } as BkmRawat['blok'],
    lahan: localPayload.header.lahan_id ? { id: localPayload.header.lahan_id, nama: localPayload.display?.lahan_nama ?? localPayload.header.lahan_id } as BkmRawat['lahan'] : undefined,
    detail_rawat: localPayload.details.map((detail, index) => ({
      ...detail,
      id: detail.client_detail_id ?? `${queueId}:${index}`,
      bkm_rawat_id: id,
      pekerja_id: detail.pekerja_id ?? null,
      satuan_hasil: detail.satuan_hasil ?? null,
      hasil_pekerjaan: detail.hasil_pekerjaan ?? null,
      luas_ha: detail.luas_ha ?? null,
      jumlah_pokok: detail.jumlah_pokok ?? null,
      metode: detail.metode ?? null,
      kondisi: detail.kondisi ?? null,
      keterangan: detail.keterangan ?? null,
      created_at: new Date(localItem!.createdAt).toISOString(),
      created_by: 'local',
      modified_at: new Date(localItem!.createdAt).toISOString(),
      modified_by: null,
      materials: (detail.materials ?? []).map((material) => ({
        ...material,
        dosis: material.dosis ?? null,
        satuan_dosis: material.satuan_dosis ?? null,
        id: `${detail.client_detail_id ?? index}:${material.material_id}`,
        detail_bkm_rawat_id: detail.client_detail_id ?? `${queueId}:${index}`,
        created_at: new Date(localItem!.createdAt).toISOString(),
        created_by: 'local',
        modified_at: new Date(localItem!.createdAt).toISOString(),
        modified_by: null,
      })),
    })),
  } : undefined;
  const data = isLocal ? localData : remote.data;

  const policy = useOperationalPolicy('bkmRawat', data?.status, (data?.detail_rawat ?? data?.details ?? []).length);
  const canEdit = policy.edit;
  const canAdd = policy.addDetail;
  const canDeleteDetail = policy.deleteDetail;

  const openForm = (detail?: DetailBkmRawat) => {
    setEditing(detail ?? null);
    setTypeId(detail?.tipe_pekerjaan_id ?? '');
    setCategoryId(detail?.kategori_pekerjaan_id ?? '');
    setItemId(detail?.item_pekerjaan_id ?? '');
    setWorkerName(detail?.nama_pekerja ?? '');
    setWorkerId(detail?.pekerja_id ?? '');
    setWorkerCount(String(detail?.jumlah_pekerja ?? 1));
    setResult(detail?.hasil_pekerjaan == null ? '' : String(detail.hasil_pekerjaan));
    setUnit(detail?.satuan_hasil ?? '');
    setNote(detail?.keterangan ?? '');
    setArea(detail?.luas_ha == null ? '' : String(detail.luas_ha));
    setTrees(detail?.jumlah_pokok == null ? '' : String(detail.jumlah_pokok));
    setMethod(detail?.metode ?? '');
    setCondition(detail?.kondisi ?? '');
    setMaterialRows(detail?.materials?.map((m) => ({ material_id: m.material_id, jumlah: Number(m.jumlah), dosis: m.dosis == null ? undefined : Number(m.dosis), satuan_dosis: m.satuan_dosis ?? undefined })) ?? []);
    setMaterialId('');
    setMaterialQty('');
    setMaterialDose('');
    setMaterialDoseUnit('');
    setFormOpen(true);
  };

  const saveDetail = async () => {
    if (editing ? !policy.edit : !policy.addDetail) return;
    const count = Number(workerCount);
    const output = result.trim() ? Number(result) : undefined;
    const treatedArea = area.trim() ? Number(area) : undefined;
    const treeCount = trees.trim() ? Number(trees) : undefined;
    if (!typeId || !categoryId || !itemId || !workerName.trim() || !Number.isInteger(count) || count < 1 || (output !== undefined && (!Number.isFinite(output) || output < 0))) {
      Alert.alert('Data belum lengkap', 'Isi jenis pekerjaan, kategori, item, nama pekerja, dan jumlah pekerja yang valid.');
      return;
    }
    if ((treatedArea !== undefined && (!Number.isFinite(treatedArea) || treatedArea <= 0)) || (treeCount !== undefined && (!Number.isInteger(treeCount) || treeCount <= 0)) || method.trim().length > 100 || condition.trim().length > 255) {
      Alert.alert('Agronomi tidak valid', 'Luas dan jumlah pokok harus lebih dari nol; periksa panjang metode dan kondisi.');
      return;
    }
    try {
      const clientDetailId = editing?.id ?? `rawat_detail_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const payload = {
        client_detail_id: clientDetailId,
        tipe_pekerjaan_id: typeId,
        kategori_pekerjaan_id: categoryId,
        item_pekerjaan_id: itemId,
        pekerja_id: workerId || undefined,
        nama_pekerja: workerName.trim(),
        jumlah_pekerja: count,
        hasil_pekerjaan: output,
        luas_ha: treatedArea,
        jumlah_pokok: treeCount,
        metode: method.trim() || undefined,
        kondisi: condition.trim() || undefined,
        satuan_hasil: unit.trim() || undefined,
        keterangan: note.trim() || undefined,
        materials: materialRows,
      };
      if (isLocal && localPayload) {
        const nextDetails = editing
          ? localPayload.details.map((detail) => detail.client_detail_id === editing.id ? payload : detail)
          : [...localPayload.details, payload];
        await updateQueuePayload(queueId, { ...localPayload, details: nextDetails });
      } else if (!isOnline) {
        const pendingCreate = editing ? queue.find((item) => {
          if (item.module !== 'bkm_rawat_detail' || item.action !== 'CREATE') return false;
          const queued = item.payload as unknown as CreateDetailBkmRawatPayload;
          return queued.bkm_rawat_id === id && queued.client_detail_id === editing.id;
        }) : undefined;
        if (pendingCreate) {
          await updateQueuePayload(pendingCreate.id, { bkm_rawat_id: id, ...payload });
        } else if (editing) {
          await addToQueue({ module: 'bkm_rawat_detail', action: 'UPDATE', endpoint: `/bkmRawat/detail/${editing.id}`, payload: { id: editing.id, data: payload, documentId: id, expectedStatus: data?.status } });
        } else {
          await addToQueue({ module: 'bkm_rawat_detail', action: 'CREATE', endpoint: '/bkmRawat/detail', payload: { bkm_rawat_id: id, ...payload, documentId: id, expectedStatus: data?.status } });
        }
        queryClient.setQueryData<BkmRawat>(bkmRawatKeys.detail(id), (current) => {
          if (!current) return current;
          const currentDetails = current.detail_rawat ?? current.details ?? [];
          const optimistic = {
            ...payload,
            id: clientDetailId,
            bkm_rawat_id: id,
            pekerja_id: payload.pekerja_id ?? null,
            satuan_hasil: payload.satuan_hasil ?? null,
            hasil_pekerjaan: payload.hasil_pekerjaan ?? null,
            luas_ha: payload.luas_ha ?? null,
            jumlah_pokok: payload.jumlah_pokok ?? null,
            metode: payload.metode ?? null,
            kondisi: payload.kondisi ?? null,
            keterangan: payload.keterangan ?? null,
            created_at: new Date().toISOString(), created_by: 'offline', modified_at: new Date().toISOString(), modified_by: null,
            materials: payload.materials.map((material) => ({ ...material, dosis: material.dosis ?? null, satuan_dosis: material.satuan_dosis ?? null, id: `${clientDetailId}:${material.material_id}`, detail_bkm_rawat_id: clientDetailId, created_at: new Date().toISOString(), created_by: 'offline', modified_at: new Date().toISOString(), modified_by: null })),
          } as DetailBkmRawat;
          const nextDetails = editing ? currentDetails.map((detail) => detail.id === editing.id ? { ...detail, ...optimistic, id: editing.id } : detail) : [...currentDetails, optimistic];
          return { ...current, detail_rawat: nextDetails };
        });
      } else if (editing) await actions.updateDetail.mutateAsync({ id: editing.id, data: payload });
      else await actions.addDetail.mutateAsync({ bkm_rawat_id: id, ...payload });
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  const deleteDetail = async (detail: DetailBkmRawat) => {
    if (!policy.deleteDetail) return;
    if (isLocal && localPayload) {
      await updateQueuePayload(queueId, { ...localPayload, details: localPayload.details.filter((row) => row.client_detail_id !== detail.id) });
      return;
    }
    if (!isOnline) {
      const pendingCreate = queue.find((item) => {
        if (item.module !== 'bkm_rawat_detail' || item.action !== 'CREATE') return false;
        const queued = item.payload as unknown as CreateDetailBkmRawatPayload;
        return queued.bkm_rawat_id === id && queued.client_detail_id === detail.id;
      });
      if (pendingCreate) {
        await removeFromQueue(pendingCreate.id);
        queryClient.setQueryData<BkmRawat>(bkmRawatKeys.detail(id), (current) => current ? {
          ...current,
          detail_rawat: (current.detail_rawat ?? current.details ?? []).filter((row) => row.id !== detail.id),
        } : current);
        return;
      }
      await addToQueue({ module: 'bkm_rawat_detail', action: 'DELETE', endpoint: `/bkmRawat/detail/${detail.id}`, payload: { id: detail.id, documentId: id, expectedStatus: data?.status } });
      queryClient.setQueryData<BkmRawat>(bkmRawatKeys.detail(id), (current) => current ? {
        ...current,
        detail_rawat: (current.detail_rawat ?? current.details ?? []).filter((row) => row.id !== detail.id),
      } : current);
      return;
    }
    await actions.deleteDetail.mutateAsync(detail.id);
  };

  const submitDocument = async () => {
    if (!policy.submit) return;
    if (isLocal && localPayload) {
      await updateQueuePayload(queueId, { ...localPayload, submit: true });
      return;
    }
    if (!isOnline) {
      await addToQueue({ module: 'bkm_rawat', action: 'UPDATE', endpoint: `/bkmRawat/${id}`, payload: { id, data: { status: 'SUBMITTED' } } });
      queryClient.setQueryData<BkmRawat>(bkmRawatKeys.detail(id), (current) => current ? { ...current, status: 'SUBMITTED' } : current);
      return;
    }
    await actions.update.mutateAsync({ id, data: { status: 'SUBMITTED' } });
  };

  const addMaterial = () => {
    const quantity = Number(materialQty);
    const dose = materialDose.trim() ? Number(materialDose) : undefined;
    if (!materialId || !Number.isFinite(quantity) || quantity <= 0 || (dose !== undefined && (!Number.isFinite(dose) || dose <= 0)) || materialDoseUnit.trim().length > 50) {
      Alert.alert('Material belum lengkap', 'Pilih material, isi jumlah lebih dari nol, dan periksa dosis serta satuannya.');
      return;
    }
    setMaterialRows((rows) => [...rows.filter((m) => m.material_id !== materialId), { material_id: materialId, jumlah: quantity, dosis: dose, satuan_dosis: materialDoseUnit.trim() || undefined }]);
    setMaterialId('');
    setMaterialQty('');
    setMaterialDose('');
    setMaterialDoseUnit('');
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

  if (!isLocal && remote.isLoading) return <View style={styles.center}><ActivityIndicator color={BrandColors.primary} /></View>;
  if ((!isLocal && remote.isError) || !data) return <ScrollView contentContainerStyle={styles.content}><PageHeader title="BKM Rawat" showBackButton onBack={() => router.back()} /><Text>{isLocal ? 'Draft offline tidak lagi tersedia.' : 'Dokumen tidak tersedia.'}</Text>{!isLocal && <><Button title="Coba lagi" onPress={() => remote.refetch()} /><OperationalHistory module="bkmRawat" id={id} /></>}</ScrollView>;

  const details = data.detail_rawat ?? data.details ?? [];
  const materialNames = new Map((lookups.data?.materials ?? []).map((material) => [material.id, material.nama]));
  const selectedProduct = productDetail.data ?? lookups.data?.materials.find((material) => material.id === materialId);
  const workerOptions = (workers.data?.data ?? []).map((worker) => ({
    label: memberLabel(worker.member, worker.id),
    value: worker.id,
  }));
  if (workerId && !workerOptions.some((worker) => worker.value === workerId)) {
    workerOptions.unshift({ label: editing?.nama_pekerja ?? workerId, value: workerId });
  }
  if (!editing?.pekerja_id) workerOptions.unshift({ label: 'Tanpa pekerja terdaftar', value: '' });
  const itemOptions = (lookups.data?.items ?? []).filter((item) => item.kategori_pekerjaan_id === categoryId).map((item) => ({ label: item.nama, value: item.id }));

  return (
    <View style={styles.container}>
      <PageHeader title="Detail BKM Rawat" showBackButton onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {(isLocal || !isOnline) && <View style={styles.offlineBanner}><Text style={styles.offlineText}>{isLocal ? 'Draft offline · perubahan tersimpan di perangkat' : 'Offline · perubahan akan dikirim saat tersambung'}</Text></View>}
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
            <Text style={styles.meta}>{memberLabel(detail.pekerja?.member, detail.nama_pekerja)} · {detail.jumlah_pekerja} pekerja</Text>
            <Text style={styles.meta}>{detail.tipe_pekerjaan?.nama ?? detail.tipe_pekerjaan_id} · {detail.kategori_pekerjaan?.nama ?? detail.kategori_pekerjaan_id}</Text>
            {detail.hasil_pekerjaan != null && <Text style={styles.meta}>Hasil: {detail.hasil_pekerjaan} {detail.satuan_hasil ?? ''}</Text>}
            {detail.luas_ha != null && <Text style={styles.meta}>Luas dirawat: {detail.luas_ha} ha</Text>}
            {detail.jumlah_pokok != null && <Text style={styles.meta}>Pokok dirawat: {detail.jumlah_pokok}</Text>}
            {detail.metode && <Text style={styles.meta}>Metode: {detail.metode}</Text>}
            {detail.kondisi && <Text style={styles.meta}>Kondisi: {detail.kondisi}</Text>}
            {detail.keterangan && <Text style={styles.meta}>{detail.keterangan}</Text>}
            {(detail.materials ?? []).map((material) => <Text key={material.id} style={styles.meta}>Material: {material.material?.nama ?? materialNames.get(material.material_id) ?? material.material_id} · {material.jumlah}{material.dosis != null ? ` · dosis ${material.dosis} ${material.satuan_dosis ?? ''}` : ''}</Text>)}
            {(canEdit || canDeleteDetail) && <View style={styles.row}>
              {canEdit && <Button title="Ubah" variant="secondary" size="sm" onPress={() => openForm(detail)} />}
              {canDeleteDetail && <Button title="Hapus" variant="danger" size="sm" onPress={() => confirmAction('Hapus pekerjaan?', 'Detail dan materialnya akan dihapus.', () => deleteDetail(detail))} />}
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
          <FormSelect label="Pekerja terdaftar (opsional)" value={workerId} options={workerOptions} onSelect={(value) => {
            if (!value && workerId) setWorkerName('');
            setWorkerId(value);
            const selected = workers.data?.data?.find((worker) => worker.id === value);
            if (selected?.member?.nama) setWorkerName(selected.member.nama);
          }} searchable disabled={workerOptions.length === 0 || workerOptions.length === 1 && !workerOptions[0].value} />
          <FormField label="Nama pekerja / kelompok" value={workerName} onChangeText={setWorkerName} />
          <FormField label="Jumlah pekerja" value={workerCount} onChangeText={setWorkerCount} keyboardType="number-pad" />
          <FormField label="Hasil pekerjaan" value={result} onChangeText={setResult} keyboardType="decimal-pad" />
          <FormField label="Satuan hasil" value={unit} onChangeText={setUnit} />
          <FormField label="Keterangan" value={note} onChangeText={setNote} />
          <Text style={styles.section}>Agronomi (opsional)</Text>
          <FormField label="Luas dirawat (ha)" value={area} onChangeText={setArea} keyboardType="decimal-pad" />
          <FormField label="Jumlah pokok dirawat" value={trees} onChangeText={setTrees} keyboardType="number-pad" />
          <FormField label="Metode" value={method} onChangeText={setMethod} />
          <FormField label="Kondisi lapangan" value={condition} onChangeText={setCondition} />
          <Text style={styles.section}>Material</Text>
          {materialRows.map((row) => <TouchableOpacity key={row.material_id} onPress={() => setMaterialRows((rows) => rows.filter((m) => m.material_id !== row.material_id))}><Text style={styles.meta}>{materialNames.get(row.material_id) ?? row.material_id} · {row.jumlah}{row.dosis != null ? ` · dosis ${row.dosis} ${row.satuan_dosis ?? ''}` : ''}  ×</Text></TouchableOpacity>)}
          <FormSelect label="Pilih material" value={materialId} options={(lookups.data?.materials ?? []).map((material) => ({ label: material.nama, value: material.id }))} onSelect={setMaterialId} searchable />
          {materialId && (selectedProduct?.bahan_aktif || selectedProduct?.konsentrasi) && <Text style={styles.meta}>Bahan aktif: {selectedProduct.bahan_aktif ?? '—'} · Konsentrasi: {selectedProduct.konsentrasi ?? '—'}</Text>}
          <FormField label="Jumlah material" value={materialQty} onChangeText={setMaterialQty} keyboardType="decimal-pad" />
          <FormField label="Dosis (opsional)" value={materialDose} onChangeText={setMaterialDose} keyboardType="decimal-pad" />
          <FormField label="Satuan dosis" value={materialDoseUnit} onChangeText={setMaterialDoseUnit} />
          <Button title="Tambahkan material" variant="secondary" onPress={addMaterial} />
          <View style={styles.row}><Button title="Batal" variant="ghost" onPress={() => setFormOpen(false)} /><Button title="Simpan pekerjaan" loading={actions.addDetail.isPending || actions.updateDetail.isPending} onPress={saveDetail} /></View>
        </View>}

        {isLocal && policy.submit && !formOpen && <Button title="Kirim untuk persetujuan" disabled={details.length === 0} onPress={() => confirmAction('Kirim BKM Rawat?', 'Dokumen tidak dapat diubah setelah dikirim.', submitDocument)} />}
        <OperationalActions module="bkmRawat" document={data} />
        <OperationalHistory module="bkmRawat" id={id} />
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
  offlineBanner: { backgroundColor: '#FFF4D6', borderRadius: 8, padding: 12 },
  offlineText: { color: '#725300', fontSize: 13, fontWeight: '600' },
});
