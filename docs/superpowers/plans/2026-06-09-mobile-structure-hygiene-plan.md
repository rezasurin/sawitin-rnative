# Mobile App Structure & Hygiene Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deduplicate screens, extract shared components, split large files, complete data layer hooks, and fix navigation bugs across the Sawitin Expo mobile app.

**Architecture:** Extract shared screen components (`DashboardScreen`, `ProfileScreen`, `AbsensiScreen`) and BKM sub-components (`DocStatusBadge`, `PanenCard`, `DetailCard`, etc.) into `components/`. Split `mandor/bkm/[id].tsx` from 772→~250 lines by moving action logic into `hooks/useBkmPanenActions.ts`. Add query keys + React Query hooks for 7 actively-used API modules. Wire up dead DrawerMenu, add route guards to all `_layout.tsx` files, and fix cross-group navigation.

**Tech Stack:** Expo SDK 54, React 19, TypeScript, Zustand v5, TanStack Query v5, react-hook-form + zod

**Execution Order:** Section 1 → Section 3 → Section 4 → Section 2

---

## SECTION 1: Screen Deduplication

### Task 1.1: Create DashboardScreen shared component

**Files:**
- Create: `components/home/DashboardScreen.tsx`

- [ ] **Step 1: Create the shared dashboard component**

```tsx
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
```

- [ ] **Step 2: Add DashboardScreen to barrel export**

**Modify:** `components/home/index.ts` — add `export { DashboardScreen } from './DashboardScreen';`

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add components/home/DashboardScreen.tsx components/home/index.ts
git commit -m "refactor: extract shared DashboardScreen component"
```

### Task 1.2: Replace all 5 dashboard screens with DashboardScreen

**Files:**
- Modify: `app/(admin)/index.tsx`
- Modify: `app/(asisten)/index.tsx`
- Modify: `app/(mandor)/index.tsx`
- Modify: `app/(krani)/index.tsx`
- Modify: `app/(pemanen)/index.tsx`

- [ ] **Step 1: Replace (admin)/index.tsx**

Replace entire file content with:
```tsx
export { DashboardScreen as default } from "@/components/home/DashboardScreen";
```

- [ ] **Step 2: Replace (asisten)/index.tsx**

Replace entire file content with:
```tsx
export { DashboardScreen as default } from "@/components/home/DashboardScreen";
```

- [ ] **Step 3: Replace (mandor)/index.tsx**

Replace entire file content with:
```tsx
export { DashboardScreen as default } from "@/components/home/DashboardScreen";
```

- [ ] **Step 4: Replace (krani)/index.tsx**

Replace entire file content with:
```tsx
export { DashboardScreen as default } from "@/components/home/DashboardScreen";
```

- [ ] **Step 5: Replace (pemanen)/index.tsx**

Replace entire file content with:
```tsx
export { DashboardScreen as default } from "@/components/home/DashboardScreen";
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add app/(admin)/index.tsx app/(asisten)/index.tsx app/(mandor)/index.tsx app/(krani)/index.tsx app/(pemanen)/index.tsx
git commit -m "refactor: use shared DashboardScreen in all 5 role groups"
```

### Task 1.3: Create ProfileScreen shared component

**Files:**
- Create: `components/home/ProfileScreen.tsx`

- [ ] **Step 1: Create the shared profile component**

```tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { BrandColors } from "@/constants/Colors";
import { PageHeader } from "@/components/home";

export function ProfileScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="Profil" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.emptyText}>Profil pengguna</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: BrandColors.textMuted, fontSize: 14 },
});
```

- [ ] **Step 2: Add ProfileScreen to barrel export**

**Modify:** `components/home/index.ts` — add `export { ProfileScreen } from './ProfileScreen';`

- [ ] **Step 3: Replace all 4 profile screens**

Replace entire file content of each with:
```tsx
export { ProfileScreen as default } from "@/components/home/ProfileScreen";
```

Files to replace:
- `app/(asisten)/profile.tsx`
- `app/(mandor)/profile.tsx`
- `app/(krani)/profile.tsx`
- `app/(pemanen)/profile.tsx`

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add components/home/ProfileScreen.tsx components/home/index.ts app/(asisten)/profile.tsx app/(mandor)/profile.tsx app/(krani)/profile.tsx app/(pemanen)/profile.tsx
git commit -m "refactor: extract shared ProfileScreen component"
```

### Task 1.4: Create AbsensiScreen shared component

**Files:**
- Create: `components/home/AbsensiScreen.tsx`

- [ ] **Step 1: Create the shared absensi component**

```tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { BrandColors } from "@/constants/Colors";
import { PageHeader } from "@/components/home";

export function AbsensiScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="Absensi" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.emptyText}>Belum ada data absensi</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: BrandColors.textMuted, fontSize: 14 },
});
```

- [ ] **Step 2: Add AbsensiScreen to barrel export**

**Modify:** `components/home/index.ts` — add `export { AbsensiScreen } from './AbsensiScreen';`

- [ ] **Step 3: Replace both absensi screens**

Replace entire file content of each with:
```tsx
export { AbsensiScreen as default } from "@/components/home/AbsensiScreen";
```

Files to replace:
- `app/(mandor)/absensi.tsx`
- `app/(pemanen)/absensi.tsx`

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add components/home/AbsensiScreen.tsx components/home/index.ts app/(mandor)/absensi.tsx app/(pemanen)/absensi.tsx
git commit -m "refactor: extract shared AbsensiScreen component"
```

---

## SECTION 3: File Splitting

### Task 3.1: Create BKM shared sub-components

**Files:**
- Create: `components/bkm/DocStatusBadge.tsx`
- Create: `components/bkm/Row.tsx`
- Create: `components/bkm/MetricCard.tsx`
- Create: `components/bkm/GradeItem.tsx`
- Create: `components/bkm/DetailCard.tsx`
- Create: `components/bkm/PanenCard.tsx`
- Create: `components/bkm/index.ts`

- [ ] **Step 1: Create DocStatusBadge**

```tsx
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import type { DocumentStatus } from "@/types";
import React from "react";
import { StyleSheet, Text } from "react-native";

const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; label: string }> = {
  DRAFT: { color: BrandColors.textMuted, bg: "#F0F0F0", label: "Draft" },
  SUBMITTED: { color: "#2196F3", bg: "#E3F2FD", label: "Submitted" },
  APPROVED: { color: BrandColors.success, bg: "#E8F5E9", label: "Approved" },
  REVISION_REQUESTED: { color: BrandColors.error, bg: "#FFEBEE", label: "Revisi" },
  CANCELLED: { color: "#9E9E9E", bg: "#F5F5F5", label: "Cancelled" },
};

