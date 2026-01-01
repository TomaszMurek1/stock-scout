import {
  Sun,
  Skull,
  Activity,
  DollarSign,
  Percent,
  Waves,
  Zap,
  BarChart3,
  Settings,
  Minus,
  Target,
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
  visible?: boolean; // Optional: defaults to true if not specified
}

export const scenarios: Scenario[] = [
  {
    title: "Golden Cross",
    description: "Identify potential uptrends with moving average crossovers",
    icon: Sun,
    href: "/scenarios/golden-cross",
    color: "bg-slate-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "Fibonacci & Elliott",
    description: "Analyze stocks using Fibonacci retracements and Elliott Wave theory",
    icon: Waves,
    href: "/scenarios/fibonacci-elliott",
    color: "bg-purple-200 bg-opacity-50",
    type: "fibonacci-elliott",
  },
  {
    title: "Change of Character",
    description: "Detect Bearish to Bullish trend reversal patterns (CHoCH)",
    icon: Zap,
    href: "/scenarios/choch",
    color: "bg-blue-200 bg-opacity-50",
    type: "choch",
  },
  {
    title: "EV to revenue",
    description: "Create desc later ",
    icon: BarChart3,
    href: "/scenarios/ev-to-revenue",
    color: "bg-neutral-200 bg-opacity-50",
    type: "ev-to-revenue",
  },
  {
    title: "Admin tools",
    description: "Access utilities like ticker import and FX batch loader",
    icon: Settings,
    href: "/admin",
    color: "bg-slate-200 bg-opacity-50",
    type: "admin",
  },
  {
    title: "Death Cross",
    description: "Identify potential downtrends with moving average crossovers",
    icon: Skull,
    href: "/scenarios/death-cross",
    color: "bg-slate-200 bg-opacity-50",
    type: "death-cross",
  },
  {
    title: "Consolidation",
    description: "Find stocks trading in a specific range for a set duration",
    icon: Minus,
    href: "/scenarios/consolidation",
    color: "bg-gray-200 bg-opacity-50",
    type: "consolidation",
  },
  {
    title: "Wyckoff Accumulation",
    description: "Detect accumulation phase using price/volume evidence",
    icon: Activity,
    href: "/scenarios/wyckoff",
    color: "bg-emerald-200 bg-opacity-50",
    type: "wyckoff",
  },
  {
    title: "Break Even Point",
    description: "Discover stocks approaching their break-even levels",
    icon: Target,
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
    visible: false,
  },
  {
    title: "Volatility",
    description: "Identify stocks with high or low volatility",
    icon: Percent,
    href: "/scenarios/volatility",
    color: "bg-neutral-200 bg-opacity-50",
    type: "golden-cross",
    visible: false,
  },
];
