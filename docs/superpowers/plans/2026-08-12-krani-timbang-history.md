# Krani Timbang History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 3rd tab "Timbangan" show the krani's submission history by default, land there after saving, and open a read-only detail on tap.

**Architecture:** `timbangan.tsx` gains a `detailId` param → three states (history / form / detail). History is a new `KraniTimbangHistory` component reusing existing `useKraniTimbangList` + `kraniTimbangApi.getAll`. Post-save navigation stays on the timbangan tab instead of going to Beranda.

**Tech Stack:** Expo Router v6, TanStack Query v5, React Native StyleSheet, existing `BrandColors`, `ListEmptyState`, `DocStatusBadge`, `FAB` components.

**Spec:** `docs/superpowers/specs/2026-08-12-krani-timbang-history-design.md`

---

### Task 1: Create `components/krani/KraniTimbangHistory.tsx`

**Files:**
- Create: `components/krani/KraniTimbangHistory.tsx`

- [ ] **Step 1: Write the history list component**

```tsx
import { FAB } from '@/components/core/FAB';
import { ListEmptyState } from '@/components/core/ListEmptyState';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useKraniTimbangList } from '@/hooks/useKraniTimbang';
import type { KraniTimbang } from '@/types';
import { DocStatusBadge } from '@/components/bkm/DocStatusBadge';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

interface KraniTimbangHistoryProps {
  onCardPress: (id: string) => void;
  onScanPress: () => void;
}

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export function KraniTimbangHistory({ onCardPress, onScanPress }: KraniTimbangHistoryProps) {
  const { data, isLoading, isError, refetch, isRefetching } = useKraniTimbangList({
    page: 1,
    limit: 100,
    sort: 'created_at:desc',
  });

  const allItems = data?.data ?? [];
  const today = todayStr();
  const items = allItems.filter((i) => i.tanggal === today);

  return (
    <View style={styles.container}>
      <PageHeader title="Riwayat Timbangan" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TimbangCard item={item} onPress={() => onCardPress(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={styles.headerCount}>{items.length} penimbangan hari ini</Text>
          ) : null
        }
        ListEmptyComponent={
          <ListEmptyState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError}
            onRetry={() => refetch()}
            emptyIcon="time-outline"
            emptyText="Belum ada timbangan hari ini"
            emptySubtext="Pindai QR SPB untuk mulai penimbangan"
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[BrandColors.primary]}
          />
        }
      />

      <FAB onPress={onScanPress} />
    </View>
  );
}

function TimbangCard({ item, onPress }: { item: KraniTimbang; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="truck-outline" size={18} color={BrandColors.primary} />
          <Text style={styles.title}>{item.nama_supir}</Text>
        </View>
        <DocStatusBadge status={item.status} />
      </View>
      <Text style={styles.meta}>Kendaraan: {item.nomor_kendaraan}</Text>
      <Text style={styles.meta}>Tujuan: {item.tujuan_kirim}</Text>
      <Text style={styles.netto}>
        Netto: {item.netto?.toLocaleString('id-ID') ?? 0} kg
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listContent: { padding: 16, paddingBottom: 120 },
  headerCount: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary, flex: 1 },
  meta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  netto: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
    marginTop: 6,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add components/krani/KraniTimbangHistory.tsx
git commit -m "feat(krani): add timbang history list component"
```

---

### Task 2: Add `detailId` state + detail view to `app/(krani)/timbangan.tsx`

**Files:**
- Modify: `app/(krani)/timbangan.tsx`

- [ ] **Step 1: Update params + imports**

Change `useLocalSearchParams` to include `detailId`:

```tsx
const { checkerId, detailId } = useLocalSearchParams<{
  checkerId?: string;
  detailId?: string;
}>();
```

Add import for `useKraniTimbangDetail` and `KraniTimbangHistory`:

```tsx
import { KraniTimbangHistory } from "@/components/krani/KraniTimbangHistory";
import { useKraniTimbangDetail } from "@/hooks/useKraniTimbang";
```

Add detail query near the checker query:

```tsx
const {
  data: detail,
  isLoading: isDetailLoading,
  isError: isDetailError,
  refetch: refetchDetail,
} = useKraniTimbangDetail(detailId ?? "");
```

- [ ] **Step 2: Update navigation handlers**

Replace `handleBack` and post-save navigation so both clear params and stay on the tab (history):

```tsx
const handleBack = () => {
  router.setParams({ checkerId: undefined, detailId: undefined });
};
```

In `handleSubmit` onSuccess, replace:

```tsx
router.setParams({ checkerId: undefined });
router.replace("/(krani)");
```

with:

```tsx
router.setParams({ checkerId: undefined, detailId: undefined });
```

- [ ] **Step 3: Update PageHeader + render branches**

Update the header so history shows menu, form/detail show back:

