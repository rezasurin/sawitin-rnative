import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerDetail } from '@/hooks/useBkmChecker';
import type { DocumentStatus } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View as RNView,
} from 'react-native';

const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; label: string }> = {
  DRAFT: { color: BrandColors.textMuted, bg: '#F0F0F0', label: 'Draft' },
  SUBMITTED: { color: '#2196F3', bg: '#E3F2FD', label: 'Submitted' },
  APPROVED: { color: BrandColors.success, bg: '#E8F5E9', label: 'Approved' },
  REVISION_REQUESTED: { color: BrandColors.error, bg: '#FFEBEE', label: 'Revisi' },
  CANCELLED: { color: '#9E9E9E', bg: '#F5F5F5', label: 'Cancelled' },
};

export default function CheckerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: checker, isLoading, isError } = useBkmCheckerDetail(id);

  const BackButton = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <FontAwesome name="arrow-left" size={20} color={BrandColors.white} />
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM Checker" showMenuButton={false} actionBtn={BackButton} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !checker) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM Checker" showMenuButton={false} actionBtn={BackButton} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={BrandColors.error} />
          <Text style={styles.errorText}>Gagal memuat data</Text>
        </View>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[checker.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <View style={styles.container}>
      <PageHeader title="Detail BKM Checker" showMenuButton={false} actionBtn={BackButton} />
      
      <View style={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{checker.blok?.nama ?? checker.blok_id}</Text>
            <View style={[statusStyles.badge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[statusStyles.text, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>
          <Text style={styles.date}>{checker.tanggal_laporan}</Text>
          {checker.lahan?.nama && (
            <Text style={styles.meta}>Lahan: {checker.lahan.nama}</Text>
          )}
          {checker.keterangan && (
            <Text style={styles.keterangan}>{checker.keterangan}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Detail Truck</Text>
        
        {checker.details && checker.details.length > 0 ? (
          checker.details.map((detail, index) => (
            <View key={detail.id} style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Ionicons name="car" size={16} color={BrandColors.primary} />
                <Text style={styles.detailLabel}>Nomor Truck:</Text>
                <Text style={styles.detailValue}>{detail.nomor_truk ?? '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="person" size={16} color={BrandColors.primary} />
                <Text style={styles.detailLabel}>Driver:</Text>
                <Text style={styles.detailValue}>{detail.nama_sopir ?? '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="send" size={16} color={BrandColors.primary} />
                <Text style={styles.detailLabel}>Tipe Pengiriman:</Text>
                <Text style={styles.detailValue}>{detail.tipe_pengiriman}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="flag" size={16} color={BrandColors.primary} />
                <Text style={styles.detailLabel}>Tujuan:</Text>
                <Text style={styles.detailValue}>{detail.tujuan_kirim ?? '-'}</Text>
              </View>
              
              <View style={styles.divider} />
              
              <Text style={styles.gradingTitle}>Grading</Text>
              <View style={styles.gradingGrid}>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Janjang Normal</Text>
                  <Text style={styles.gradingValue}>{detail.janjang_normal}</Text>
                </View>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Brondol</Text>
                  <Text style={styles.gradingValue}>{detail.jumlah_brondol}</Text>
                </View>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Buah Mentah</Text>
                  <Text style={styles.gradingValue}>{detail.buah_mentah}</Text>
                </View>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Over Ripe</Text>
                  <Text style={styles.gradingValue}>{detail.over_ripe}</Text>
                </View>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Tangkai Panjang</Text>
                  <Text style={styles.gradingValue}>{detail.tangkai_panjang}</Text>
                </View>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Buah Abnormal</Text>
                  <Text style={styles.gradingValue}>{detail.buah_abnormal}</Text>
                </View>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Janjang Kosong</Text>
                  <Text style={styles.gradingValue}>{detail.janjang_kosong}</Text>
                </View>
                <View style={styles.gradingItem}>
                  <Text style={styles.gradingLabel}>Total Janjang</Text>
                  <Text style={styles.gradingValue}>{detail.jumlah_janjang}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyDetails}>
            <Text style={styles.emptyText}>Tidak ada detail truck</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: BrandColors.error,
    fontSize: 15,
    marginTop: 12,
  },
  headerCard: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  date: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  meta: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 4,
  },
  keterangan: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: BrandColors.inputBorder,
    marginVertical: 12,
  },
  gradingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  gradingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gradingItem: {
    width: '50%',
    marginBottom: 8,
  },
  gradingLabel: {
    fontSize: 11,
    color: BrandColors.textMuted,
  },
  gradingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  emptyDetails: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: BrandColors.textMuted,
    fontSize: 14,
  },
});

const statusStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});