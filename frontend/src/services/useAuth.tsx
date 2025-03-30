// useAuth.tsx
import { useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { refreshTokenRequest } from "../services/authService";

interface TokenPayload {
  exp: number;
  sub: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = localStorage.getItem("authToken");
    return !!token;
  });

  // Function to refresh the access token
  const refreshAccessToken = async () => {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    console.log("Trying to refresh token:", storedRefreshToken);
    if (!storedRefreshToken) return;
    try {
      const response = await refreshTokenRequest(storedRefreshToken);
      console.log("Refreshed successfully:", response.data);
      const { access_token } = response.data;
      localStorage.setItem("authToken", access_token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to refresh token ❌", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      setIsAuthenticated(false);
    }
  };

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const decoded = jwtDecode<TokenPayload>(token);
        if (decoded.exp * 1000 < Date.now()) {
          await refreshAccessToken();
        } else {
          setIsAuthenticated(true); // ✅ might be skipped if setState is stale
        }
      } catch (error) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, [refreshAccessToken]);
  

  useEffect(() => {
    checkAuth();
  }, []);

  // Adjusted login: expects token data with both tokens
  const login = useCallback((tokenData: { access_token: string; refresh_token: string }) => {
    localStorage.setItem("authToken", tokenData.access_token);
    localStorage.setItem("refreshToken", tokenData.refresh_token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout, checkAuth, refreshAccessToken };
};
