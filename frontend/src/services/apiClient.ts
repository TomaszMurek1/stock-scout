import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { refreshTokenRequest } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface TokenPayload {
  exp: number;
  sub: string;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<void> | null = null;

// Add proper TypeScript interface for error config
interface RetryableRequestConfig extends axios.AxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.request.use(async (config: RetryableRequestConfig) => {
  const token = localStorage.getItem("authToken");
  
  // Skip token check for refresh requests
  if (config.url?.includes("/auth/refresh")) return config;

  if (token) {
    try {
        console.log("Token:", token);
      const decoded = jwtDecode<TokenPayload>(token);
      const isExpired = decoded.exp * 1000 < Date.now() + 60000; // 1 min buffer

      if (isExpired) {
        if (!refreshPromise) {
          refreshPromise = handleTokenRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        // Update token after refresh
        config.headers.Authorization = `Bearer ${localStorage.getItem("authToken")}`;
      }
    } catch (error) {
      clearAuth();
      throw error;
    }
  }
  
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await handleTokenRefresh();
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuth();
        window.location.href = "/signin";
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

async function handleTokenRefresh(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token available");
    
    const { data } = await refreshTokenRequest(refreshToken);
    localStorage.setItem("authToken", data.access_token);
    localStorage.setItem("refreshToken", data.refresh_token);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
  } catch (error) {
    clearAuth();
    throw error;
  }
}

function clearAuth(): void {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  delete apiClient.defaults.headers.common["Authorization"];
}