import { FormDateField, FormField, FormSelect } from '@/components/form';
import { Button } from '@/components/core/Button';
import { BarcodeScanner } from '@/components/core/BarcodeScanner';
import { useFleetChoices } from '@/hooks/useFleetChoices';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

interface Props {
  onNext: () => void;
}

/** The SPB header: the paper SPB's number, the truck and driver, the destination and the day it leaves. */
export function BKMCheckerFormStep1({ onNext }: Props) {
  const { header, setHeader } = useBkmCheckerStore();
  const fleet = useFleetChoices();
  const [scanning, setScanning] = useState(false);
  const [typeVehicle, setTypeVehicle] = useState(false);
  const [typeDriver, setTypeDriver] = useState(false);
  // Typing is the fallback: with no fleet cached, or when "Ketik manual" is chosen.
  const manualVehicle = typeVehicle || !fleet.vehicles.length || (!header.kendaraan_id && !!header.nomor_truk);
  const manualDriver = typeDriver || !fleet.drivers.length || (!header.supir_id && !!header.nama_sopir);
  const isValid = !!header.nomor_spb.trim() && !!header.nomor_truk.trim() && !!header.nama_sopir.trim() && !!header.tanggal;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <FormField
        label="Nomor SPB"
        value={header.nomor_spb}
        onChangeText={(val) => setHeader({ nomor_spb: val })}
        placeholder="Nomor seri pada buku SPB"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Button title="Pindai barcode SPB" variant="secondary" onPress={() => setScanning(true)} style={styles.scan} />
      <BarcodeScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={(value) => { setHeader({ nomor_spb: value }); setScanning(false); }}
      />

      <FormDateField label="Tanggal Berangkat" value={header.tanggal} onChange={(val) => setHeader({ tanggal: val })} />

      <FormSelect label="Kendaraan" searchable
        value={typeVehicle ? '__manual__' : header.kendaraan_id}
        options={[...fleet.vehicles.map((row) => ({ label: row.nomor_kendaraan, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
        onSelect={(id) => {
          const row = fleet.vehicles.find((vehicle) => vehicle.id === id);
          setTypeVehicle(id === '__manual__');
          setHeader({ kendaraan_id: row?.id ?? '', nomor_truk: row?.nomor_kendaraan ?? (id === '__manual__' ? header.nomor_truk : '') });
        }} placeholder="Pilih kendaraan atau ketik manual" />
      {manualVehicle && <FormField label="Nomor Truk" value={header.nomor_truk}
        onChangeText={(val) => setHeader({ kendaraan_id: '', nomor_truk: val })} placeholder="B 1234 XY" />}

      <FormSelect label="Sopir" searchable
        value={typeDriver ? '__manual__' : header.supir_id}
        options={[...fleet.drivers.map((row) => ({ label: row.nama, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
        onSelect={(id) => {
          const row = fleet.drivers.find((driver) => driver.id === id);
          setTypeDriver(id === '__manual__');
          setHeader({ supir_id: row?.id ?? '', nama_sopir: row?.nama ?? (id === '__manual__' ? header.nama_sopir : '') });
        }} placeholder="Pilih sopir atau ketik manual" />
      {manualDriver && <FormField label="Nama Sopir" value={header.nama_sopir}
        onChangeText={(val) => setHeader({ supir_id: '', nama_sopir: val })} placeholder="Nama sopir" />}

      <FormField label="Tujuan Kirim" value={header.tujuan_kirim} onChangeText={(val) => setHeader({ tujuan_kirim: val })} placeholder="Nama PKS / tujuan" />
      <FormField label="Keterangan (Opsional)" value={header.keterangan} onChangeText={(val) => setHeader({ keterangan: val })}
        placeholder="Catatan tambahan" multiline numberOfLines={3} />

      <Button title="Lanjutkan ke Muatan TPH" disabled={!isValid} onPress={onNext} style={styles.nextButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 16 },
  scan: { marginBottom: 16 },
  nextButton: { marginTop: 24 },
});
