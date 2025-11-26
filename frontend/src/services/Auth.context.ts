import { createContext } from "react";

export interface AuthContextType {
  isAuthenticated: boolean;
  login: (tokens: { access_token: string; refresh_token: string }) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
