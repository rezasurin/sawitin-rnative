import { Button } from '@/components/core/Button';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { buildTripPayload, tripProblems } from '@/utils/dispatch';
import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
  onSavingChange: (saving: boolean) => void;
}

/**
 * Review, then dispatch. The trip always goes through the queue, online or not:
 * the queue creates the header, adds every line and submits in that order, and a
 * conflict (SPB number taken, restan already collected) lands where the Mandor
 * can resolve it instead of leaving a half-built draft on the server.
 */
export function BKMCheckerFormStep3({ onBack, onSuccess, onSavingChange }: Props) {
  const { header, details } = useBkmCheckerStore();
  const policy = useOperationalPolicy('bkmChecker', 'DRAFT', details.length);
  const addToQueue = useSyncQueueStore((s) => s.addToQueue);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const problems = tripProblems(header, details);
  const totalJanjang = details.reduce((sum, d) => sum + d.jumlah_janjang, 0);
  const totalBrondol = details.reduce((sum, d) => sum + d.jumlah_brondol, 0);

  const handleSubmit = async () => {
    if (!confirmed || savingRef.current || !policy.create || problems.length) return;
    savingRef.current = true;
    setIsSaving(true);
    onSavingChange(true);
    try {
      await addToQueue({
        module: 'bkm_checker',
        action: 'CREATE',
        endpoint: '/bkmChecker',
        payload: buildTripPayload(header, details, policy.submit),
      });
      Alert.alert(policy.submit ? 'SPB Dikirim ke Antrian' : 'SPB Disimpan sebagai Draft',
        'Data tersimpan di perangkat dan dikirim otomatis saat ada sinyal. Jika ada konflik, periksa di menu Akun.');
      onSuccess();
    } catch (err) {
      Alert.alert('Gagal Menyimpan', err instanceof Error ? err.message : 'Data belum tersimpan. Silakan coba lagi.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      onSavingChange(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Ringkasan SPB</Text>
        <View style={styles.card}>
          <Row label="Nomor SPB" value={header.nomor_spb || '-'} />
          <Row label="Tanggal berangkat" value={header.tanggal} />
          <Row label="Truk" value={header.nomor_truk || '-'} />
          <Row label="Sopir" value={header.nama_sopir || '-'} />
          <Row label="Tujuan" value={header.tujuan_kirim || '-'} />
          {!!header.keterangan && <Row label="Keterangan" value={header.keterangan} />}
        </View>

        <Text style={styles.sectionTitle}>Total Muatan</Text>
        <View style={styles.card}>
          <Row label="TPH" value={String(details.length)} />
          <Row label="Janjang" value={String(totalJanjang)} />
          <Row label="Brondol" value={`${totalBrondol} kg`} />
        </View>

        <Text style={styles.sectionTitle}>Muatan per TPH</Text>
        {details.map((d) => (
          <View key={d._tempId} style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>{d.tph_nama} · {d.tipe_pengiriman === 'TITIP' ? 'Titip (restan)' : d.bkm_panen_client_request_id ? 'Langsung (Panen belum terkirim)' : 'Langsung'}</Text>
            <Text style={styles.detailCardValue}>
              Normal: {d.janjang_normal} | Mentah: {d.buah_mentah} | Over: {d.over_ripe} | T.Panjang: {d.tangkai_panjang}
            </Text>
            <Text style={styles.detailCardValue}>
              Abnormal: {d.buah_abnormal} | Kosong: {d.janjang_kosong} | Total: {d.jumlah_janjang} | Brondol (kg): {d.jumlah_brondol}
            </Text>
          </View>
        ))}

        {problems.length > 0 && (
          <View style={styles.warningCard}>
            {problems.map((problem) => <Text key={problem} style={styles.warningText}>{problem}</Text>)}
          </View>
        )}

        <TouchableOpacity style={styles.confirmRow} onPress={() => setConfirmed(!confirmed)} activeOpacity={0.7}>
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.confirmText}>Saya mengkonfirmasi data SPB sudah sesuai surat jalan kertas</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.navButtons}>
        <Button title="Edit Data" onPress={onBack} disabled={isSaving} variant="secondary" style={{ flex: 1 }} />
        <Button
          title={policy.submit ? 'Kirim SPB' : 'Simpan draft'}
          onPress={handleSubmit}
          disabled={isSaving || !confirmed || problems.length > 0}
          loading={isSaving}
          variant="primary"
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, backgroundColor: 'transparent' },
  label: { fontSize: 14, color: BrandColors.textSecondary },
  value: { fontSize: 14, fontWeight: '500', color: BrandColors.textPrimary, maxWidth: '60%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary, marginBottom: 12, marginTop: 16 },
  card: { backgroundColor: BrandColors.cardBg, borderRadius: 4, padding: 16 },
  detailCard: { backgroundColor: BrandColors.cardBg, borderRadius: 4, padding: 12, marginBottom: 8 },
  detailCardTitle: { fontSize: 14, fontWeight: '600', color: BrandColors.textPrimary },
  detailCardValue: { fontSize: 13, color: BrandColors.textSecondary, marginTop: 2 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 12, backgroundColor: BrandColors.cardBg, borderRadius: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: BrandColors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: BrandColors.primary, borderColor: BrandColors.primary },
  checkmark: { color: BrandColors.white, fontSize: 14, fontWeight: '700' },
  confirmText: { flex: 1, fontSize: 13, color: BrandColors.textSecondary },
  navButtons: {
    flexDirection: 'row', gap: 12, padding: 16, backgroundColor: BrandColors.background,
    borderTopWidth: 1, borderTopColor: BrandColors.inputBorder,
  },
  warningCard: { backgroundColor: '#FFF3E0', borderColor: '#E65100', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12, gap: 4 },
  warningText: { fontSize: 13, fontWeight: '600', color: BrandColors.textPrimary },
});
