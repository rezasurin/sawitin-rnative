import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  error?: string;
  placeholder?: string;
  searchable?: boolean;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export function FormSelect({
  label,
  value,
  options,
  onSelect,
  error,
  placeholder = 'Pilih...',
  searchable = false,
  containerStyle,
  disabled = false,
}: FormSelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const animatedValue = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const DISMISS_THRESHOLD = 120;
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  const openModal = useCallback(() => {
    dragY.setValue(0);
    setModalVisible(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, dragY]);

  const closeModal = useCallback(() => {
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
      setModalVisible(false);
    });
  }, [animatedValue, dragY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 5,
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
            dragY.setValue(0);
            animatedValue.setValue(0);
            setModalVisible(false);
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

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = useCallback(
    (v: string) => {
      onSelect(v);
      closeModal();
      setSearch('');
    },
    [onSelect, closeModal],
  );

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={[styles.trigger, error && styles.triggerError, disabled && styles.triggerDisabled]}
          onPress={() => !disabled && openModal()}
          activeOpacity={disabled ? 1 : 0.7}
          disabled={disabled}
        >
          <Text
            style={[
              styles.triggerText,
              !value && styles.placeholder,
            ]}
            numberOfLines={1}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={BrandColors.textMuted} />
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Modal
        visible={modalVisible}
        animationType="none"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          </Animated.View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    {
                      translateY: Animated.add(
                        animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [600, 0],
                        }),
                        dragY,
                      ),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.handleBar,
                  {
                    opacity: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.6],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              >
                <View style={styles.handleIndicator} />
              </Animated.View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Pressable
                  onPress={closeModal}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={24} color={BrandColors.textPrimary} />
                </Pressable>
              </View>

              {searchable && (
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari..."
                  placeholderTextColor={BrandColors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
              )}

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      item.value === value && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        item.value === value && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.value === value && (
                      <Ionicons name="checkmark" size={20} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Tidak ada data</Text>
                }
              />
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  triggerDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
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
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: BrandColors.textPrimary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.inputBorder,
  },
  optionSelected: {
    backgroundColor: '#F0F3EA',
  },
  optionText: {
    fontSize: 16,
    color: BrandColors.textPrimary,
  },
  optionTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: BrandColors.textMuted,
    padding: 24,
    fontSize: 14,
  },
});
