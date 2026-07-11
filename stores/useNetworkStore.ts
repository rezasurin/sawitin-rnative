import { create } from 'zustand';
import { ConnectionType, NetworkStatus } from '@/types/home';

/**
 * Network Store
 * Single Responsibility: Manages network connectivity state only
 */
interface NetworkState extends NetworkStatus {
  setNetworkStatus: (isOnline: boolean, connectionType: ConnectionType) => void;
}

const getConnectionLabel = (type: ConnectionType): string => {
  switch (type) {
    case 'wifi':
      return 'WiFi';
    case 'cellular':
      return 'Data seluler';
    case 'none':
      return 'Tidak ada koneksi';
    default:
      return 'Unknown';
  }
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  connectionType: 'unknown',
  connectionLabel: 'Unknown',
  setNetworkStatus: (isOnline, connectionType) =>
    set({
      isOnline,
      connectionType,
      connectionLabel: getConnectionLabel(connectionType),
    }),
}));
