import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Button } from '@/components/core/Button';
import { useLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useQueryClient } from '@tanstack/react-query';
import { tphApi } from '@/services/tph.service';
import { geometryLabel } from '@/utils/plantation';
import type { Tph } from '@/types/master-data';

/** Separate from an operational row's GPS evidence; never writes implicitly. */
export function TphLocation({ tph }: { tph?: Tph }) {
  const { hasPermission, user } = useAuthStore();
  const online = useNetworkStore((state) => state.isOnline);
  const { captureLocation, loading, error } = useLocation();
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  if (!tph) return null;
  const canUpdate = hasPermission('mod_tph', 'update');

  const capture = async () => {
    if (!online || !canUpdate || saving || loading) return;
    const selected = tph;
    const ownerId = user?.id;
    const location = await captureLocation();
    if (!location) return;
    Alert.alert('Simpan lokasi master TPH?',
      `${selected.nama}: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}. Lokasi atau batas yang tersimpan akan diganti dengan titik ini. Ini bukan bukti GPS panen.`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Simpan', onPress: async () => {
          if (useAuthStore.getState().user?.id !== ownerId) return;
          setSaving(true);
          try {
            await tphApi.updateLocation(selected.id, location);
            await queryClient.invalidateQueries({ queryKey: ['tph'] });
            Alert.alert('Berhasil', 'Lokasi master TPH tersimpan.');
          } catch (e) {
            Alert.alert('Gagal menyimpan lokasi', e instanceof Error ? e.message : 'Coba lagi saat terhubung.');
          } finally { setSaving(false); }
        } },
      ]);
  };

  return <View style={styles.container}>
    <Text>Lokasi TPH: {geometryLabel(tph)}</Text>
    {tph.lahan && <Text>Lokasi lahan: {geometryLabel(tph.lahan)}</Text>}
    {error && <Text accessibilityRole="alert">{error}</Text>}
    {canUpdate && <>
      {!online && <Text>Terhubung ke internet untuk menyimpan lokasi master TPH.</Text>}
      <Button title="Simpan lokasi saat ini untuk TPH" variant="secondary"
        style={{ height: 'auto', minHeight: 48, padding: 8 }}
        onPress={capture} loading={loading || saving} disabled={!online || loading || saving} />
    </>}
  </View>;
}

const styles = StyleSheet.create({ container: { gap: 8, marginBottom: 16 } });
