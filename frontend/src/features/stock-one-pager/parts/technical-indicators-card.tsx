import { FC } from "react";
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
  const metrics: MetricConfig[] = [
    {
      label: "Volatility (30d)",
      value: `${technicalAnalysis.volatility_30d}%`,
      description: "Annualized standard deviation of daily returns over the last 30 days.",
      definition: "Volatility = StdDev(Daily Returns) * sqrt(252)",
      criterion: "Higher values indicate more price movement risk.",
      status: technicalAnalysis.volatility_30d > 40 ? "warning" : "neutral",
      icon: <Activity className="w-4 h-4" />,
      isProgressBar: true,
      progressValue: technicalAnalysis.volatility_30d,
      progressMax: 100,
    },
    {
      label: "Golden Cross",
      value: technicalAnalysis.golden_cross ? "Yes" : "No",
      description: "Bullish signal where short-term moving average crosses above long-term moving average.",
      definition: "50-day SMA > 200-day SMA",
      criterion: "A positive signal for potential upward trend.",
      status: technicalAnalysis.golden_cross ? "success" : "neutral",
      icon: <Sun className="w-4 h-4" />,
    },
    {
      label: "Death Cross",
      value: technicalAnalysis.death_cross ? "Yes" : "No",
      description: "Bearish signal where short-term moving average crosses below long-term moving average.",
      definition: "50-day SMA < 200-day SMA",
      criterion: "A negative signal for potential downward trend.",
      status: technicalAnalysis.death_cross ? "danger" : "neutral",
      icon: <Skull className="w-4 h-4" />,
    },
  ];

  return (
    <MetricGroupCard
      title="Technical Indicators"
      titleIcon={<ChartBar className="h-5 w-5" />}
      metrics={metrics}
      isRefreshed={isRefreshed}
    />
  );
};

export default TechnicalIndicatorsCard;
