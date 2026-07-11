import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from '@/components/Themed';
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
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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

  const displayDate = formatDisplay(value);
  const currentDate = value ? new Date(value) : new Date();

  const handleOpen = () => {
    setTempDate(currentDate);
    setShowPicker(true);
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
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.label}>{label}</Text>

        <TouchableOpacity
          style={[styles.trigger, error && styles.triggerError]}
          onPress={handleOpen}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, !value && styles.placeholder]}>
            {displayDate || placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={BrandColors.textMuted} />
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          animationType="slide"
          transparent
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancel}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Pressable onPress={handleCancel} hitSlop={8}>
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
                />
              </View>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Konfirmasi</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
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
  errorText: {
    fontSize: 12,
    color: BrandColors.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
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
