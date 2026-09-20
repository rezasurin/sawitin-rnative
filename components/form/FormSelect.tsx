import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandColors } from "@/constants/Colors";

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
  placeholder = "Pilih...",
  searchable = false,
  containerStyle,
  disabled = false,
}: FormSelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const animatedValue = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const DISMISS_THRESHOLD = 120;
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  //
  const openModal = useCallback(() => {
    dragY.setValue(0);
    setSearch("");
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
    }),
  ).current;

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = useCallback(
    (item: SelectOption) => {
      onSelect(item.value);
      AccessibilityInfo.announceForAccessibility(`Telah dipilih ${item.label}`);
      closeModal();
      setSearch("");
    },
    [onSelect, closeModal],
  );

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.trigger,
            error && styles.triggerError,
            disabled && styles.triggerDisabled,
          ]}
          onPress={() => !disabled && openModal()}
          activeOpacity={disabled ? 1 : 0.7}
          disabled={disabled}
          accessibilityRole="combobox"
          accessibilityLabel={label}
          accessibilityValue={{ text: selectedLabel || placeholder }}
          accessibilityHint={
            disabled ? "Belum bisa dipilih" : "Membuka daftar pilihan"
          }
          accessibilityState={{ disabled, expanded: modalVisible }}
        >
          <Text
            style={[styles.triggerText, !value && styles.placeholder]}
            numberOfLines={1}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={BrandColors.textMuted}
          />
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardView}
          >
            <Animated.View
              style={[
                styles.sheet,
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
              accessibilityViewIsModal
            >
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.handleBar,
                  {
                    opacity: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.6],
                      extrapolate: "clamp",
                    }),
                  },
                ]}
              >
                <View style={styles.handleIndicator} />
              </Animated.View>

              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{label}</Text>
                  <Text style={styles.subtitle}>{filtered.length} pilihan</Text>
                </View>
                <Pressable
                  onPress={closeModal}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={BrandColors.textPrimary}
                  />
                </Pressable>
              </View>

              {searchable && (
                <View style={styles.searchWrap}>
                  <Ionicons
                    name="search"
                    size={18}
                    color={BrandColors.textMuted}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Cari ${label.toLowerCase()}...`}
                    placeholderTextColor={BrandColors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                    autoCorrect={false}
                    accessibilityLabel={`Cari ${label}`}
                  />
                  {search.length > 0 && (
                    <Pressable
                      onPress={() => setSearch("")}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Bersihkan pencarian"
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={BrandColors.textMuted}
                      />
                    </Pressable>
                  )}
                </View>
              )}

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const selected = item.value === value;
                  return (
                    <TouchableOpacity
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.6}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {selected ? (
                        <View style={styles.checkBadge}>
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={BrandColors.white}
                          />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="search-outline"
                      size={28}
                      color={BrandColors.textMuted}
                    />
                    <Text style={styles.emptyText}>Tidak ada hasil</Text>
                  </View>
                }
              />

              <View
                style={[
                  styles.footer,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}
              >
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeModal}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Batal"
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
              </View>
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
    fontWeight: "500",
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  trigger: {
    height: 48,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BrandColors.white,
  },
  triggerError: {
    borderColor: BrandColors.error,
  },
  triggerDisabled: {
    opacity: 0.5,
    backgroundColor: BrandColors.cardBg,
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.error,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BrandColors.overlayBg,
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    overflow: "hidden",
  },
  handleBar: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.textMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    backgroundColor: BrandColors.cardBg,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: BrandColors.textPrimary,
    padding: 0,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: BrandColors.cardBg,
  },
  optionText: {
    fontSize: 16,
    color: BrandColors.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    color: BrandColors.primary,
    fontWeight: "600",
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BrandColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: BrandColors.textMuted,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cancelButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.background,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: BrandColors.textSecondary,
  },
});
