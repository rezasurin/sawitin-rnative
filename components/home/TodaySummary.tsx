import { BrandColors } from "@/constants/Colors";
import { useBkmCheckerList } from "@/hooks/useBkmChecker";
import { useBkmPanenList } from "@/hooks/useBkmPanen";
import { useKraniTimbangList } from "@/hooks/useKraniTimbang";
import { attendanceDb } from "@/services/database";
import { useAuthStore } from "@/stores/useAuthStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { RelativePathString, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

interface SummaryStat {
  id: string;
  label: string;
  value: string;
  icon: string;
  route?: string;
  params?: Record<string, string>;
}

const todayStr = () => new Date().toISOString().split("T")[0];

/**
 * TodaySummary Component
 * Single Responsibility: Role-aware "today" summary widget (backend-backed)
 */
export function TodaySummary() {
  const segments = useSegments();
  const currentGroup = segments[0] ?? "";

  if (currentGroup === "(mandor)" || currentGroup === "(asisten)") {
    return <PendingApprovalSummary group={currentGroup} />;
  }
  if (currentGroup === "(krani)") {
    return <KraniTodaySummary />;
  }
  if (currentGroup === "(pemanen)") {
    return <PemanenTodaySummary />;
  }
  return null;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <FontAwesome name={icon as any} size={16} color={BrandColors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatRow({ stats }: { stats: SummaryStat[] }) {
  const router = useRouter();
  return (
    <View style={styles.statsRow}>
      {stats.map((stat) => (
        <Pressable
          key={stat.id}
          style={styles.statItem}
          disabled={!stat.route}
          onPress={() => {
            if (!stat.route) return;
            if (stat.params) {
              router.push({
                pathname: stat.route as any,
                params: stat.params,
              });
            } else {
              router.push(stat.route as RelativePathString);
            }
          }}
        >
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Loading() {
  return (
    <ActivityIndicator
      color={BrandColors.primary}
      size="small"
      style={styles.loader}
    />
  );
}

function PendingApprovalSummary({ group }: { group: string }) {
  const { data: panen, isLoading: panenLoading } = useBkmPanenList({
    limit: 100,
  });
  const { data: checker, isLoading: checkerLoading } = useBkmCheckerList({
    limit: 100,
  });

  const pendingPanen =
    panen?.data?.filter((d) => d.status === "SUBMITTED").length ?? 0;
  const pendingChecker =
    checker?.data?.filter((d) => d.status === "SUBMITTED").length ?? 0;

  if (panenLoading || checkerLoading) {
    return (
      <SectionCard title="Menunggu Persetujuan" icon="hourglass-half">
        <Loading />
      </SectionCard>
    );
  }

  const stats: SummaryStat[] = [
    {
      id: "bkm-panen",
      label: "BKM Panen",
      value: String(pendingPanen),
      icon: "book",
      route: `/(${group.slice(1, -1)})/bkm`,
      params: { status: "SUBMITTED" },
    },
  ];

  if (group === "(mandor)") {
    stats.push({
      id: "bkm-checker",
      label: "BKM Checker",
      value: String(pendingChecker),
      icon: "check-square-o",
      route: "/(mandor)/checker",
      params: { status: "SUBMITTED" },
    });
  }

  return (
    <SectionCard title="Menunggu Persetujuan" icon="hourglass-half">
      <StatRow stats={stats} />
    </SectionCard>
  );
}

function KraniTodaySummary() {
  const { data, isLoading } = useKraniTimbangList({ limit: 100 });

  const today = todayStr();
  const todays = data?.data?.filter((d) => d.tanggal === today) ?? [];
  const count = todays.length;
  const totalNetto = todays.reduce(
    (acc, d) => acc + (Number(d.netto) || 0),
    0,
  );

  if (isLoading) {
    return (
      <SectionCard title="Timbangan Hari Ini" icon="truck">
        <Loading />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Timbangan Hari Ini" icon="truck">
      <StatRow
        stats={[
          {
            id: "count",
            label: "Jumlah Timbangan",
            value: String(count),
            icon: "truck",
            route: "/(krani)/timbangan",
          },
          {
            id: "netto",
            label: "Total Netto",
            value: `${(totalNetto / 1000).toFixed(1)} t`,
            icon: "balance-scale",
            route: "/(krani)/timbangan",
          },
        ]}
      />
    </SectionCard>
  );
}

function PemanenTodaySummary() {
  const user = useAuthStore((s) => s.user);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const userCode = user?.username || "pekerja";

  useEffect(() => {
    let isMounted = true;
    attendanceDb
      .getAll(userCode)
      .then((history) => {
        if (isMounted) {
          const today = todayStr();
          setTodayCount(
            history.filter((h) => String(h.date).startsWith(today)).length,
          );
        }
      })
      .catch(() => {
        if (isMounted) setTodayCount(0);
      });
    return () => {
      isMounted = false;
    };
  }, [userCode]);

  return (
    <SectionCard title="Absensi Hari Ini" icon="hand-pointer-o">
      {todayCount === null ? (
        <Loading />
      ) : (
        <StatRow
          stats={[
            {
              id: "absensi",
              label: todayCount > 0 ? "Sudah Absen" : "Belum Absen",
              value: String(todayCount),
              icon: "calendar-check-o",
              route: "/(pemanen)/absensi",
            },
          ]}
        />
      )}
    </SectionCard>
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
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textPrimary,
  },
  loader: {
    alignSelf: "flex-start",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: BrandColors.white,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: BrandColors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
});
