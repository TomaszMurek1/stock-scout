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
    title: "scenarios.golden_cross.title",
    description: "scenarios.golden_cross.description",
    icon: Sun,
    href: "/scenarios/golden-cross",
    color: "bg-slate-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "scenarios.fibonacci_elliott.title",
    description: "scenarios.fibonacci_elliott.description",
    icon: Waves,
    href: "/scenarios/fibonacci-elliott",
    color: "bg-purple-200 bg-opacity-50",
    type: "fibonacci-elliott",
  },
  {
    title: "scenarios.choch.title",
    description: "scenarios.choch.description",
    icon: Zap,
    href: "/scenarios/choch",
    color: "bg-blue-200 bg-opacity-50",
    type: "choch",
  },
  {
    title: "scenarios.ev_to_revenue.title",
    description: "scenarios.ev_to_revenue.description",
    icon: BarChart3,
    href: "/scenarios/ev-to-revenue",
    color: "bg-neutral-200 bg-opacity-50",
    type: "ev-to-revenue",
  },
  {
    title: "scenarios.admin.title",
    description: "scenarios.admin.description",
    icon: Settings,
    href: "/admin",
    color: "bg-slate-200 bg-opacity-50",
    type: "admin",
  },
  {
    title: "scenarios.death_cross.title",
    description: "scenarios.death_cross.description",
    icon: Skull,
    href: "/scenarios/death-cross",
    color: "bg-slate-200 bg-opacity-50",
    type: "death-cross",
  },
  {
    title: "scenarios.consolidation.title",
    description: "scenarios.consolidation.description",
    icon: Minus,
    href: "/scenarios/consolidation",
    color: "bg-gray-200 bg-opacity-50",
    type: "consolidation",
  },
  {
    title: "scenarios.wyckoff.title",
    description: "scenarios.wyckoff.description",
    icon: Activity,
    href: "/scenarios/wyckoff",
    color: "bg-emerald-200 bg-opacity-50",
    type: "wyckoff",
  },
  {
    title: "scenarios.break_even_point.title",
    description: "scenarios.break_even_point.description",
    icon: Target,
    href: "/scenarios/break-even-point",
    color: "bg-zinc-200 bg-opacity-50",
    type: "golden-cross",
  },
  {
    title: "scenarios.dividend_yield.title",
    description: "scenarios.dividend_yield.description",
    icon: DollarSign,
    href: "/scenarios/dividend-yield",
    color: "bg-stone-200 bg-opacity-50",
    type: "golden-cross",
    visible: false,
  },
  {
    title: "scenarios.volatility.title",
    description: "scenarios.volatility.description",
    icon: Percent,
    href: "/scenarios/volatility",
    color: "bg-neutral-200 bg-opacity-50",
    type: "golden-cross",
    visible: false,
  },
];
