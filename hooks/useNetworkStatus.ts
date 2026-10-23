import { useEffect } from "react";
import * as Network from "expo-network";
import { useNetworkStore } from "@/stores";
import { ConnectionType } from "@/types/home";

const typeOf = (type?: Network.NetworkStateType): ConnectionType =>
  type === Network.NetworkStateType.WIFI ? "wifi"
    : type === Network.NetworkStateType.CELLULAR ? "cellular"
    : type === Network.NetworkStateType.NONE ? "none"
    : "unknown";

/**
 * Online means the internet answers, not just a Wi-Fi or tower link: a phone on
 * one bar in a block is connected but cannot reach the server. Reachability the
 * platform has not measured yet counts as online, so a slow probe never hides the
 * online path; a failed request still falls back to the queue.
 */
const reachable = (state: Network.NetworkState) => !!state.isConnected && state.isInternetReachable !== false;

/** Keeps the network store live. Mount once, at the root; screens read `useNetworkStore`. */
export function useNetworkStatus() {
  const setNetworkStatus = useNetworkStore((state) => state.setNetworkStatus);

  useEffect(() => {
    let heard = false;
    const apply = (state: Network.NetworkState) => setNetworkStatus(reachable(state), typeOf(state.type));
    const subscription = Network.addNetworkStateListener((state) => { heard = true; apply(state); });
    // The first reading, unless a change event already superseded it.
    Network.getNetworkStateAsync()
      .then((state) => { if (!heard) apply(state); })
      .catch(() => { if (!heard) setNetworkStatus(false, "unknown"); });
    return () => subscription.remove();
  }, [setNetworkStatus]);
}
