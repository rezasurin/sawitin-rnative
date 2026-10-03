import { LoginResponse, ProfileResponse } from "@/types";
import { apiClient } from "./api";

export const authApi = {
  /**
   * Login with username and password
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    
    const response = await apiClient.post<LoginResponse>('/login', {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (token: string): Promise<ProfileResponse> => {
    const response = await apiClient.get<ProfileResponse>('/login/profile', {
      headers: {
        Authorization: token,
      },
    });
    return response.data;
  },

  /**
   * Logout current user. Passing the refresh token ends only this device's
   * session; without it the server cannot tell which device is leaving and
   * ends every session the user has.
   */
  logout: async (token: string, refreshToken?: string | null): Promise<void> => {
    await apiClient.post('/logout', refreshToken ? { refresh_token: refreshToken } : null, {
      headers: {
        Authorization: token,
      },
    });
  },
};