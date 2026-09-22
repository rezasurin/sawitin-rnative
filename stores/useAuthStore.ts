import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthState, User, Role, Permission } from '@/types/auth';
import { authApi } from '@/services/auth';
import { lookupCacheDb } from '@/services/database';

const TOKEN_KEY = 'auth_token';

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
    try {
      if (token) {
        await authApi.logout(token);
      }
    } catch {
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
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
      if (token) {
        const profileData = await authApi.getProfile(token);
        set({
          user: profileData.user,
          token,
          roles: profileData.roles,
          permissions: profileData.permissions,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
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
