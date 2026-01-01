import React, { useState, useCallback, useEffect } from "react";
import { AuthContext } from "./Auth.context";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  exp: number;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!(localStorage.getItem("access_token") || localStorage.getItem("authToken"));
  });

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("refresh_token");
    setIsAuthenticated(false);
  }, []);

  // Sync state across tabs and handle external logouts
  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("access_token") || localStorage.getItem("authToken");
      
      if (!token) {
        if (isAuthenticated) setIsAuthenticated(false);
        return;
      }

      try {
        const decoded = jwtDecode<TokenPayload>(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        
        if (isExpired) {
          // If expired and we can't refresh (managed by apiClient), log out
          // For AuthProvider, we just care if we should show logged in state
          if (isAuthenticated) logout();
        } else if (!isAuthenticated) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (isAuthenticated) logout();
      }
    };

    window.addEventListener("storage", syncAuth);
    
    // Periodically check if token is still valid
    const interval = setInterval(syncAuth, 5000);

    return () => {
      window.removeEventListener("storage", syncAuth);
      clearInterval(interval);
    };
  }, [isAuthenticated, logout]);

  const login = useCallback((tokens: { access_token: string; refresh_token: string }) => {
    // Store with both keys for compatibility
    localStorage.setItem("authToken", tokens.access_token);
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refreshToken", tokens.refresh_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    setIsAuthenticated(true);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
