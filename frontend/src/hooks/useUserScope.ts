import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  sub: string;
  scope: "admin" | "demo" | "paid_access" | "basic_access" | "read_only";
  exp: number;
  type: string;
  jti: string;
}

export function useUserScope() {
  const getScope = (): DecodedToken["scope"] | null => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        return null;
      }
      
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.scope;
    } catch (error) {
      return null;
    }
  };

  const hasScope = (requiredScopes: DecodedToken["scope"][]): boolean => {
    const userScope = getScope();
    if (!userScope) return false;
    const result = requiredScopes.includes(userScope);
    return result;
  };

  const isAdmin = (): boolean => {
    const result = hasScope(["admin"]);
    return result;
  };

  const isAdminOrDemo = (): boolean => {
    const result = hasScope(["admin", "demo"]);
    return result;
  };

  return {
    scope: getScope(),
    hasScope,
    isAdmin,
    isAdminOrDemo,
  };
}
