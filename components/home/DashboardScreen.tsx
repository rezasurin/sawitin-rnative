import {
  HargaTbsCard,
  PageHeader,
  QuickActions,
  TodaySummary,
  UserGreeting,
} from "@/components/home";
import { BrandColors } from "@/constants/Colors";
import { useFieldSummary } from '@/hooks/useFieldSummary';
import { useSegments } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export function DashboardScreen() {
  const group = useSegments()[0];
  const fieldSummary = useFieldSummary(group === '(mandor)' || group === '(asisten)');
  const [pulling, setPulling] = useState(false);
  const appState = useRef(AppState.currentState);
  const refresh = fieldSummary.refresh;

  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => {
      if (appState.current !== 'active' && next === 'active') void refresh();
      appState.current = next;
    });
    return () => listener.remove();
  }, [refresh]);

  const onRefresh = useCallback(async () => {
    setPulling(true);
    try { await refresh(); } finally { setPulling(false); }
  }, [refresh]);

  return (
    <View style={styles.container}>
      <PageHeader title="Beranda" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={group === '(mandor)' || group === '(asisten)' ?
          <RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} colors={[BrandColors.primary]} /> : undefined}
      >
        <UserGreeting />
        <TodaySummary fieldSummary={fieldSummary} />
        <QuickActions />
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
