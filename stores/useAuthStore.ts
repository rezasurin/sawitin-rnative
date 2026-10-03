import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthState, User, Role, Permission } from '@/types/auth';
import { authApi } from '@/services/auth';
import { ApiError, REFRESH_TOKEN_KEY, TOKEN_KEY } from '@/services/api';
import { lookupCacheDb } from '@/services/database';

const OFFLINE_PROFILE_KEY = 'auth_last_profile';

interface AuthStore extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
  hasPermission: (moduleId: string, action: keyof Omit<Permission, 'id' | 'nama'>) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  roles: [],
  permissions: [],
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    const data = await authApi.login(username, password);
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    if (data.refresh_token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
    }
    try {
      await SecureStore.setItemAsync(OFFLINE_PROFILE_KEY, JSON.stringify({
        user: data.user, roles: data.roles, permissions: data.permissions,
      }));
    } catch { /* An unavailable keystore must not reject a successful login. */ }
    set({
      user: data.user,
      token: data.token,
      roles: data.roles,
      permissions: data.permissions,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    const { token } = get();
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    try {
      if (token) {
        await authApi.logout(token, refreshToken);
      }
    } catch {
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    try { await SecureStore.deleteItemAsync(OFFLINE_PROFILE_KEY); } catch { /* Continue sign-out. */ }
    // A shared device must not leave one worker's master data readable by the
    // next person to sign in. Clearing costs one refetch after the next login.
    try {
      await lookupCacheDb.clearAll();
    } catch {
      // A cache that cannot be cleared must not block signing out.
    }
    set({
      user: null,
      token: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },

  restoreToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      // At launch the access token has usually expired, and may already have
      // been cleared. A surviving refresh token is still a session: the profile
      // call 401s, the api client refreshes, and the call is replayed.
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (token || refreshToken) {
        const profileData = await authApi.getProfile(token ?? '');
        try { await SecureStore.setItemAsync(OFFLINE_PROFILE_KEY, JSON.stringify(profileData)); } catch { /* Offline restore remains optional. */ }
        set({
          user: profileData.user,
          // Re-read: the profile call may have refreshed it.
          token: await SecureStore.getItemAsync(TOKEN_KEY),
          roles: profileData.roles,
          permissions: profileData.permissions,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      // Credentials only go on a definite auth failure. A launch with no
      // signal must not throw away a session that is still good.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* Fall through to sign-in. */ }
        try { await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY); } catch { /* Sign-in state is still cleared. */ }
        try { await SecureStore.deleteItemAsync(OFFLINE_PROFILE_KEY); } catch { /* Credentials are already cleared. */ }
      } else {
        // A connection failure must not hide a previously authenticated user's
        // own offline work or the last server-generated field summary.
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          const session = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY) ?? token;
          const profile = await SecureStore.getItemAsync(OFFLINE_PROFILE_KEY);
          if (session && profile) {
            const last = JSON.parse(profile) as { user: User; roles: Role[]; permissions: Permission[] };
            if (last.user?.id && Array.isArray(last.roles) && Array.isArray(last.permissions)) {
              set({ user: last.user, roles: last.roles, permissions: last.permissions,
                token, isAuthenticated: true, isLoading: false });
              return;
            }
          }
        } catch { /* Ignore an unreadable or unavailable offline profile. */ }
      }
      set({ isLoading: false });
    }
  },

  hasPermission: (moduleId, action) => {
    const { roles, permissions } = get();

    // Superuser bypass for Administrator
    const isSuperAdmin = roles.some(
      (role) => role.nama.toLowerCase() === 'administrator'
    );
    if (isSuperAdmin) return true;

    const perm = permissions.find((p) => p.id === moduleId);
    if (!perm) return false;
    return !!perm[action];
  },
}));
