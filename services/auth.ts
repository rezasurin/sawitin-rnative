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
   * Logout current user
   */
  logout: async (token: string): Promise<void> => {
    await apiClient.post('/logout', null, {
      headers: {
        Authorization: token,
      },
    });
  },
};