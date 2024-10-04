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
import ScenarioCard from "./scenario-card/scenario-card"; // Import the ScenarioCard

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

const ScenarioCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      const cardElement = carouselRef.current.children[index] as HTMLElement;
      cardElement.scrollIntoView({
        behavior: "smooth",
        inline: "center",
      });
      setActiveIndex(index);
    }
  };

  const scroll = (direction: "left" | "right") => {
    const newIndex = direction === "left" ? activeIndex - 1 : activeIndex + 1;
    if (newIndex >= 0 && newIndex < scenarios.length) {
      scrollToIndex(newIndex);
    }
  };

  useEffect(() => {
    scrollToIndex(activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="relative px-4 py-8 md:px-6 lg:px-8 overflow-visible">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Choose a Scanning Scenario
      </h2>
      <div className="relative overflow-visible">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white hover:bg-gray-100 border border-gray-300 shadow-md h-10 w-10"
          onClick={() => scroll("left")}
          aria-label="Previous"
          disabled={activeIndex === 0}
        >
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </Button>

        <div
          ref={carouselRef}
          className="flex overflow-x-auto overflow-y-visible pb-4 snap-x snap-mandatory hide-scrollbar space-x-4 px-4"
        >
          {scenarios.map((scenario, index) => (
            <ScenarioCard
              key={scenario.href}
              {...scenario}
              isActive={activeIndex === index}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white hover:bg-gray-100 border border-gray-300 shadow-md h-10 w-10"
          onClick={() => scroll("right")}
          aria-label="Next"
          disabled={activeIndex === scenarios.length - 1}
        >
          <ChevronRight className="h-6 w-6 text-gray-600" />
        </Button>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-4">
          {scenarios.map((_, index) => (
            <button
              key={index}
              className={`mx-1 h-2 w-2 rounded-full ${
                activeIndex === index ? "bg-gray-800" : "bg-gray-400"
              }`}
              onClick={() => scrollToIndex(index)}
              aria-label={`Scenario ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScenarioCarousel;
