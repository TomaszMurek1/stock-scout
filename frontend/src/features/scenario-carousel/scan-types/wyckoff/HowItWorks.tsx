import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const HowItWorksSection = () => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="mb-6 border border-blue-200 rounded-lg bg-blue-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Info className="text-blue-600" size={20} />
          <span className="font-semibold text-blue-900">{t("scans.wyckoff.how_it_works_title")}</span>
        </div>
        {expanded ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-blue-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-4">
          <p className="text-gray-600">{t("scans.wyckoff.how_it_works_intro")}</p>

          <div className="space-y-3">
            <div className="border-l-4 border-green-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.wyckoff.criterion1_title")}</h4>
              <p>{t("scans.wyckoff.criterion1_desc")}</p>
              <p className="text-xs text-gray-500 italic mt-1">{t("scans.wyckoff.criterion1_example")}</p>
            </div>

            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.wyckoff.criterion2_title")}</h4>
              <p dangerouslySetInnerHTML={{ __html: t("scans.wyckoff.criterion2_desc") }} />
              <p className="text-xs text-gray-500 italic mt-1">{t("scans.wyckoff.criterion2_example")}</p>
            </div>

            <div className="border-l-4 border-purple-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.wyckoff.criterion3_title")}</h4>
              <p dangerouslySetInnerHTML={{ __html: t("scans.wyckoff.criterion3_desc") }} />
              <p className="text-xs text-gray-500 italic mt-1">{t("scans.wyckoff.criterion3_example")}</p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.wyckoff.criterion4_title")}</h4>
              <p dangerouslySetInnerHTML={{ __html: t("scans.wyckoff.criterion4_desc") }} />
              <p className="text-xs text-gray-500 italic mt-1">{t("scans.wyckoff.criterion4_example")}</p>
            </div>

            <div className="border-l-4 border-red-500 pl-3">
              <h4 className="font-semibold text-gray-800">{t("scans.wyckoff.criterion5_title")}</h4>
              <p>{t("scans.wyckoff.criterion5_desc")}</p>
              <p className="text-xs text-gray-500 italic mt-1">{t("scans.wyckoff.criterion5_example")}</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-gray-200 mt-4">
            <h4 className="font-semibold text-gray-800 mb-2">{t("scans.wyckoff.overall_score_title")}</h4>
            <p dangerouslySetInnerHTML={{ __html: t("scans.wyckoff.overall_score_desc") }} />
          </div>

          <div className="bg-amber-50 p-3 rounded border border-amber-200 mt-2">
            <h4 className="font-semibold text-amber-900 mb-1">{t("scans.wyckoff.tip_title")}</h4>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li dangerouslySetInnerHTML={{ __html: t("scans.wyckoff.tip1") }} />
              <li>{t("scans.wyckoff.tip2")}</li>
              <li>{t("scans.wyckoff.tip3")}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
