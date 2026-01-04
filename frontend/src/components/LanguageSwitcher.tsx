import { useTranslation } from 'react-i18next';
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Polandball-style flag components
const PolishFlag = ({ size = "w-8 h-8" }: { size?: string }) => (
  <div className={`${size} rounded-full overflow-hidden shadow-sm flex flex-col`}>
    <div className="h-1/2 bg-white"></div>
    <div className="h-1/2 bg-red-600"></div>
  </div>
);

const AmericanFlag = ({ size = "w-8 h-8" }: { size?: string }) => (
  <div className={`${size} rounded-full overflow-hidden shadow-sm relative`}>
    {/* Red and white stripes */}
    <div className="absolute inset-0 flex flex-col">
      <div className="h-[14.28%] bg-red-600"></div>
      <div className="h-[14.28%] bg-white"></div>
      <div className="h-[14.28%] bg-red-600"></div>
      <div className="h-[14.28%] bg-white"></div>
      <div className="h-[14.28%] bg-red-600"></div>
      <div className="h-[14.28%] bg-white"></div>
      <div className="h-[14.28%] bg-red-600"></div>
    </div>
    {/* Blue canton */}
    <div className="absolute top-0 left-0 w-[40%] h-[53%] bg-blue-800 rounded-tl-full"></div>
  </div>
);

const LANGUAGE_CONFIG = {
  en: {
    label: "English",
    FlagComponent: AmericanFlag,
  },
  pl: {
    label: "Polski",
    FlagComponent: PolishFlag,
  },
};

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language || 'en') as keyof typeof LANGUAGE_CONFIG;
  const config = LANGUAGE_CONFIG[currentLang] || LANGUAGE_CONFIG.en;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
      >
        <config.FlagComponent />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-800">
            {config.label}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 overflow-hidden">
          <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select Language</p>
          </div>
          
          <div className="my-1 border-t border-gray-100"></div>
          
          {Object.entries(LANGUAGE_CONFIG).map(([code, langConfig]) => (
            <button
              key={code}
              onClick={() => changeLanguage(code)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                currentLang === code
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <langConfig.FlagComponent size="w-6 h-6" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{langConfig.label}</span>
              </div>
              {currentLang === code && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
