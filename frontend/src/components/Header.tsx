import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../services/Auth.hooks";
import { useUserScope } from "@/hooks/useUserScope";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { User, ChevronDown, Settings, LogOut, Bell } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useShallow } from "zustand/react/shallow";
import { useActiveAlertsCount } from "@/features/portfolio-management/hooks/useActiveAlertsCount";

interface DecodedToken {
  sub: string;
  scope: "admin" | "demo" | "paid_access" | "basic_access" | "read_only";
}

const SCOPE_LABELS = {
  admin: "Admin",
  demo: "Demo",
  paid_access: "Paid",
  basic_access: "Basic",
  read_only: "Read-Only",
};

const SCOPE_COLORS = {
  admin: "bg-red-100 text-red-800",
  demo: "bg-yellow-100 text-yellow-800",
  paid_access: "bg-purple-100 text-purple-800",
  basic_access: "bg-blue-100 text-blue-800",
  read_only: "bg-gray-100 text-gray-800",
};

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { scope } = useUserScope();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const fetchAlerts = useAppStore((state) => state.fetchAlerts);
  
  const activeAlertsCount = useActiveAlertsCount();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [isAuthenticated, fetchAlerts]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const email = getEmail();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      {/* Gradient accent line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />
      <div className="max-w-[1600px] mx-auto px-4 py-4">
        <nav className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gray-800">
            StockScan Pro
          </Link>
          <ul className="flex space-x-4 items-center">
            <li>
              <Link to="/" className="text-gray-600 hover:text-gray-800">
                {t("header.home")}
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-gray-600 hover:text-gray-800">
                {t("header.about")}
              </Link>
            </li>
            {/* <li>
              <Link to="/contact" className="text-gray-600 hover:text-gray-800">
                {t("header.contact")}
              </Link>
            </li> */}
            <li>
              <LanguageSwitcher />
            </li>
            <li>
              {isAuthenticated && email ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Bell 
                        className="h-5 w-5 text-gray-600 hover:text-gray-800 cursor-pointer" 
                        onClick={() => navigate('/portfolio-management', { state: { activeTab: 'alerts', scrollToTabs: true } })} 
                    />
                    {activeAlertsCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white pointer-events-none">
                        {activeAlertsCount}
                      </span>
                    )}
                  </div>

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-800">
                          {email.split('@')[0]}
                        </span>
                        {scope && (
                          <span className={`text-xs px-2 py-0.5 rounded ${SCOPE_COLORS[scope]}`}>
                            {SCOPE_LABELS[scope]}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Signed in as</p>
                          <p className="text-sm font-semibold text-gray-900 truncate mt-1">{email}</p>
                          {scope && (
                            <span className={`inline-block text-xs px-2 py-1 rounded mt-2 ${SCOPE_COLORS[scope]}`}>
                              {SCOPE_LABELS[scope]} Access
                            </span>
                          )}
                        </div>
                        
                        {(scope === "admin" || scope === "demo") && (
                          <>
                            <div className="my-1 border-t border-gray-100"></div>
                            <Link
                              to="/admin"
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              onClick={() => setShowMenu(false)}
                            >
                              <Settings className="w-4 h-4" />
                              <span className="font-medium">Admin Dashboard</span>
                            </Link>
                          </>
                        )}
                        
                        <div className="my-1 border-t border-gray-100"></div>
                        <button
                          onClick={() => {
                            logout();
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="bg-gray-800 text-white hover:bg-gray-700"
                  onClick={() => navigate('/signin')}
                >
                  Sign In
                </Button>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
