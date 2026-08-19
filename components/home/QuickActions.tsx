import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BrandColors } from "@/constants/Colors";
import { RelativePathString, useRouter, useSegments } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const ROLE_ACTIONS: Record<string, QuickAction[]> = {
  "(mandor)": [
    {
      id: "bkm-add",
      label: "Buat BKM Panen",
      icon: "money",
      route: "(mandor)/bkm/add",
    },
    {
      id: "checker-add",
      label: "Input Checker",
      icon: "check-square-o",
      route: "(mandor)/checker/add",
    },
  ],
  "(asisten)": [
    {
      id: "bkm-review",
      label: "Review BKM Panen",
      icon: "check-square-o",
      route: "(asisten)/bkm",
    },
  ],
  "(krani)": [
    { id: "scan", label: "Scan QR", icon: "qrcode", route: "(krani)/scan" },
    {
      id: "timbangan",
      label: "Input Timbangan",
      icon: "truck",
      route: "(krani)/timbangan",
    },
  ],
};

export function QuickActions() {
  const router = useRouter();
  const segments = useSegments();
  const currentGroup = segments[0] ?? "";
  const actions = ROLE_ACTIONS[currentGroup] ?? [];

  if (actions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aksi Cepat</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <View
            key={action.id}
            style={[
              styles.actionItem,
              actions.length === 1 && styles.actionItemFull,
            ]}
          >
            <Pressable
              className="flex-row items-center px-5 py-3 active:bg-gray-100"
              onPress={() =>
                router.push({ pathname: action.route as RelativePathString })
              }
            >
              <View style={styles.actionCard}>
                <View style={styles.iconContainer}>
                  <FontAwesome
                    name={action.icon as any}
                    size={20}
                    color={BrandColors.primary}
                  />
                </View>
                <Text style={styles.actionLabel} numberOfLines={2}>
                  {action.label}
                </Text>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.textPrimary,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  actionItem: {
    width: "50%",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  actionItemFull: {
    width: "100%",
  },
  actionCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionCard: {
    flexDirection: "row",

    // backgroundColor: "#fff",
    alignItems: "center",
    backgroundColor: BrandColors.cardBg,
    borderRadius: 12,
    padding: 14,
    minHeight: 64,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(107, 123, 60, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    flex: 1,
  },
});
