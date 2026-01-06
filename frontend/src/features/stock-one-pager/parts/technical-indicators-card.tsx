import { FC } from "react";
import { useTranslation } from "react-i18next";
import { StockData, MetricConfig } from "../stock-one-pager.types";
import { MetricGroupCard } from "../components/metric-group-card";
import { 
  Sun, 
  Skull, 
  Activity,
  ChartBar
} from "lucide-react";

interface TechnicalIndicatorsCardProps {
  technicalAnalysis: StockData["technical_analysis"];
  isRefreshed?: boolean;
}

const TechnicalIndicatorsCard: FC<TechnicalIndicatorsCardProps> = ({
  technicalAnalysis,
  isRefreshed = false,
}) => {
  const { t } = useTranslation();

  const metrics: MetricConfig[] = [
    {
      id: "volatility_30d",
      label: t("stock_one_pager.technical_indicators.volatility_30d.label"),
      value: `${technicalAnalysis.volatility_30d}%`,
      description: t("stock_one_pager.technical_indicators.volatility_30d.description"),
      definition: t("stock_one_pager.technical_indicators.volatility_30d.definition"),
      criterion: t("stock_one_pager.technical_indicators.volatility_30d.criterion"),
      status: technicalAnalysis.volatility_30d > 40 ? "warning" : "neutral",
      icon: <Activity className="w-4 h-4" />,
      isProgressBar: true,
      progressValue: technicalAnalysis.volatility_30d,
      progressMax: 100,
    },
    {
      id: "golden_cross",
      label: t("stock_one_pager.technical_indicators.golden_cross.label"),
      value: technicalAnalysis.golden_cross ? "Yes" : "No",
      description: t("stock_one_pager.technical_indicators.golden_cross.description"),
      definition: t("stock_one_pager.technical_indicators.golden_cross.definition"),
      criterion: t("stock_one_pager.technical_indicators.golden_cross.criterion"),
      status: technicalAnalysis.golden_cross ? "success" : "neutral",
      icon: <Sun className="w-4 h-4" />,
    },
    {
      id: "death_cross",
      label: t("stock_one_pager.technical_indicators.death_cross.label"),
      value: technicalAnalysis.death_cross ? "Yes" : "No",
      description: t("stock_one_pager.technical_indicators.death_cross.description"),
      definition: t("stock_one_pager.technical_indicators.death_cross.definition"),
      criterion: t("stock_one_pager.technical_indicators.death_cross.criterion"),
      status: technicalAnalysis.death_cross ? "danger" : "neutral",
      icon: <Skull className="w-4 h-4" />,
    },
  ];

  return (
    <MetricGroupCard
      title={t("stock_one_pager.metric_groups.technical_indicators")}
      titleIcon={<ChartBar className="h-5 w-5" />}
      metrics={metrics}
      isRefreshed={isRefreshed}
    />
  );
};

export default TechnicalIndicatorsCard;
