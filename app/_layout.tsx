import { Stack, router } from "expo-router";
import { useEffect } from "react";

import { getRoleRouteGroup } from "@/constants/navigation";
import { QueryProvider } from "@/providers";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSyncProcessor } from "@/hooks/useSyncProcessor";
import { useMasterCacheWarmup } from "@/hooks/useMasterCacheWarmup";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(auth)",
};

export default function RootLayout() {
  const restoreToken = useAuthStore((s) => s.restoreToken);

  useEffect(() => {
    restoreToken();
  }, []);

  return (
    <QueryProvider>
      <RootLayoutNav />
    </QueryProvider>
  );
}

function RootLayoutNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const roles = useAuthStore((s) => s.roles);

  // Process offline sync queue when authenticated and online
  useSyncProcessor();
  useMasterCacheWarmup();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/(auth)/login");
      return;
    }

    const primaryRole = roles[0]?.nama ?? "pemanen";
    const routeGroup = getRoleRouteGroup(primaryRole);
    router.replace(`/${routeGroup}` as never);
  }, [isAuthenticated, isLoading, roles]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(pemanen)" />
      <Stack.Screen name="(mandor)" />
      <Stack.Screen name="(krani)" />
      <Stack.Screen name="(asisten)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
