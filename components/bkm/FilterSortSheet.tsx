import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';
import { useQuery } from '@tanstack/react-query';
import { blokApi, lahanApi } from '@/services';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface FilterSortState {
  sort: string;
  status: string | null;
  blok_id: string | null;
  lahan_id: string | null;
}

interface FilterSortSheetProps {
  visible: boolean;
  onClose: () => void;
  initialState: FilterSortState;
  onApply: (state: FilterSortState) => void;
}

const SORT_OPTIONS = [
  { label: 'Terbaru', value: 'tanggal_laporan:desc' },
  { label: 'Terlama', value: 'tanggal_laporan:asc' },
  { label: 'Status (A-Z)', value: 'status:asc' },
];

const STATUS_OPTIONS = [
  { label: 'Semua', value: null },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function FilterSortSheet({
  visible,
  onClose,
  initialState,
  onApply,
}: FilterSortSheetProps) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<FilterSortState>(initialState);
  
  // Setup animated values
  const animatedValue = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const DISMISS_THRESHOLD = 120;

  // React to visibility changes
  React.useEffect(() => {
    if (visible) {
      setState(initialState); // Reset to current props when opening
      dragY.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      animatedValue.setValue(0);
    }
  }, [visible, initialState, animatedValue, dragY]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [animatedValue, dragY, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          dragY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.5) {
          Animated.timing(dragY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleClose();
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  // Fetch Master Data for Filters
  const { data: blokData } = useQuery({
    queryKey: ['blok', 'all'],
    queryFn: () => blokApi.getAll({ limit: 100 }),
    enabled: visible,
  });

  const { data: lahanData } = useQuery({
    queryKey: ['lahan', 'all'],
    queryFn: () => lahanApi.getAll({ limit: 200 }),
    enabled: visible,
  });

  const blokOptions = useMemo(() => {
    const opts = (blokData?.data ?? []).map(b => ({ label: b.nama, value: b.id }));
    return [{ label: 'Semua Blok', value: null }, ...opts];
  }, [blokData]);

  const lahanOptions = useMemo(() => {
    const filtered = lahanData?.data ?? [];
    const opts = filtered.map(l => ({ label: l.nama, value: l.id }));
    return [{ label: 'Semua Lahan', value: null }, ...opts];
  }, [lahanData]);

  const handleApply = () => {
    onApply(state);
    handleClose();
  };

  const handleReset = () => {
    setState({ sort: 'tanggal_laporan:desc', status: null, blok_id: null, lahan_id: null });
  };

  if (!visible && animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) as any === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
          },
        ]}
      >
        <Pressable style={styles.overlayTouchable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, 24),
            transform: [
              {
                translateY: Animated.add(
                  animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                  dragY
                ),
              },
            ],
          },
        ]}
      >
        <Animated.View {...panResponder.panHandlers} style={styles.handleBar}>
          <View style={styles.handleIndicator} />
        </Animated.View>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sort & Filter</Text>
          <TouchableOpacity onPress={handleReset} hitSlop={12}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Sorting */}
          <Text style={styles.sectionTitle}>Urutkan Berdasarkan</Text>
          <View style={styles.chipsContainer}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, state.sort === opt.value && styles.chipActive]}
                onPress={() => setState({ ...state, sort: opt.value })}
              >
                <Text style={[styles.chipText, state.sort === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filter Status */}
          <Text style={styles.sectionTitle}>Status Dokumen</Text>
          <View style={styles.chipsContainer}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.chip, state.status === opt.value && styles.chipActive]}
                onPress={() => setState({ ...state, status: opt.value })}
              >
                <Text style={[styles.chipText, state.status === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filter Blok */}
          <Text style={styles.sectionTitle}>Pilih Blok</Text>
          <View style={styles.chipsContainer}>
            {blokOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.chip, state.blok_id === opt.value && styles.chipActive]}
                onPress={() => setState({ ...state, blok_id: opt.value, lahan_id: null })}
              >
                <Text style={[styles.chipText, state.blok_id === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filter Lahan */}
          <Text style={styles.sectionTitle}>Pilih Lahan (opsional)</Text>
          <View style={styles.chipsContainer}>
            {lahanOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.chip, state.lahan_id === opt.value && styles.chipActive]}
                onPress={() => setState({ ...state, lahan_id: opt.value })}
              >
                <Text style={[styles.chipText, state.lahan_id === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.8}>
            <Text style={styles.applyButtonText}>Terapkan</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.inputBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '500',
    color: BrandColors.error,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    backgroundColor: BrandColors.white,
  },
  chipActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  chipText: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: BrandColors.white,
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.textMuted,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.inputBorder,
  },
  applyButton: {
    backgroundColor: BrandColors.button,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