export function DocStatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  text: { fontSize: 12, fontWeight: "600" },
});
```

- [ ] **Step 2: Create Row**

```tsx
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text } from "react-native";

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, backgroundColor: "transparent" },
  label: { fontSize: 14, color: BrandColors.textSecondary },
  value: { fontSize: 14, fontWeight: "500", color: BrandColors.textPrimary, maxWidth: "60%", textAlign: "right" },
});
```

- [ ] **Step 3: Create MetricCard**

```tsx
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text } from "react-native";

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: "45%", backgroundColor: BrandColors.cardBg, borderRadius: 8, padding: 12, alignItems: "center" },
  value: { fontSize: 20, fontWeight: "700", color: BrandColors.primary },
  label: { fontSize: 12, color: BrandColors.textSecondary, marginTop: 4 },
});
```

- [ ] **Step 4: Create GradeItem**

```tsx
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text } from "react-native";

export function GradeItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: "center", backgroundColor: BrandColors.background, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8, minWidth: 50 },
  label: { fontSize: 10, color: BrandColors.textMuted, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: "600", color: BrandColors.textPrimary },
});
```

- [ ] **Step 5: Create DetailCard**

```tsx
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import type { BkmPanenDetail as BkmPanenDetailType } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text } from "react-native";
import { GradeItem } from "./GradeItem";

export function DetailCard({ detail }: { detail: BkmPanenDetailType }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="person" size={16} color={BrandColors.primary} />
        <Text style={styles.title}>{detail.pekerja?.member?.nama ?? detail.pekerja_id}</Text>
      </View>
      <Text style={styles.meta}>
        TPH: {detail.tph?.nama ?? detail.tph_id} &bull; {detail.jenis_pekerjaan}
      </Text>
      <View style={styles.gradingGrid}>
        <GradeItem label="Normal" value={detail.janjang_normal} />
        <GradeItem label="Mentah" value={detail.buah_mentah} />
        <GradeItem label="Over" value={detail.over_ripe} />
        <GradeItem label="T.Panjang" value={detail.tangkai_panjang} />
        <GradeItem label="Abnormal" value={detail.buah_abnormal} />
        <GradeItem label="Kosong" value={detail.janjang_kosong} />
      </View>
      {detail.jumlah_brondol != null && (
        <Text style={styles.brondol}>Brondolan: {detail.jumlah_brondol} kg</Text>
      )}
      {detail.note && <Text style={styles.note}>Catatan: {detail.note}</Text>}
      <Text style={styles.total}>Total Janjang: {detail.jumlah_janjang}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: BrandColors.cardBg, borderRadius: 8, padding: 12, marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: "600", color: BrandColors.textPrimary },
  meta: { fontSize: 12, color: BrandColors.textMuted, marginBottom: 8 },
  gradingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  brondol: { fontSize: 12, color: BrandColors.textSecondary, marginTop: 6 },
  note: { fontSize: 12, color: BrandColors.textMuted, marginTop: 4, fontStyle: "italic" },
  total: { fontSize: 13, fontWeight: "600", color: BrandColors.primary, marginTop: 6 },
});
```

- [ ] **Step 6: Create PanenCard**

```tsx
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import type { BkmPanen } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { DocStatusBadge } from "./DocStatusBadge";

export function PanenCard({
  item,
  onPress,
  onLongPress,
}: {
  item: BkmPanen;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="leaf" size={18} color={BrandColors.primary} />
          <Text style={styles.title}>{item.blok?.nama ?? item.blok_id}</Text>
        </View>
        <DocStatusBadge status={item.status} />
      </View>
      <View style={styles.body}>
        <Text style={styles.date}>{item.tanggal_laporan}</Text>
        {item.lahan?.nama && <Text style={styles.meta}>Lahan: {item.lahan.nama}</Text>}
        {item.keterangan ? <Text style={styles.meta} numberOfLines={2}>{item.keterangan}</Text> : null}
        <Text style={styles.detailCount}>{item.details?.length ?? 0} detail</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: BrandColors.cardBg, marginHorizontal: 16, marginTop: 12, borderRadius: 8, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "600", color: BrandColors.textPrimary },
  body: {},
  date: { fontSize: 14, color: BrandColors.textSecondary },
  meta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  detailCount: { fontSize: 12, color: BrandColors.primary, fontWeight: "600", marginTop: 6 },
});
```

- [ ] **Step 7: Create barrel export**

```tsx
export { DocStatusBadge } from "./DocStatusBadge";
export { Row } from "./Row";
export { MetricCard } from "./MetricCard";
export { GradeItem } from "./GradeItem";
export { DetailCard } from "./DetailCard";
export { PanenCard } from "./PanenCard";
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 9: Commit**

```bash
git add components/bkm/
git commit -m "refactor: extract shared BKM sub-components"
```

### Task 3.2: Refactor mandor/bkm/index.tsx to use shared PanenCard + DocStatusBadge

**Files:**
- Modify: `app/(mandor)/bkm/index.tsx`

- [ ] **Step 1: Update imports and remove local component definitions**

Remove lines 20-89 (STATUS_CONFIG, DocStatusBadge function, badgeStyles, PanenCard function). Replace imports as follows:

Current imports (lines 1-18) — keep the same import block but replace:
```tsx
import { FAB } from '@/components/core/FAB';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmPanenInfinite, useDeleteBkmPanen } from '@/hooks/useBkmPanen';
import type { BkmPanen, DocumentStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
```

Replace with:
```tsx
import { FAB } from '@/components/core/FAB';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { PanenCard } from '@/components/bkm/PanenCard';
import { BrandColors } from '@/constants/Colors';
import { useBkmPanenInfinite, useDeleteBkmPanen } from '@/hooks/useBkmPanen';
import type { BkmPanen } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/(mandor)/bkm/index.tsx
git commit -m "refactor: use shared PanenCard in mandor BKM list"
```

### Task 3.3: Refactor asisten/bkm.tsx to use shared PanenCard + DocStatusBadge + remove FAB

**Files:**
- Modify: `app/(asisten)/bkm.tsx`

- [ ] **Step 1: Update imports and remove local definitions, remove FAB**

Replace the file's import block to match mandor version (from Task 3.2) but remove `FAB` import and `useDeleteBkmPanen`. Also remove the FAB JSX at the bottom and the long-press delete handler.

The asisten BKM should be read-only — no FAB for creating, no delete. Keep `PanenCard` without `onLongPress`.

