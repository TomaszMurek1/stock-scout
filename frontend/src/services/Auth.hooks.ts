import { useContext } from "react";
import { AuthContext } from "./Auth.context";
import { AuthContextType } from "./Auth.context";

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
