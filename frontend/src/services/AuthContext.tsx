import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (tokens: { access_token: string; refresh_token: string }) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
