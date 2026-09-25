import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { Alert } from 'react-native';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: async (error) => {
      const status = (error as { status?: number }).status;
      if (status === 409) {
        await queryClient.invalidateQueries();
        Alert.alert('Dokumen berubah', 'Data terbaru dimuat. Periksa perubahan sebelum mencoba kembali.');
      } else if (status === 401 || status === 403) {
        Alert.alert('Akses ditolak', status === 401 ? 'Silakan masuk kembali.' : 'Izin tindakan ini tidak tersedia.');
      }
    },
  }),
  defaultOptions: {
    mutations: { networkMode: 'always', retry: false },
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      // Master-data services answer from their own SQLite cache when a request
      // fails, so the query function must always run. The default 'online' mode
      // pauses a query instead of calling it once onlineManager reports offline,
      // which would leave field forms empty with a usable cache sitting on disk.
      networkMode: 'always',
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.user?.id !== previous.user?.id) queryClient.clear();
  }), []);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
