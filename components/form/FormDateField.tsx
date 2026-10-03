import React, { useCallback, useState, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  type ViewStyle,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/Colors';

interface FormDateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function FormDateField({
  label,
  value,
  onChange,
  placeholder = 'Pilih Tanggal',
  error,
  containerStyle,
}: FormDateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(0)).current;

  const displayDate = formatDisplay(value);
  const currentDate = value ? new Date(value) : new Date();

  const handleOpen = () => {
    setTempDate(currentDate);
    setShowPicker(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
        if (event.type === 'set' && selectedDate) {
          onChange(formatDate(selectedDate));
        }
      } else {
        if (selectedDate) {
          setTempDate(selectedDate);
        }
      }
    },
    [onChange],
  );

  const handleConfirm = () => {
    onChange(formatDate(tempDate));
    closeModal();
  };

  const handleCancel = () => {
    closeModal();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowPicker(false);
    });
  };

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.label}>{label}</Text>

        <TouchableOpacity
          style={[styles.trigger, error && styles.triggerError]}
          onPress={handleOpen}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Membuka pemilih tanggal"
          accessibilityState={{ expanded: showPicker }}
        >
          <Text style={[styles.triggerText, !value && styles.placeholder]}>
            {displayDate || placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={BrandColors.textMuted} />
        </TouchableOpacity>
        {error ? (
          <View
            style={styles.errorContainer}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Ionicons name="alert-circle" size={14} color={BrandColors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          animationType="none"
          transparent
          onRequestClose={handleCancel}
        >
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                opacity: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalContent,
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Pressable
                  onPress={handleCancel}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                >
                  <Ionicons name="close" size={24} color={BrandColors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleChange}
                  locale="id-ID"
                  themeVariant="light"
                  textColor={BrandColors.textPrimary}
                />
              </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Konfirmasi tanggal"
                >
                  <Text style={styles.confirmButtonText}>Konfirmasi</Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  trigger: {
    height: 48,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.white,
  },
  triggerError: {
    borderColor: BrandColors.error,
  },
  triggerText: {
    fontSize: 16,
    color: BrandColors.textPrimary,
    flex: 1,
  },
  placeholder: {
    color: BrandColors.textMuted,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.error,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: BrandColors.overlayBg,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  confirmButton: {
    backgroundColor: BrandColors.primary,
    marginHorizontal: 16,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
