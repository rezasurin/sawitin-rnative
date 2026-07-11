import { useEffect } from "react";
import * as Network from "expo-network";
import { useNetworkStore } from "@/stores";
import { ConnectionType } from "@/types/home";

/**
 * useNetworkStatus Hook
 * Single Responsibility: Subscribe to network state changes and update store
 */
export function useNetworkStatus() {
  const { isOnline, connectionType, connectionLabel, setNetworkStatus } =
    useNetworkStore();

  useEffect(() => {
    let isMounted = true;

    const checkNetworkStatus = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        if (isMounted) {
          const type: ConnectionType =
            networkState.type === Network.NetworkStateType.WIFI
              ? "wifi"
              : networkState.type === Network.NetworkStateType.CELLULAR
                ? "cellular"
                : networkState.type === Network.NetworkStateType.NONE
                  ? "none"
                  : "unknown";

          setNetworkStatus(networkState.isConnected ?? false, type);
        }
      } catch (error) {
        console.warn("Failed to get network status:", error);
        if (isMounted) {
          setNetworkStatus(false, "unknown");
        }
      }
    };

    // Initial check
    checkNetworkStatus();

    // Poll network status every 30 seconds (Expo doesn't have real-time network listener)
    const interval = setInterval(checkNetworkStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setNetworkStatus]);

  return {
    isOnline,
    connectionType,
    connectionLabel,
  };
}
