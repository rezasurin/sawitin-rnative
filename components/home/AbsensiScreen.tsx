import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { PageHeader } from '@/components/home';
import { useLocation } from '@/hooks/useLocation';
import { useBlokList } from '@/hooks/useBlok';
import { useAuthStore } from '@/stores/useAuthStore';
import { attendanceDb } from '@/services/database';
import { getDistance, Coordinate } from '@/utils/geofencing';
import { ConfirmModal } from '@/components/core/ConfirmModal';

// Mock center coordinates for estate blocks (for geofencing demonstration)
// Centered roughly near central Sumatra palm plantations, or will fallback dynamically
const MOCK_BLOCK_COORDINATES: Record<string, Coordinate> = {
  'default': { latitude: -0.789275, longitude: 113.921327 }, // Central Indonesia
};

export function AbsensiScreen() {
  const { user } = useAuthStore();
  const { location, loading: locationLoading, error: locationError, captureLocation } = useLocation();
  const { data: blocksData, isLoading: blocksLoading } = useBlokList({ limit: 100 });
  
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedBlockName, setSelectedBlockName] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [geofenceWarnVisible, setGeofenceWarnVisible] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<any>(null);
  const [warnNote, setWarnNote] = useState('');

  const userCode = user?.username || 'pekerja';

  // Load attendance history from local SQLite database
  const loadHistory = useCallback(async () => {
    try {
      const history = await attendanceDb.getAll(userCode);
      setAttendanceHistory(history);
    } catch (err) {
      console.warn('Failed to load attendance history:', err);
    }
  }, [userCode]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // Initialize selected block from the loaded block list
  useEffect(() => {
    if (blocksData?.data && blocksData.data.length > 0 && !selectedBlockId) {
      setSelectedBlockId(blocksData.data[0].id);
      setSelectedBlockName(blocksData.data[0].nama);
    }
  }, [blocksData, selectedBlockId]);

  const handleBlockChange = (blockId: string) => {
    setSelectedBlockId(blockId);
    const block = blocksData?.data.find((b) => b.id === blockId);
    if (block) {
      setSelectedBlockName(block.nama);
    }
  };

  const executeClockIn = async (record: any) => {
    setIsSubmitting(true);
    try {
      await attendanceDb.saveRecord(record);
      Alert.alert('Sukses', 'Absensi masuk berhasil dicatat!');
      loadHistory();
      setPendingRecord(null);
      setGeofenceWarnVisible(false);
      setWarnNote('');
    } catch (err) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan absensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedBlockId) {
      Alert.alert('Validasi', 'Silakan pilih blok lokasi kerja terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    // 1. Capture current location
    const coords = await captureLocation();
    
    if (!coords) {
      setIsSubmitting(false);
      Alert.alert(
        'GPS Gagal',
        locationError || 'Gagal mendeteksi lokasi GPS Anda. Pastikan GPS aktif dan izin diberikan.'
      );
      return;
    }

    // 2. Perform Geofencing Verification
    // Get block target coordinate (or default to current location if none defined)
    const blockCoords = MOCK_BLOCK_COORDINATES[selectedBlockId] || {
      latitude: coords.latitude + 0.0015, // Mock a slight offset (approx 160m away) to demonstrate geofence warning
      longitude: coords.longitude + 0.0012,
    };

    const distance = getDistance(coords, blockCoords);
    const isWithinGeofence = distance <= 100; // 100 meters margin

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const newRecord = {
      id: `att_${Date.now()}`,
      user_code: userCode,
      date: dateStr,
      time: timeStr,
      latitude: coords.latitude,
      longitude: coords.longitude,
      block_id: selectedBlockId,
      block_name: selectedBlockName,
      status: isWithinGeofence ? 'SUCCESS' : 'WARNING_OUTSIDE',
      note: null,
    };

    if (!isWithinGeofence) {
      // Prompt verification warning box (modal) if outside block margins
      setPendingRecord(newRecord);
      setGeofenceWarnVisible(true);
      setIsSubmitting(false);
    } else {
      // Success check-in directly
      await executeClockIn(newRecord);
    }
  };

  const handleConfirmWithNote = (note?: string) => {
    if (pendingRecord) {
      const updatedRecord = {
        ...pendingRecord,
        note: note || warnNote || 'Melakukan absen di luar wilayah geofence blok.',
      };
      executeClockIn(updatedRecord);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Absensi Mandiri" showMenuButton={false} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <FontAwesome name="user-circle" size={44} color={BrandColors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.member?.nama || 'Pengguna Sawitin'}</Text>
            <Text style={styles.userRole}>NIK: {user?.username || '-'}</Text>
          </View>
        </View>

        {/* Attendance Action Box */}
        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>Pencatatan Kehadiran</Text>
          <Text style={styles.cardSubtitle}>
            Pilih lokasi blok kerja Anda hari ini sebelum melakukan Clock In
          </Text>

          {/* Block Selection Selector */}
          <Text style={styles.label}>Pilih Blok Kerja</Text>
          {blocksLoading ? (
            <ActivityIndicator size="small" color={BrandColors.primary} style={styles.loader} />
          ) : (
            <View style={styles.pickerContainer}>
              {blocksData?.data && blocksData.data.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blockScroll}>
                  {blocksData.data.map((b) => (
                    <Pressable
                      key={b.id}
                      style={[
                        styles.blockItem,
                        selectedBlockId === b.id && styles.blockItemActive,
                      ]}
                      onPress={() => handleBlockChange(b.id)}
                    >
                      <FontAwesome
                        name="map-marker"
                        size={14}
                        color={selectedBlockId === b.id ? BrandColors.white : BrandColors.primary}
                      />
                      <Text style={[
                        styles.blockItemText,
                        selectedBlockId === b.id && styles.blockItemTextActive,
                      ]}>
                        {b.nama}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>Tidak ada data blok perkebunan</Text>
              )}
            </View>
          )}

          {/* Big Clock In Button */}
          <View style={styles.clockBtnContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.clockBtn,
                pressed && styles.clockBtnPressed,
                (isSubmitting || locationLoading) && styles.clockBtnDisabled,
              ]}
              onPress={handleClockIn}
              disabled={isSubmitting || locationLoading}
            >
              {isSubmitting || locationLoading ? (
                <ActivityIndicator color={BrandColors.white} size="large" />
              ) : (
                <>
                  <Ionicons name="finger-print" size={54} color={BrandColors.white} />
                  <Text style={styles.clockBtnText}>CLOCK IN</Text>
                </>
              )}
            </Pressable>
          </View>

          {location && (
            <Text style={styles.coordsText}>
              Koordinat GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        {/* History List */}
        <Text style={styles.sectionTitle}>Histori Absensi Harian</Text>
        {attendanceHistory.length > 0 ? (
          attendanceHistory.map((h) => {
            const isOutside = h.status === 'WARNING_OUTSIDE';
            return (
              <View key={h.id} style={styles.historyCard}>
                <View style={styles.historyDateBox}>
                  <Text style={styles.historyTime}>{h.time}</Text>
                  <Text style={styles.historyDate}>{h.date}</Text>
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyBlock}>Blok: {h.block_name || 'Blok Kebun'}</Text>
                  {h.latitude && (
                    <Text style={styles.historyCoords}>
                      GPS: {h.latitude.toFixed(5)}, {h.longitude.toFixed(5)}
                    </Text>
                  )}
                  {h.note && <Text style={styles.historyNote}>Catatan: "{h.note}"</Text>}
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isOutside ? '#FFF3E0' : '#E8F5E9' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: isOutside ? '#E65100' : '#2E7D32' }
                  ]}>
                    {isOutside ? 'Luar Blok' : 'Sesuai'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyHistory}>
            <FontAwesome name="calendar-o" size={32} color={BrandColors.textMuted} />
            <Text style={styles.emptyHistoryText}>Belum ada riwayat absensi masuk</Text>
          </View>
        )}
      </ScrollView>

      {/* Geofence Alert Modal */}
      <ConfirmModal
        visible={geofenceWarnVisible}
        title="⚠️ Peringatan Geofencing"
        message={`Lokasi GPS Anda terdeteksi berada di luar koordinat Blok ${selectedBlockName}.\n\nJika tetap ingin melakukan absensi, silakan tulis catatan alasan kehadiran (misal: Sinyal buruk, Rapat pagi di pos, dll.) dan tekan Kirim.`}
        confirmText="Kirim Absen"
        cancelText="Batal"
        showInput
        inputPlaceholder="Masukkan alasan absensi luar blok..."
        onConfirm={handleConfirmWithNote}
        onCancel={() => {
          setGeofenceWarnVisible(false);
          setPendingRecord(null);
          setWarnNote('');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FBF7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEFE6',
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  userRole: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDEDED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  loader: {
    marginVertical: 12,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  blockScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  blockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F4EB',
    borderWidth: 1,
    borderColor: '#E1E7D9',
  },
  blockItemActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  blockItemText: {
    fontSize: 13,
    color: BrandColors.textPrimary,
    fontWeight: '500',
  },
  blockItemTextActive: {
    color: BrandColors.white,
    fontWeight: '600',
  },
  clockBtnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  clockBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#E1E8D9',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  clockBtnPressed: {
    backgroundColor: BrandColors.primaryDark,
    borderColor: '#D4DEC9',
  },
  clockBtnDisabled: {
    opacity: 0.6,
  },
  clockBtnText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
  },
  coordsText: {
    fontSize: 11,
    color: BrandColors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDEDED',
    marginBottom: 10,
  },
  historyDateBox: {
    borderRightWidth: 1,
    borderRightColor: '#EBEBEB',
    paddingRight: 12,
    alignItems: 'center',
    width: 65,
  },
  historyTime: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  historyDate: {
    fontSize: 10,
    color: BrandColors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  historyContent: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 6,
  },
  historyBlock: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  historyCoords: {
    fontSize: 11,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  historyNote: {
    fontSize: 11,
    color: '#D84315',
    fontStyle: 'italic',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.textMuted,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FDFDFD',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 10,
  },
});
