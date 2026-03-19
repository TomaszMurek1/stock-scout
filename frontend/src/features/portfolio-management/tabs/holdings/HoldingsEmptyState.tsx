import { useTranslation } from "react-i18next";

export function HoldingsEmptyState() {
  const { t } = useTranslation();
  return (
    <div data-id="holdings-empty" className="p-8 text-center text-gray-500">
      {t("portfolio.holdings.empty_state")}
    </div>
  );
}