```tsx
<PageHeader
  title={detailId ? "Detail Timbangan" : "Timbangan"}
  showMenuButton={!checkerId && !detailId}
  showBackButton={!!checkerId || !!detailId}
  onBack={handleBack}
/>
```

Change the top-level branch from `!checkerId ?` to `detailId ?` (detail first), then `checkerId ?` (form), then history:

```tsx
{detailId ? (
  <DetailTimbanganView
    detail={detail}
    isLoading={isDetailLoading}
    isError={isDetailError}
    onRetry={() => refetchDetail()}
  />
) : !checkerId ? (
  <KraniTimbangHistory
    onCardPress={(id) => router.push({ pathname: "/(krani)/timbangan", params: { detailId: id } })}
    onScanPress={() => router.push("/(krani)/scan")}
  />
) : (
  ... existing form JSX unchanged ...
)}
```

- [ ] **Step 4: Add the `DetailTimbanganView` component (same file, below the screen)**

```tsx
function DetailTimbanganView({
  detail,
  isLoading,
  isError,
  onRetry,
}: {
  detail?: KraniTimbang;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Memuat detail...</Text>
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View style={styles.centerContent}>
        <FontAwesome name="exclamation-triangle" size={48} color={BrandColors.error} />
        <Text style={styles.errorText}>Gagal memuat detail</Text>
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  const details = detail.details ?? [];
  const totalJanjang = details.reduce((acc, d) => acc + (Number(d.jumlah_janjang) || 0), 0);
  const totalBrondol = details.reduce((acc, d) => acc + (Number(d.jumlah_brondol) || 0), 0);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.detailScrollContent}>
      <View style={styles.infoCard}>
        <Text style={styles.cardHeaderTitle}>Informasi Dokumen</Text>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Nama Sopir</Text>
          <Text style={styles.value}>{detail.nama_supir || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Nomor Kendaraan</Text>
          <Text style={styles.value}>{detail.nomor_kendaraan || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tujuan Kirim</Text>
          <Text style={styles.value}>{detail.tujuan_kirim || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tanggal</Text>
          <Text style={styles.value}>{detail.tanggal || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Janjang / Brondol</Text>
          <Text style={styles.value}>
            {totalJanjang} Janjang / {totalBrondol} kg
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardHeaderTitle}>Hasil Timbangan</Text>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Timbang Isi (Gross)</Text>
          <Text style={styles.value}>
            {detail.timbang_isi?.toLocaleString("id-ID") ?? 0} kg
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Timbang Kosong (Tare)</Text>
          <Text style={styles.value}>
            {detail.timbang_kosong?.toLocaleString("id-ID") ?? 0} kg
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Berat Bersih (Netto)</Text>
          <Text style={[styles.value, { color: BrandColors.primary, fontWeight: "800" }]}>
            {detail.netto?.toLocaleString("id-ID") ?? 0} kg
          </Text>
        </View>
        {detail.keterangan ? (
          <Text style={styles.detailNote}>Catatan: {detail.keterangan}</Text>
        ) : null}
      </View>

      {details.length > 0 ? (
        <View style={styles.formCard}>
          <Text style={styles.cardHeaderTitle}>Detail Muatan</Text>
          <View style={styles.divider} />
          {details.map((d) => (
            <View key={d.id} style={styles.detailMuatanRow}>
              <Text style={styles.detailMuatanText}>
                {d.kelompok_lahan?.nama ?? d.kelompok_lahan_id} /{" "}
                {d.tph?.nama ?? d.tph_id}
              </Text>
              <Text style={styles.detailMuatanText}>
                {d.jumlah_janjang} jjg / {d.jumlah_brondol} kg
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Add the new styles + missing import**

Add `import type { KraniTimbang } from "@/types";` at the top.

Add to StyleSheet:

```ts
detailScrollContent: { padding: 16, paddingBottom: 40 },
detailNote: {
  fontSize: 13,
  color: BrandColors.textSecondary,
  fontStyle: "italic",
  marginTop: 12,
},
detailMuatanRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 8,
},
detailMuatanText: {
  fontSize: 14,
  color: BrandColors.textPrimary,
  flex: 1,
},
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 7: Commit**

```bash
git add app/(krani)/timbangan.tsx
git commit -m "feat(krani): timbang history + read-only detail in timbangan tab"
```

---

### Task 3: Verify

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 2: Manual flow verification checklist**

- Scan QR → weigh form opens (checkerId set).
- Fill weights → "Simpan Timbangan" → success alert → lands on history (Timbangan tab, Riwayat Timbangan).
- History shows today's entries with sopir, kendaraan, netto, status badge.
- Tap a row → read-only detail with gross/tare/netto + muatan.
- Back button from detail → returns to history.
- Empty state + retry render correctly.
- Pull-to-refresh works.
