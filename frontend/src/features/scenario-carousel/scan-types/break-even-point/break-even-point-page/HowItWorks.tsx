import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const HowItWorksSection = () => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="mb-6 border border-blue-200 rounded-lg bg-blue-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Info className="text-blue-600" size={20} />
          <span className="font-semibold text-blue-900">{t("scans.break_even_point.how_it_works_title")}</span>
        </div>
        {expanded ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-blue-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-4">
          <p className="text-gray-600">{t("scans.break_even_point.how_it_works_intro")}</p>

          <div className="space-y-3">
            <div className="border-l-4 border-red-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.break_even_point.criterion1_title")}</h4>
              <p dangerouslySetInnerHTML={{ __html: t("scans.break_even_point.criterion1_desc") }} />
            </div>

            <div className="border-l-4 border-green-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.break_even_point.criterion2_title")}</h4>
              <p dangerouslySetInnerHTML={{ __html: t("scans.break_even_point.criterion2_desc") }} />
              <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
                <li><code>{t("scans.break_even_point.criterion2_formula")}</code></li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.break_even_point.criterion3_title")}</h4>
              <p>{t("scans.break_even_point.criterion3_desc")}</p>
              <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
                <li><code>{t("scans.break_even_point.criterion3_formula")}</code></li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-gray-200 mt-4">
            <h4 className="font-semibold text-gray-800 mb-2">{t("scans.break_even_point.strategy_tip_title")}</h4>
            <p>{t("scans.break_even_point.strategy_tip_desc")}</p>
          </div>
        </div>
      )}
    </div>
  );
};
