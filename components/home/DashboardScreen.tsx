import {
  AnnouncementSection,
  MenuGrid,
  PageHeader,
  TodayTasksList,
  UserGreeting,
} from "@/components/home";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export function DashboardScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="Home" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <UserGreeting />
        <MenuGrid />
        <AnnouncementSection />
        <TodayTasksList />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
});
