import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ScenarioCard from "./ScenarioCard";
import {
  FaRocket,
  FaLayerGroup,
  FaChartArea,
  FaBalanceScale,
  FaChartLine,
} from "react-icons/fa";
import {
  GiBull,
  GiPolarBear,
  GiSkullCrossedBones,
  GiSunset,
} from "react-icons/gi";

const scenarios = [
  { name: "Golden Cross", icon: GiSunset },
  { name: "Death Cross", icon: GiSkullCrossedBones },
  { name: "Breakout from Consolidation", icon: FaRocket },
  { name: "Stocks in Consolidation", icon: FaLayerGroup },
  { name: "MACD Bullish Crossover", icon: GiBull },
  { name: "MACD Bearish Crossover", icon: GiPolarBear },
  { name: "Bollinger Band Breakouts", icon: FaChartArea },
  { name: "Break Even Point", icon: FaBalanceScale },
  { name: "Earnings Growth Scans", icon: FaChartLine },
];

const ScanningScenarios = () => {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  const updateArrows = () => {
    if (carouselRef.current) {
      setShowLeftArrow(carouselRef.current.scrollLeft > 0);
      setShowRightArrow(
        carouselRef.current.scrollLeft <
          carouselRef.current.scrollWidth - carouselRef.current.clientWidth
      );
    }
  };

  useEffect(() => {
    updateArrows();
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(updateArrows, 300);
    }
  };

  return (
    <section className="relative">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Choose a Scanning Scenario
      </h2>
      <div className="relative px-8">
        {showLeftArrow && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white"
            onClick={() => handleScroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div
          ref={carouselRef}
          className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory scrollbar-hide"
          onScroll={updateArrows}
        >
          {scenarios.map((scenario, index) => (
            <ScenarioCard key={index} {...scenario} />
          ))}
        </div>
        {showRightArrow && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white"
            onClick={() => handleScroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </section>
  );
};

export default ScanningScenarios;
