import { useUserScope } from "@/hooks/useUserScope";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  sub: string;
  scope: string;
}

export function ScopeDebug() {
  const { scope, isAdmin, isAdminOrDemo } = useUserScope();
  
  const getEmail = () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.sub;
    } catch {
      return null;
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#000',
      color: '#fff',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
    }}>
      <div><strong>Debug Info:</strong></div>
      <div>Email: {getEmail() || 'Not logged in'}</div>
      <div>Scope: {scope || 'null'}</div>
      <div>isAdmin: {isAdmin() ? 'true' : 'false'}</div>
      <div>isAdminOrDemo: {isAdminOrDemo() ? 'true' : 'false'}</div>
    </div>
  );
}
