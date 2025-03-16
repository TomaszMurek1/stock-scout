import {
  BarChart,
  Activity,
  TrendingUp,
  DollarSign,
  Percent,
} from "lucide-react";
import { SVGAttributes } from "react";
export type GenericIconType = React.FC<SVGAttributes<SVGElement>>;

interface Scenario {
  title: string;
  description: string;
  icon: GenericIconType; // Use the more generic icon type
  href: string;
  color: string;
  type: string;
}

export const scenarios: Scenario[] = [
  {
    title: "Golden Cross",
    description: "Identify potential uptrends with moving average crossovers",
    icon: BarChart,
    href: "/scenarios/golden-cross",
    color: "bg-slate-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "EV to revenue",
    description: "Create desc later ",
    icon: BarChart,
    href: "/scenarios/ev-to-revenue",
    color: "bg-neutral-200 bg-opacity-50",
    type: "ev-to-revenue",
  },
  {
    title: "Admin create tickers for market",
    description: "Create tiockers data for new market",
    icon: BarChart,
    href: "/admin/create-tickers",
    color: "bg-slate-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "Death Cross",
    description: "Identify potential downtrends with moving average crossovers",
    icon: BarChart,
    href: "/scenarios/death-cross",
    color: "bg-slate-200 bg-opacity-50",
    type: "death-cross",
  },
  {
    title: "Consolidation",
    description: "Find stocks trading in a specific range for a set duration",
    icon: Activity,
    href: "/scenarios/consolidation",
    color: "bg-gray-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "Break Even Point",
    description: "Discover stocks approaching their break-even levels",
    icon: TrendingUp,
    href: "/scenarios/break-even-point",
    color: "bg-zinc-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "Dividend Yield",
    description: "Scan for stocks with attractive dividend yields",
    icon: DollarSign,
    href: "/scenarios/dividend-yield",
    color: "bg-stone-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "Volatility",
    description: "Identify stocks with high or low volatility",
    icon: Percent,
    href: "/scenarios/volatility",
    color: "bg-neutral-200 bg-opacity-50",
    type: "golden-cross",
  },
];
