import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Custom error class for API errors
class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Access tokens are short-lived; a refresh token renews them. A refresh token
 * is single-use, and the server treats a second use as theft and ends the
 * session. The sync engine fires many requests at once, so when they all hit
 * 401 together only one refresh may be in flight; the rest wait for it
 * instead of spending the same token again.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    // Plain axios, not apiClient: this call must not pass through the
    // interceptor that triggered it.
    const res = await axios.post(
      `${API_BASE_URL}/refresh`,
      { refresh_token: refreshToken },
      { timeout: 10000 }
    );
    await SecureStore.setItemAsync(TOKEN_KEY, res.data.token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.data.refresh_token);
    return res.data.token;
  } catch (error) {
    // Only a definite "no" from the server ends the session. Out in the field
    // a failed refresh is usually no signal, and the refresh token has to
    // survive that so the device recovers once it is back online.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
    return null;
  }
}

/** Endpoints where a 401 means bad credentials, not an expired access token. */
const NO_REFRESH_URLS = ['/login', '/refresh', '/logout'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    const status = error.response?.status || 500;
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH_URLS.includes(original.url ?? '')
    ) {
      original._retried = true;
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const token = await refreshInFlight;
      if (token) {
        original.headers.Authorization = token;
        return apiClient(original);
      }
    }

    if (status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    const message = error.response?.data?.error || error.message || 'An error occurred';
    throw new ApiError(message, status, error.response?.data);
  }
);

export { apiClient, ApiError };
