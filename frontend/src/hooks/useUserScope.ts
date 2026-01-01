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
        console.log("[useUserScope] No access token found");
        return null;
      }
      
      const decoded = jwtDecode<DecodedToken>(token);
      console.log("[useUserScope] Decoded token:", decoded);
      console.log("[useUserScope] User scope:", decoded.scope);
      return decoded.scope;
    } catch (error) {
      console.error("[useUserScope] Failed to decode token:", error);
      return null;
    }
  };

  const hasScope = (requiredScopes: DecodedToken["scope"][]): boolean => {
    const userScope = getScope();
    console.log("[useUserScope] hasScope check - userScope:", userScope, "requiredScopes:", requiredScopes);
    if (!userScope) return false;
    const result = requiredScopes.includes(userScope);
    console.log("[useUserScope] hasScope result:", result);
    return result;
  };

  const isAdmin = (): boolean => {
    const result = hasScope(["admin"]);
    console.log("[useUserScope] isAdmin:", result);
    return result;
  };

  const isAdminOrDemo = (): boolean => {
    const result = hasScope(["admin", "demo"]);
    console.log("[useUserScope] isAdminOrDemo:", result);
    return result;
  };

  return {
    scope: getScope(),
    hasScope,
    isAdmin,
    isAdminOrDemo,
  };
}
