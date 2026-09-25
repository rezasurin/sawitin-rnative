export interface User {
  id: string;
  username: string;
  member: {
    id: string;
    nama: string;
    email?: string;
  } | null;
}

export interface Role {
  id: string;
  nama: string;
  deskripsi?: string;
}

export interface Permission {
  id: string; // e.g. "mod_bkm_panen"
  nama: string; // e.g. "BKM Panen Management"
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
  select: boolean;
  approve?: boolean; // Some modules might have approval logic
}

export interface LoginResponse {
  token: string;
  /** Single-use; replaced by every successful refresh. */
  refresh_token?: string;
  /** Access token lifetime in seconds. */
  expires_in?: number;
  user: User;
  roles: Role[];
  permissions: Permission[];
}

export interface ProfileResponse {
  user: User;
  roles: Role[];
  permissions: Permission[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  roles: Role[];
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
}
