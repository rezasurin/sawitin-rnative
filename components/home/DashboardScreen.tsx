import {
  HargaTbsCard,
  PageHeader,
  QuickActions,
  TodaySummary,
  UserGreeting,
} from "@/components/home";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export function DashboardScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="Beranda" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <UserGreeting />
        <QuickActions />
        <TodaySummary />
        <HargaTbsCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
});
