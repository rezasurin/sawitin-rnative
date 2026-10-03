import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'device_id';

let cached: string | null = null;

/**
 * A stable identifier for this handset, minted once and kept in SecureStore.
 *
 * It survives sign-out on purpose: a shared device keeps its identity while the
 * person using it changes, which is exactly what lets queued work be attributed
 * to the worker who created it rather than to whoever is signed in now.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
  } catch {
    // A device whose keystore is unavailable still has to work; fall through
    // and mint an in-memory id for this run.
  }

  // Matches how queue ids are generated: this identifies a handset in telemetry
  // and scopes a lease, it is not a secret and needs no cryptographic strength.
  const minted = `dev_${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  cached = minted;
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, minted);
  } catch {
    // Not persisting means the next launch mints a new one. Sync still works;
    // only cross-restart device attribution is lost.
  }
  return minted;
}
