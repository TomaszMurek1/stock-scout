import { useState, useRef, useEffect, SVGAttributes } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  BarChart,
  Activity,
  TrendingUp,
  DollarSign,
  Percent,
} from "lucide-react";
import ScenarioCard from "./ScenarioCard"; // Import the ScenarioCard

export type GenericIconType = React.FC<SVGAttributes<SVGElement>>;
// Type definition for the scenario
interface Scenario {
  title: string;
  description: string;
  icon: GenericIconType; // Use the more generic icon type
  href: string;
  color: string;
  type: string;
}

// const scenarios = [
//     { name: "Golden Cross", icon: GiSunset },
//     { name: "Death Cross", icon: GiSkullCrossedBones },
//     { name: "Breakout from Consolidation", icon: FaRocket },
//     { name: "Stocks in Consolidation", icon: FaLayerGroup },
//     { name: "MACD Bullish Crossover", icon: GiBull },
//     { name: "MACD Bearish Crossover", icon: GiPolarBear },
//     { name: "Bollinger Band Breakouts", icon: FaChartArea },
//     { name: "Break Even Point", icon: FaBalanceScale },
//     { name: "Earnings Growth Scans", icon: FaChartLine },
//   ];

const scenarios: Scenario[] = [
  {
    title: "Golden Cross",
    description: "Identify potential uptrends with moving average crossovers",
    icon: BarChart,
    href: "/scenarios/golden-cross",
    color: "bg-slate-200 bg-opacity-50",
    type: "golden-cross",
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
    href: "/scenarios/break-even",
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

// color: "bg-slate-100",
// "bg-gray-100",
// color: "bg-neutral-100",
// color: "bg-stone-100",
// color: "bg-zinc-100",
// color: "bg-gray-100",

const ScenarioCarousel = () => {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  const updateArrows = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(updateArrows, 300); // Allow some time for smooth scrolling
    }
  };

  useEffect(() => {
    updateArrows();
  }, []);

  return (
    <section className="relative px-4 py-8 md:px-6 lg:px-8">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Choose a Scanning Scenario
      </h2>
      <div className="relative px-8">
        {showLeftArrow && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white hover:bg-gray-100 border border-gray-300 shadow-md h-10 w-10 flex items-center justify-center"
            onClick={() => scroll("left")}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />{" "}
            {/* Ensure correct icon size with h-6 w-6 */}
          </Button>
        )}
        <div
          ref={carouselRef}
          className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory scrollbar-hide"
          onScroll={updateArrows}
        >
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.href}
              title={scenario.title}
              description={scenario.description}
              icon={scenario.icon}
              href={scenario.href}
              color={scenario.color}
              type={scenario.type}
            />
          ))}
        </div>
        {showRightArrow && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white hover:bg-gray-100 border border-gray-300 shadow-md h-10 w-10"
            onClick={() => scroll("right")}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />{" "}
          </Button>
        )}
      </div>
    </section>
  );
};

export default ScenarioCarousel;
