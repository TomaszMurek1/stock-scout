import axios, {  InternalAxiosRequestConfig } from "axios";
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


apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
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
        if (config.headers) {
          config.headers.set("Authorization", `Bearer ${localStorage.getItem("authToken")}`);
        }
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
      const originalRequest = error.config;
      
      // Prevent infinite loop on refresh endpoint errors
      if (error.response?.status === 401 && 
          originalRequest.url?.includes("/auth/refresh")) {
        clearAuth();
        window.location.href = "/signin";
        return Promise.reject(error);
      }
  
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


let failedRequests: Array<() => void> = [];
let refreshAttempts = 0;
let lastRefreshAttempt = 0;
const MAX_REFRESH_ATTEMPTS = 2;
const REFRESH_COOLDOWN_MS = 5000;

async function handleTokenRefresh(): Promise<void> {
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      clearAuth();
      throw new Error("Maximum refresh attempts reached");
    }
  
    const now = Date.now();
    if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
      throw new Error("Refresh too frequent");
    }
  
    refreshAttempts++;
    lastRefreshAttempt = now;
  
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token available");
  
      const { data } = await refreshTokenRequest(refreshToken);
      
      refreshAttempts = 0;
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
  
      // Retry queued requests
      while (failedRequests.length > 0) {
        const retry = failedRequests.shift();
        retry?.();
      }
    } catch (error) {
      refreshAttempts = MAX_REFRESH_ATTEMPTS;
      clearAuth();
      
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.detail || "Refresh failed");
      } else if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error during refresh");
    }
  }

function clearAuth(): void {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  delete apiClient.defaults.headers.common["Authorization"];
}