import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
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
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
