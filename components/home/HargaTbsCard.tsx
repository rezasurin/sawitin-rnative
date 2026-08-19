import { BrandColors } from "@/constants/Colors";
import { useHargaTbsLatest } from "@/hooks";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const formatRupiah = (value: number) =>
  `Rp ${value.toLocaleString("id-ID")}`;

/**
 * HargaTbsCard Component
 * Single Responsibility: Display the latest TBS price from the backend
 */
export function HargaTbsCard() {
  const { data, isLoading, isError } = useHargaTbsLatest();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <FontAwesome name="money" size={16} color={BrandColors.primary} />
        <Text style={styles.title}>Harga TBS Hari Ini</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator
          color={BrandColors.primary}
          style={styles.loader}
          size="small"
        />
      ) : isError || !data ? (
        <Text style={styles.empty}>Harga belum tersedia</Text>
      ) : (
        <>
          <Text style={styles.price}>{formatRupiah(data.harga)}</Text>
          <Text style={styles.date}>{data.tanggal}</Text>
          {data.keterangan ? (
            <Text style={styles.keterangan}>{data.keterangan}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: BrandColors.cardBg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textPrimary,
  },
  loader: {
    marginVertical: 12,
    alignSelf: "flex-start",
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
    color: BrandColors.primary,
  },
  date: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  keterangan: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
  empty: {
    fontSize: 14,
    color: BrandColors.textMuted,
    paddingVertical: 8,
  },
});
