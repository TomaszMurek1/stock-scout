import { useState, useCallback } from "react";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("authToken");
  });

  const login = useCallback((tokens: { access_token: string; refresh_token: string }) => {
    localStorage.setItem("authToken", tokens.access_token);
    localStorage.setItem("refreshToken", tokens.refresh_token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
};