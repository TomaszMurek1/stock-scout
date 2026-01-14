"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  onAdd: () => void;
  onAnalyze?: () => void;
}

export const Header: FC<HeaderProps> = ({ onAdd, onAnalyze }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1 text-left">
        <h1 className="text-2xl font-bold leading-tight block text-left" style={{ margin: 0, padding: 0, textAlign: 'left' }}>
          {t("portfolio_header.portfolio_management")}
        </h1>
        <p className="text-sm text-muted-foreground text-left" style={{ margin: 0, padding: 0, textAlign: 'left' }}>
          {t("portfolio_header.track_positions")}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onAnalyze} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800">
           ✨ AI Advisor
        </Button>
        <Button onClick={onAdd} className="bg-teal-600 hover:bg-teal-700 text-white border-none">
          {t("common.buy_instrument")}
        </Button>
      </div>
    </div>
  );
};