Replace entire file content with:
```tsx
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { PanenCard } from '@/components/bkm/PanenCard';
import { BrandColors } from '@/constants/Colors';
import { useBkmPanenInfinite } from '@/hooks/useBkmPanen';
import type { BkmPanen } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

export default function BkmScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBkmPanenInfinite();

  const panenList = data?.pages.flatMap((page) => page.data) ?? [];
  const totalItems = data?.pages[0]?.pagination?.total ?? 0;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCardPress = React.useCallback(
    (id: string) => {
      router.push(`/(asisten)/bkm/${id}` as any);
    },
    [router],
  );

  return (
    <View style={styles.container}>
      <PageHeader title="BKM Panen" />
      <FlatList
        data={panenList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PanenCard item={item} onPress={() => handleCardPress(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerSubtitle}>
              {totalItems > 0 ? totalItems : panenList.length} dokumen panen
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={40} color={BrandColors.error} />
              <Text style={styles.errorText}>Gagal memuat data</Text>
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={styles.retryText}>Coba lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="document-text-outline" size={48} color={BrandColors.textMuted} />
              <Text style={styles.emptyText}>Belum ada data BKM Panen</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[BrandColors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listContent: { paddingBottom: 120 },
  listHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: BrandColors.inputBorder },
  headerSubtitle: { fontSize: 13, color: BrandColors.textSecondary, marginTop: 4 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: BrandColors.textMuted, fontSize: 15, marginTop: 12 },
  errorText: { color: BrandColors.error, fontSize: 15, marginTop: 12 },
  retryText: { color: BrandColors.primary, fontSize: 14, fontWeight: '600', marginTop: 8 },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/(asisten)/bkm.tsx
git commit -m "refactor: use shared PanenCard in asisten BKM, remove FAB for read-only view"
```

### Task 3.4: Extract useBkmPanenActions hook

**Files:**
- Create: `hooks/useBkmPanenActions.ts`

- [ ] **Step 1: Create the hook**

```tsx
import { useApproveBkmPanen, useDeleteBkmPanen, useRejectBkmPanen, useUpdateBkmPanen } from "@/hooks/useBkmPanen";
import { useAuthStore } from "@/stores/useAuthStore";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export function useBkmPanenActions(id: string | undefined) {
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const approveMutation = useApproveBkmPanen();
  const rejectMutation = useRejectBkmPanen();
  const deleteMutation = useDeleteBkmPanen();
  const updateMutation = useUpdateBkmPanen();

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [revokeModalVisible, setRevokeModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const handleApprove = async () => {
    if (!id) return;
    setApproveModalVisible(false);
    try {
      await approveMutation.mutateAsync(id);
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat menyetujui dokumen");
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectMutation.mutateAsync({ id, note: rejectReason });
      setRejectModalVisible(false);
      setRejectReason("");
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat menolak dokumen");
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert("Hapus BKM Panen?", "Data akan dihapus permanen.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate(id, {
            onSuccess: () => router.back(),
            onError: () => Alert.alert("Gagal", "Tidak dapat menghapus dokumen"),
          });
        },
      },
    ]);
  };

  const handleRevoke = async () => {
    if (!id) return;
    setRevokeModalVisible(false);
    try {
      await updateMutation.mutateAsync({ id, data: { status: "DRAFT" } });
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat menarik kembali dokumen");
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setCancelModalVisible(false);
    try {
      await updateMutation.mutateAsync({ id, data: { status: "CANCELLED" } });
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat membatalkan dokumen");
    }
  };

  const handleSubmit = () => {
    if (!id) return;
    Alert.alert("Submit BKM Panen?", "Dokumen akan dikirim untuk disetujui.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Submit",
        onPress: async () => {
          try {
            await updateMutation.mutateAsync({ id, data: { status: "SUBMITTED" } });
            router.back();
          } catch {
            Alert.alert("Gagal", "Tidak dapat mengirim dokumen");
          }
        },
      },
    ]);
  };

  return {
    canApprove: hasPermission("mod_bkm_panen", "approve"),
    handleApprove,
    handleReject,
    handleDelete,
    handleRevoke,
    handleCancel,
    handleSubmit,
    rejectModalVisible,
    setRejectModalVisible,
    rejectReason,
    setRejectReason,
    approveModalVisible,
    setApproveModalVisible,
    revokeModalVisible,
    setRevokeModalVisible,
    cancelModalVisible,
    setCancelModalVisible,
    approveMutation,
    rejectMutation,
    deleteMutation,
    updateMutation,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add hooks/useBkmPanenActions.ts
git commit -m "refactor: extract useBkmPanenActions hook from detail screen"
```

### Task 3.5: Refactor mandor/bkm/[id].tsx to use shared components + hook

**Files:**
- Modify: `app/(mandor)/bkm/[id].tsx`

- [ ] **Step 1: Replace the entire file with the refactored version**

