import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BrandColors } from '@/constants/Colors';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (text: string) => void;
  onConfirm: (inputText?: string) => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  showInput = false,
  inputPlaceholder = 'Masukkan alasan...',
  inputValue = '',
  onInputChange,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [inputText, setInputText] = useState(inputValue);

  const handleConfirm = () => {
    onConfirm(showInput ? inputText : undefined);
    setInputText('');
  };

  const handleCancel = () => {
    setInputText('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {showInput && (
            <TextInput
              style={styles.input}
              placeholder={inputPlaceholder}
              placeholderTextColor={BrandColors.textMuted}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                onInputChange?.(text);
              }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    marginBottom: 16,
  },
  input: {
    backgroundColor: BrandColors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: BrandColors.textPrimary,
    minHeight: 80,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BrandColors.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.textMuted,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  confirmButton: {
    backgroundColor: BrandColors.primary,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.white,
  },
});