Replace entire file content with:
```tsx
import { ConfirmModal } from "@/components/core/ConfirmModal";
import { PageHeader } from "@/components/home";
import { View } from "@/components/Themed";
import { DetailCard } from "@/components/bkm/DetailCard";
import { DocStatusBadge } from "@/components/bkm/DocStatusBadge";
import { MetricCard } from "@/components/bkm/MetricCard";
import { BrandColors } from "@/constants/Colors";
import { useBkmPanenDetail } from "@/hooks/useBkmPanen";
import { useBkmPanenActions } from "@/hooks/useBkmPanenActions";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

export default function BkmDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useBkmPanenDetail(id);
  const {
    canApprove,
    handleApprove,
    handleReject,
    handleDelete,
    handleRevoke,
    handleCancel,
    handleSubmit,
    rejectModalVisible,
    setRejectModalVisible,
    rejectReason,
    setRejectReason,
    approveModalVisible,
    setApproveModalVisible,
    revokeModalVisible,
    setRevokeModalVisible,
    cancelModalVisible,
    setCancelModalVisible,
    deleteMutation,
  } = useBkmPanenActions(id);

  const showApproveReject = canApprove && data?.status === "SUBMITTED";
  const showRevokeCancel = data?.status === "SUBMITTED" || data?.status === "REVISION_REQUESTED";
  const canEdit = data?.status === "DRAFT" || data?.status === "REVISION_REQUESTED";

  const metrics = useMemo(() => {
    const details = data?.details ?? [];
    const totalJanjang = details.reduce(
      (sum, d) =>
        sum +
        (Number(d.janjang_normal) || 0) +
        (Number(d.buah_mentah) || 0) +
        (Number(d.over_ripe) || 0) +
        (Number(d.tangkai_panjang) || 0) +
        (Number(d.buah_abnormal) || 0) +
        (Number(d.janjang_kosong) || 0),
      0,
    );
    const totalBrondol = details.reduce((sum, d) => sum + (Number(d.jumlah_brondol) || 0), 0);
    const tphCount = new Set(details.map((d) => d.tph_id)).size;
    return { totalJanjang, totalBrondol, tphCount };
  }, [data]);

  const BackButton = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        { opacity: pressed ? 0.7 : 1, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
      ]}
    >
      <FontAwesome name="arrow-left" size={20} color={BrandColors.white} />
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM" showMenuButton={false} actionBtn={BackButton} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM" showMenuButton={false} actionBtn={BackButton} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={BrandColors.error} />
          <Text style={styles.errorText}>Gagal memuat data</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const details = data.details ?? [];

  return (
    <View style={styles.container}>
      <PageHeader title="Detail BKM" showMenuButton={false} actionBtn={BackButton} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{data.blok?.nama ?? data.blok_id}</Text>
            <DocStatusBadge status={data.status} />
          </View>
          <Text style={styles.sectionDate}>{data.tanggal_laporan}</Text>
          {data.lahan?.nama && <Text style={styles.sectionMeta}>Lahan: {data.lahan.nama}</Text>}
          {data.grup_pekerja?.nama && <Text style={styles.sectionMeta}>Grup: {data.grup_pekerja.nama}</Text>}
          {data.keterangan && <Text style={styles.keterangan}>{data.keterangan}</Text>}
          {data.rejection_note && (
            <View style={styles.rejectionNoteBox}>
              <Ionicons name="warning-outline" size={14} color={BrandColors.error} />
              <Text style={styles.rejectionNoteText}>Alasan Revisi: {data.rejection_note}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Ringkasan Produksi</Text>
        <View style={styles.metricsGrid}>
          <MetricCard label="Pekerja" value={String(details.length)} />
          <MetricCard label="TPH" value={String(metrics.tphCount)} />
          <MetricCard label="Total Janjang" value={String(metrics.totalJanjang)} />
          <MetricCard label="Brondolan" value={`${metrics.totalBrondol} kg`} />
        </View>

        <Text style={styles.sectionLabel}>Detail per Pekerja</Text>
        {details.length > 0 ? (
          details.map((detail) => <DetailCard key={detail.id} detail={detail} />)
        ) : (
          <View style={styles.emptyDetails}>
            <Ionicons name="document-text-outline" size={32} color={BrandColors.textMuted} />
            <Text style={styles.emptyDetailsText}>Belum ada detail</Text>
          </View>
        )}

        {data?.status === "DRAFT" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButtonSm]}
              onPress={() => router.push(`/(mandor)/bkm/edit?id=${id}`)}
            >
              <Ionicons name="create-outline" size={18} color={BrandColors.white} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.submitButton]} onPress={handleSubmit}>
              <Ionicons name="send-outline" size={18} color={BrandColors.white} />
              <Text style={styles.editButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        )}

        {data?.status === "REVISION_REQUESTED" && (
          <View style={styles.editButtonContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/(mandor)/bkm/edit?id=${id}`)}
            >
              <Ionicons name="create-outline" size={18} color={BrandColors.white} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {showApproveReject && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => setRejectModalVisible(true)}>
              <Text style={styles.rejectButtonText}>Tolak</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => setApproveModalVisible(true)}>
              <Text style={styles.approveButtonText}>Setuju</Text>
            </TouchableOpacity>
          </View>
        )}

        {showRevokeCancel && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.revokeButton]} onPress={() => setRevokeModalVisible(true)}>
              <Ionicons name="arrow-undo-outline" size={16} color={BrandColors.white} />
              <Text style={styles.revokeButtonText}>Tarik Kembali</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setCancelModalVisible(true)}>
              <Ionicons name="close-circle-outline" size={16} color={BrandColors.white} />
              <Text style={styles.cancelButtonText}>Batalkan</Text>
            </TouchableOpacity>
          </View>
        )}

        {data?.status === "DRAFT" && (
          <TouchableOpacity
            style={[styles.deleteButton, deleteMutation.isPending && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={BrandColors.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={BrandColors.error} />
            )}
            <Text style={styles.deleteButtonText}>{deleteMutation.isPending ? "Menghapus..." : "Hapus"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ConfirmModal visible={approveModalVisible} title="Setuju BKM" message="Apakah Anda yakin ingin menyetujui dokumen BKM ini?" confirmText="Setuju" cancelText="Batal" onConfirm={handleApprove} onCancel={() => setApproveModalVisible(false)} />
      <ConfirmModal visible={rejectModalVisible} title="Tolak BKM" message="Masukkan alasan penolakan (opsional):" confirmText="Tolak" cancelText="Batal" showInput inputPlaceholder="Alasan penolakan..." inputValue={rejectReason} onInputChange={setRejectReason} onConfirm={handleReject} onCancel={() => { setRejectModalVisible(false); setRejectReason(""); }} />
      <ConfirmModal visible={revokeModalVisible} title="Tarik Kembali BKM" message="Dokumen akan kembali ke status Draft dan dapat diedit kembali." confirmText="Tarik Kembali" cancelText="Batal" onConfirm={handleRevoke} onCancel={() => setRevokeModalVisible(false)} />
      <ConfirmModal visible={cancelModalVisible} title="Batalkan BKM" message="Dokumen yang dibatalkan tidak dapat dikembalikan." confirmText="Batalkan" cancelText="Batal" onConfirm={handleCancel} onCancel={() => setCancelModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  errorText: { color: BrandColors.error, fontSize: 15, marginTop: 12 },
  retryText: { color: BrandColors.primary, fontSize: 14, fontWeight: "600", marginTop: 8 },
  sectionHeader: { backgroundColor: BrandColors.cardBg, borderRadius: 8, padding: 16, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: BrandColors.textPrimary, flex: 1, marginRight: 12 },
  sectionDate: { fontSize: 14, color: BrandColors.textSecondary },
  sectionMeta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  keterangan: { fontSize: 13, color: BrandColors.textSecondary, marginTop: 8, fontStyle: "italic" },
  sectionLabel: { fontSize: 16, fontWeight: "600", color: BrandColors.textPrimary, marginBottom: 12, marginTop: 8 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  emptyDetails: { alignItems: "center", paddingVertical: 24 },
  emptyDetailsText: { color: BrandColors.textMuted, fontSize: 13, marginTop: 8 },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 16, paddingBottom: 20 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, gap: 8 },
  rejectButton: { backgroundColor: BrandColors.error },
  approveButton: { backgroundColor: BrandColors.success },
  rejectButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  approveButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  revokeButton: { backgroundColor: "#E67E22" },
  cancelButton: { backgroundColor: "#757575" },
  revokeButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  cancelButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  rejectionNoteBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8, padding: 10, backgroundColor: "#FFF3E0", borderRadius: 6, borderLeftWidth: 3, borderLeftColor: BrandColors.error },
  rejectionNoteText: { fontSize: 13, color: BrandColors.error, flex: 1 },
  editButtonContainer: { marginTop: 16 },
  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: BrandColors.primary, gap: 8 },
  editButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  editButtonSm: { backgroundColor: BrandColors.primary },
  submitButton: { backgroundColor: BrandColors.success },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, borderWidth: 1.5, borderColor: BrandColors.error, backgroundColor: "transparent", gap: 8, marginTop: 12, paddingBottom: 20 },
  deleteButtonDisabled: { opacity: 0.5 },
  deleteButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.error },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/(mandor)/bkm/[id].tsx
git commit -m "refactor: split BKM detail screen using shared components + actions hook (772→~260 lines)"
```

### Task 3.6: Create asisten BKM read-only detail screen

**Files:**
- Create: `app/(asisten)/bkm/[id].tsx`

- [ ] **Step 1: Create the read-only detail screen**

The asisten detail is the same as mandor detail minus Edit/Submit/Delete/Approve/Reject/Revoke/Cancel buttons. Asisten users can only VIEW.

```tsx
import { PageHeader } from "@/components/home";
import { View } from "@/components/Themed";
import { DetailCard } from "@/components/bkm/DetailCard";
import { DocStatusBadge } from "@/components/bkm/DocStatusBadge";
import { MetricCard } from "@/components/bkm/MetricCard";
import { BrandColors } from "@/constants/Colors";
import { useBkmPanenDetail } from "@/hooks/useBkmPanen";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

export default function AsistenBkmDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useBkmPanenDetail(id);

  const metrics = useMemo(() => {
    const details = data?.details ?? [];
    const totalJanjang = details.reduce(
      (sum, d) =>
        sum +
        (Number(d.janjang_normal) || 0) +
        (Number(d.buah_mentah) || 0) +
        (Number(d.over_ripe) || 0) +
        (Number(d.tangkai_panjang) || 0) +
        (Number(d.buah_abnormal) || 0) +
        (Number(d.janjang_kosong) || 0),
      0,
    );
    const totalBrondol = details.reduce((sum, d) => sum + (Number(d.jumlah_brondol) || 0), 0);
    const tphCount = new Set(details.map((d) => d.tph_id)).size;
    return { totalJanjang, totalBrondol, tphCount };
  }, [data]);

  const BackButton = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        { opacity: pressed ? 0.7 : 1, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
      ]}
    >
      <FontAwesome name="arrow-left" size={20} color={BrandColors.white} />
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM" showMenuButton={false} actionBtn={BackButton} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM" showMenuButton={false} actionBtn={BackButton} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={BrandColors.error} />
          <Text style={styles.errorText}>Gagal memuat data</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const details = data.details ?? [];

  return (
    <View style={styles.container}>
      <PageHeader title="Detail BKM" showMenuButton={false} actionBtn={BackButton} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{data.blok?.nama ?? data.blok_id}</Text>
            <DocStatusBadge status={data.status} />
          </View>
          <Text style={styles.sectionDate}>{data.tanggal_laporan}</Text>
          {data.lahan?.nama && <Text style={styles.sectionMeta}>Lahan: {data.lahan.nama}</Text>}
          {data.grup_pekerja?.nama && <Text style={styles.sectionMeta}>Grup: {data.grup_pekerja.nama}</Text>}
          {data.keterangan && <Text style={styles.keterangan}>{data.keterangan}</Text>}
          {data.rejection_note && (
            <View style={styles.rejectionNoteBox}>
              <Ionicons name="warning-outline" size={14} color={BrandColors.error} />
              <Text style={styles.rejectionNoteText}>Alasan Revisi: {data.rejection_note}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Ringkasan Produksi</Text>
        <View style={styles.metricsGrid}>
          <MetricCard label="Pekerja" value={String(details.length)} />
          <MetricCard label="TPH" value={String(metrics.tphCount)} />
          <MetricCard label="Total Janjang" value={String(metrics.totalJanjang)} />
          <MetricCard label="Brondolan" value={`${metrics.totalBrondol} kg`} />
        </View>

        <Text style={styles.sectionLabel}>Detail per Pekerja</Text>
        {details.length > 0 ? (
          details.map((detail) => <DetailCard key={detail.id} detail={detail} />)
        ) : (
          <View style={styles.emptyDetails}>
            <Ionicons name="document-text-outline" size={32} color={BrandColors.textMuted} />
            <Text style={styles.emptyDetailsText}>Belum ada detail</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  errorText: { color: BrandColors.error, fontSize: 15, marginTop: 12 },
  retryText: { color: BrandColors.primary, fontSize: 14, fontWeight: "600", marginTop: 8 },
  sectionHeader: { backgroundColor: BrandColors.cardBg, borderRadius: 8, padding: 16, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: BrandColors.textPrimary, flex: 1, marginRight: 12 },
  sectionDate: { fontSize: 14, color: BrandColors.textSecondary },
  sectionMeta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  keterangan: { fontSize: 13, color: BrandColors.textSecondary, marginTop: 8, fontStyle: "italic" },
  sectionLabel: { fontSize: 16, fontWeight: "600", color: BrandColors.textPrimary, marginBottom: 12, marginTop: 8 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  emptyDetails: { alignItems: "center", paddingVertical: 24 },
  emptyDetailsText: { color: BrandColors.textMuted, fontSize: 13, marginTop: 8 },
  rejectionNoteBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8, padding: 10, backgroundColor: "#FFF3E0", borderRadius: 6, borderLeftWidth: 3, borderLeftColor: BrandColors.error },
  rejectionNoteText: { fontSize: 13, color: BrandColors.error, flex: 1 },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/(asisten)/bkm/[id].tsx
git commit -m "feat: add read-only BKM detail screen for asisten group"
```

---

## SECTION 4: Data Layer Completion

### Task 4.1: Add query key factories for 7 modules

**Files:**
- Modify: `services/queryKeys.ts`

- [ ] **Step 1: Append 7 new key factories**

Append after `bkmCheckerKeys` (after line 25):
```tsx
export const lahanKeys = {
  all: ['lahan'] as const,
  lists: () => [...lahanKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...lahanKeys.lists(), filters ?? {}] as const,
  details: () => [...lahanKeys.all, 'detail'] as const,
  detail: (id: string) => [...lahanKeys.details(), id] as const,
};

export const blokKeys = {
  all: ['blok'] as const,
  lists: () => [...blokKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...blokKeys.lists(), filters ?? {}] as const,
  details: () => [...blokKeys.all, 'detail'] as const,
  detail: (id: string) => [...blokKeys.details(), id] as const,
};

export const tphKeys = {
  all: ['tph'] as const,
  lists: () => [...tphKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...tphKeys.lists(), filters ?? {}] as const,
  details: () => [...tphKeys.all, 'detail'] as const,
  detail: (id: string) => [...tphKeys.details(), id] as const,
};

export const pekerjaKeys = {
  all: ['pekerja'] as const,
  lists: () => [...pekerjaKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...pekerjaKeys.lists(), filters ?? {}] as const,
  details: () => [...pekerjaKeys.all, 'detail'] as const,
  detail: (id: string) => [...pekerjaKeys.details(), id] as const,
};

export const grupPekerjaKeys = {
  all: ['grupPekerja'] as const,
  lists: () => [...grupPekerjaKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...grupPekerjaKeys.lists(), filters ?? {}] as const,
  details: () => [...grupPekerjaKeys.all, 'detail'] as const,
  detail: (id: string) => [...grupPekerjaKeys.details(), id] as const,
};

export const tipePekerjaanKeys = {
  all: ['tipePekerjaan'] as const,
  lists: () => [...tipePekerjaanKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...tipePekerjaanKeys.lists(), filters ?? {}] as const,
  details: () => [...tipePekerjaanKeys.all, 'detail'] as const,
  detail: (id: string) => [...tipePekerjaanKeys.details(), id] as const,
};

export const kelompokLahanKeys = {
  all: ['kelompokLahan'] as const,
  lists: () => [...kelompokLahanKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...kelompokLahanKeys.lists(), filters ?? {}] as const,
  details: () => [...kelompokLahanKeys.all, 'detail'] as const,
  detail: (id: string) => [...kelompokLahanKeys.details(), id] as const,
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add services/queryKeys.ts
git commit -m "feat: add query key factories for lahan, blok, tph, pekerja, grupPekerja, tipePekerjaan, kelompokLahan"
```

### Task 4.2: Create React Query hooks for 7 modules

**Files:**
- Create: `hooks/useLahan.ts`
- Create: `hooks/useBlok.ts`
- Create: `hooks/useTph.ts`
- Create: `hooks/usePekerja.ts`
- Create: `hooks/useGrupPekerja.ts`
- Create: `hooks/useTipePekerjaan.ts`
- Create: `hooks/useKelompokLahan.ts`

- [ ] **Step 1: Create hooks/useLahan.ts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { lahanApi } from '@/services/lahan.service';
import { lahanKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useLahanList(params?: ApiListParams) {
  return useQuery({
    queryKey: lahanKeys.list(params),
    queryFn: () => lahanApi.getAll(params),
  });
}

export function useLahanDetail(id: string) {
  return useQuery({
    queryKey: lahanKeys.detail(id),
    queryFn: () => lahanApi.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 2: Create hooks/useBlok.ts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { blokApi } from '@/services/blok.service';
import { blokKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useBlokList(params?: ApiListParams) {
  return useQuery({
    queryKey: blokKeys.list(params),
    queryFn: () => blokApi.getAll(params),
  });
}

export function useBlokDetail(id: string) {
  return useQuery({
    queryKey: blokKeys.detail(id),
    queryFn: () => blokApi.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 3: Create hooks/useTph.ts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { tphApi } from '@/services/tph.service';
import { tphKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useTphList(params?: ApiListParams) {
  return useQuery({
    queryKey: tphKeys.list(params),
    queryFn: () => tphApi.getAll(params),
  });
}

export function useTphDetail(id: string) {
  return useQuery({
    queryKey: tphKeys.detail(id),
    queryFn: () => tphApi.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 4: Create hooks/usePekerja.ts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { pekerjaApi } from '@/services/pekerja.service';
import { pekerjaKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function usePekerjaList(params?: ApiListParams) {
  return useQuery({
    queryKey: pekerjaKeys.list(params),
    queryFn: () => pekerjaApi.getAll(params),
  });
}

export function usePekerjaDetail(id: string) {
  return useQuery({
    queryKey: pekerjaKeys.detail(id),
    queryFn: () => pekerjaApi.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 5: Create hooks/useGrupPekerja.ts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { grupPekerjaApi } from '@/services/grup-pekerja.service';
import { grupPekerjaKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useGrupPekerjaList(params?: ApiListParams) {
  return useQuery({
    queryKey: grupPekerjaKeys.list(params),
    queryFn: () => grupPekerjaApi.getAll(params),
  });
}

export function useGrupPekerjaDetail(id: string) {
  return useQuery({
    queryKey: grupPekerjaKeys.detail(id),
    queryFn: () => grupPekerjaApi.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 6: Create hooks/useTipePekerjaan.ts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { tipePekerjaanApi } from '@/services/tipe-pekerjaan.service';
import { tipePekerjaanKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useTipePekerjaanList(params?: ApiListParams) {
  return useQuery({
    queryKey: tipePekerjaanKeys.list(params),
    queryFn: () => tipePekerjaanApi.getAll(params),
  });
}

export function useTipePekerjaanDetail(id: string) {
  return useQuery({
    queryKey: tipePekerjaanKeys.detail(id),
    queryFn: () => tipePekerjaanApi.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 7: Create hooks/useKelompokLahan.ts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { kelompokLahanApi } from '@/services/kelompok-lahan.service';
import { kelompokLahanKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useKelompokLahanList(params?: ApiListParams) {
  return useQuery({
    queryKey: kelompokLahanKeys.list(params),
    queryFn: () => kelompokLahanApi.getAll(params),
  });
}

export function useKelompokLahanDetail(id: string) {
  return useQuery({
    queryKey: kelompokLahanKeys.detail(id),
    queryFn: () => kelompokLahanApi.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 9: Commit**

```bash
git add hooks/useLahan.ts hooks/useBlok.ts hooks/useTph.ts hooks/usePekerja.ts hooks/useGrupPekerja.ts hooks/useTipePekerjaan.ts hooks/useKelompokLahan.ts
git commit -m "feat: add React Query hooks for 7 master-data modules"
```

### Task 4.3: Add bkmChecker reject + detail CRUD mutations

**Files:**
- Modify: `services/bkm-checker.service.ts`
- Modify: `hooks/useBkmChecker.ts`

- [ ] **Step 1: Add reject method to bkmCheckerApi**

In `services/bkm-checker.service.ts`, after line 28 (the `approve` method), add:
```tsx
  reject: async (id: string, note?: string): Promise<BkmChecker> => {
    const response = await apiClient.post<BkmChecker>(`/bkmChecker/${id}/reject`, { note });
    return response.data;
  },
```

- [ ] **Step 2: Add reject hook + detail CRUD hooks to useBkmChecker.ts**

In `hooks/useBkmChecker.ts`, add after the existing imports:
```tsx
import type { UpdateBkmCheckerDetailPayload } from '@/types/bkm-checker';
```

After the `useApproveBkmChecker` function block (after line 75), add:
```tsx
export function useRejectBkmChecker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      bkmCheckerApi.reject(id, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.lists() });
    },
  });
}

export function useAddBkmCheckerDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBkmCheckerDetailPayload) => bkmCheckerApi.addDetail(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(variables.bkm_checker_id) });
    },
  });
}

export function useUpdateBkmCheckerDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBkmCheckerDetailPayload }) =>
      bkmCheckerApi.updateDetail(id, data),
    onSuccess: (_data, variables) => {
      const detail = _data;
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(detail.bkm_checker_id) });
    },
  });
}

export function useDeleteBkmCheckerDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, bkmCheckerId }: { id: string; bkmCheckerId: string }) =>
      bkmCheckerApi.deleteDetail(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(variables.bkmCheckerId) });
    },
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add services/bkm-checker.service.ts hooks/useBkmChecker.ts
git commit -m "feat: add reject + detail CRUD mutations for bkmChecker"
```

### Task 4.4: Fix cache invalidation on bkmPanen detail mutations

**Files:**
- Modify: `hooks/useBkmPanen.ts`

- [ ] **Step 1: Add invalidation to useUpdateBkmPanenDetail and useDeleteBkmPanenDetail**

In `hooks/useBkmPanen.ts`, change `useUpdateBkmPanenDetail` (lines 127-132) from:
```tsx
export function useUpdateBkmPanenDetail() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBkmPanenDetailPayload }) =>
      bkmPanenApi.updateDetail(id, data),
  });
}
```
to:
```tsx
export function useUpdateBkmPanenDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBkmPanenDetailPayload }) =>
      bkmPanenApi.updateDetail(id, data),
    onSuccess: (_data) => {
      const detail = _data;
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(detail.bkm_panen_id) });
    },
  });
}
```

And change `useDeleteBkmPanenDetail` (lines 134-138) from:
```tsx
export function useDeleteBkmPanenDetail() {
  return useMutation({
    mutationFn: (id: string) => bkmPanenApi.deleteDetail(id),
  });
}
```
to:
```tsx
export function useDeleteBkmPanenDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, bkmPanenId }: { id: string; bkmPanenId: string }) =>
      bkmPanenApi.deleteDetail(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(variables.bkmPanenId) });
    },
  });
}
```

Also need to import `useQueryClient` at the top if not already there — check line 1: it's already imported: `import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';` — good.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add hooks/useBkmPanen.ts
git commit -m "fix: add cache invalidation to bkmPanen detail mutations"
```

### Task 4.5: Fix hooks/index.ts barrel

**Files:**
- Modify: `hooks/index.ts`

- [ ] **Step 1: Add all missing exports**

Replace file content with:
```tsx
export { useUserGreeting } from './useUserGreeting';
export { useNetworkStatus } from './useNetworkStatus';
export { useSyncProcessor } from './useSyncProcessor';
export { useImageCapture } from './useImageCapture';
export { useLocation } from './useLocation';
export { useBkmPanenActions } from './useBkmPanenActions';
export {
  useBkmPanenList,
  useBkmPanenInfinite,
  useBkmPanenDetail,
  useCreateBkmPanen,
  useUpdateBkmPanen,
  useDeleteBkmPanen,
  useApproveBkmPanen,
  useRejectBkmPanen,
  useAddBkmPanenDetail,
  useUpdateBkmPanenDetail,
  useDeleteBkmPanenDetail,
  useSubmitBkmPanen,
} from './useBkmPanen';
export {
  useBkmCheckerList,
  useBkmCheckerDetail,
  useCreateBkmChecker,
  useUpdateBkmChecker,
  useDeleteBkmChecker,
  useApproveBkmChecker,
  useRejectBkmChecker,
  useAddBkmCheckerDetail,
  useUpdateBkmCheckerDetail,
  useDeleteBkmCheckerDetail,
  useSubmitBkmChecker,
} from './useBkmChecker';
export {
  useMaterialList,
  useMaterialDetail,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from './useMaterial';
export { useLahanList, useLahanDetail } from './useLahan';
export { useBlokList, useBlokDetail } from './useBlok';
export { useTphList, useTphDetail } from './useTph';
export { usePekerjaList, usePekerjaDetail } from './usePekerja';
export { useGrupPekerjaList, useGrupPekerjaDetail } from './useGrupPekerja';
export { useTipePekerjaanList, useTipePekerjaanDetail } from './useTipePekerjaan';
export { useKelompokLahanList, useKelompokLahanDetail } from './useKelompokLahan';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add hooks/index.ts
git commit -m "fix: complete hooks/index.ts barrel with all exports"
```

---

## SECTION 2: Navigation Overhaul

### Task 2.1: Wire up DrawerMenu handlers

**Files:**
- Modify: `components/core/DrawerMenu.tsx`

- [ ] **Step 1: Add queryClient import and router**

In `components/core/DrawerMenu.tsx`, add to imports:
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSegments } from 'expo-router';
import { Alert } from 'react-native';
```

- [ ] **Step 2: Replace handleMenuPress with real implementations**

Replace lines 33-57 (the hook setup and handleMenuPress) with:
```tsx
export function DrawerMenu() {
  const insets = useSafeAreaInsets();
  const { isOpen, closeDrawer } = useDrawerStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isOnline, connectionLabel } = useNetworkStatus();
  const queryClient = useQueryClient();
  const router = useRouter();
  const segments = useSegments();
  const currentGroup = segments[0] || "";

  const handleMenuPress = (item: DrawerMenuItem) => {
    closeDrawer();
    switch (item.id) {
      case "refresh":
        queryClient.invalidateQueries();
        break;
      case "sync":
        router.push("/(krani)" as any);
        break;
      case "history":
        Alert.alert("Coming Soon", "Riwayat respon akan segera hadir.");
        break;
      case "team":
        Alert.alert("Coming Soon", "Kelola tim akan segera hadir.");
        break;
      case "settings":
        router.push(`/${currentGroup}/${currentGroup === "(admin)" ? "settings" : "profile"}` as any);
        break;
      case "help":
        Alert.alert("Bantuan", "Hubungi admin untuk bantuan lebih lanjut.");
        break;
    }
  };
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add components/core/DrawerMenu.tsx
git commit -m "fix: wire up DrawerMenu handlers (refresh, sync, settings, help)"
```

### Task 2.2: Add DrawerMenu to Krani and Pemanen layouts

**Files:**
- Modify: `app/(krani)/_layout.tsx`
- Modify: `app/(pemanen)/_layout.tsx`

- [ ] **Step 1: Add drawer to krani layout**

In `app/(krani)/_layout.tsx`, add import:
```tsx
import { DrawerOverlay, DrawerMenu } from '@/components/home';
```

After `</Tabs>` closing tag (before `</View>`), add:
```tsx
      <DrawerOverlay />
      <DrawerMenu />
```

- [ ] **Step 2: Add drawer to pemanen layout**

In `app/(pemanen)/_layout.tsx`, add import:
```tsx
import { DrawerOverlay, DrawerMenu } from '@/components/home';
```

After `</Tabs>` closing tag (before `</View>`), add:
```tsx
      <DrawerOverlay />
      <DrawerMenu />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add app/(krani)/_layout.tsx app/(pemanen)/_layout.tsx
git commit -m "fix: add DrawerMenu to krani and pemanen layouts"
```

### Task 2.3: Fix MenuGrid route remapping validation

**Files:**
- Modify: `components/home/MenuGrid.tsx`

- [ ] **Step 1: Add route validation and fix unsafe remapping**

Read the current `handleMenuPress`. The issue is when `currentGroup` is something like `(admin)` and the remapped route becomes `/(admin)/rawat` which doesn't exist.

Add a whitelist of valid cross-group screen mappings:

Replace `handleMenuPress` (lines 107-129) with:
```tsx
  const VALID_SHARED_SCREENS: Record<string, string[]> = {
    "(mandor)": ["bkm", "rawat", "absensi", "profile"],
    "(asisten)": ["bkm", "laporan", "profile"],
    "(admin)": ["master-data", "users", "settings", "profile"],
    "(krani)": ["scan", "timbangan", "profile"],
    "(pemanen)": ["absensi", "profile"],
  };

  const handleMenuPress = (item: MenuItemType) => {
    if (["absensi", "planning", "laporan"].includes(item.id)) {
      Alert.alert("Coming Soon", `Fitur ${item.label} akan segera hadir.`);
      return;
    }
    if (item.route) {
      const itemGroupMatch = item.route.match(/^\(.*?\)/);
      const itemGroup = itemGroupMatch ? itemGroupMatch[0] : null;
      const pathAfterGroup = itemGroup ? item.route.slice(itemGroup.length + 1) : item.route;

      if (itemGroup && itemGroup !== currentGroup) {
        if (!pathAfterGroup) {
          Alert.alert("Info", `Fitur ${item.label} tersedia di menu utama anda.`);
          return;
        }
        const groupScreens = VALID_SHARED_SCREENS[currentGroup];
        if (!groupScreens || !groupScreens.includes(pathAfterGroup)) {
          Alert.alert("Info", `Fitur ${item.label} tidak tersedia di menu ini.`);
          return;
        }
        const resolved = `/${currentGroup}/${pathAfterGroup}` as RelativePathString;
        router.push({ pathname: resolved });
        return;
      }

      router.push({ pathname: item.route as RelativePathString });
    }
  };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add components/home/MenuGrid.tsx
git commit -m "fix: validate MenuGrid route remapping against valid shared screens"
```

### Task 2.4: Add route permission guards to all _layout.tsx files

**Files:**
- Modify: `app/(admin)/_layout.tsx`
- Modify: `app/(asisten)/_layout.tsx`
- Modify: `app/(mandor)/_layout.tsx`
- Modify: `app/(krani)/_layout.tsx`
- Modify: `app/(pemanen)/_layout.tsx`

- [ ] **Step 1: Add guard to admin layout**

In `app/(admin)/_layout.tsx`, add import:
```tsx
import { useAuthStore } from '@/stores/useAuthStore';
```

Add before the return statement in `AdminLayout()`:
```tsx
  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_lahan', 'read')) {
    return (
      <View style={styles.container}>
        <Text style={{ color: BrandColors.error, textAlign: 'center', marginTop: 100 }}>Akses ditolak</Text>
      </View>
    );
  }
```

Also add `Text` to the react-native import.

- [ ] **Step 2: Add guard to asisten layout**

Same pattern in `app/(asisten)/_layout.tsx`. Add import:
```tsx
import { Text } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
```

Add before return:
```tsx
  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_bkm_panen', 'read')) {
    return (
      <View style={styles.container}>
        <Text style={{ color: BrandColors.error, textAlign: 'center', marginTop: 100 }}>Akses ditolak</Text>
      </View>
    );
  }
```

- [ ] **Step 3: Add guard to mandor layout**

Same pattern in `app/(mandor)/_layout.tsx`. Add import:
```tsx
import { useAuthStore } from '@/stores/useAuthStore';
```

Note: `Text` is already imported from `react-native`. Add before return:
```tsx
  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_bkm_panen', 'read')) {
    return (
      <View style={styles.container}>
        <Text style={{ color: BrandColors.error, textAlign: 'center', marginTop: 100 }}>Akses ditolak</Text>
      </View>
    );
  }
```

- [ ] **Step 4: Add guard to krani layout**

Same pattern in `app/(krani)/_layout.tsx`. Add imports:
```tsx
import { Text } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
```

Add before return:
```tsx
  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_krani_timbang', 'read')) {
    return (
      <View style={styles.container}>
        <Text style={{ color: BrandColors.error, textAlign: 'center', marginTop: 100 }}>Akses ditolak</Text>
      </View>
    );
  }
```

- [ ] **Step 5: Add guard to pemanen layout**

Same pattern in `app/(pemanen)/_layout.tsx`. Add imports:
```tsx
import { Text } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
```

Add before return:
```tsx
  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_bkm_panen', 'read')) {
    return (
      <View style={styles.container}>
        <Text style={{ color: BrandColors.error, textAlign: 'center', marginTop: 100 }}>Akses ditolak</Text>
      </View>
    );
  }
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add app/(admin)/_layout.tsx app/(asisten)/_layout.tsx app/(mandor)/_layout.tsx app/(krani)/_layout.tsx app/(pemanen)/_layout.tsx
git commit -m "feat: add route permission guards to all role group layouts"
```

### Task 2.5: Final type-check and integration verification

**Files:**
- All

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 2: Verify no orphan imports**

Run: `npx tsc --noEmit --noUnusedLocals 2>&1 || true`
Check for any newly introduced unused imports.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: final type-check, all structure and hygiene tasks complete"
```
