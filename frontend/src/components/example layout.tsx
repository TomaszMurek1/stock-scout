import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  BarChart,
  Activity,
  TrendingUp,
  ArrowRight,
  DollarSign,
  Percent,
} from "lucide-react";

const scenarios = [
  {
    title: "Golden Cross",
    description: "Identify potential uptrends with moving average crossovers",
    icon: BarChart,
    href: "/scenarios/golden-cross",
    color: "bg-slate-100",
  },
  {
    title: "Consolidation",
    description: "Find stocks trading in a specific range for a set duration",
    icon: Activity,
    href: "/scenarios/consolidation",
    color: "bg-gray-100",
  },
  {
    title: "Break Even Point",
    description: "Discover stocks approaching their break-even levels",
    icon: TrendingUp,
    href: "/scenarios/break-even",
    color: "bg-zinc-100",
  },
  {
    title: "Dividend Yield",
    description: "Scan for stocks with attractive dividend yields",
    icon: DollarSign,
    href: "/scenarios/dividend-yield",
    color: "bg-stone-100",
  },
  {
    title: "Volatility",
    description: "Identify stocks with high or low volatility",
    icon: Percent,
    href: "/scenarios/volatility",
    color: "bg-neutral-100",
  },
];

export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

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

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(updateArrows, 300);
    }
  };

  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">
          Welcome to StockScan Pro
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Discover trading opportunities with advanced stock scanning
        </p>
        <div className="relative h-64 bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <BarChart className="w-32 h-32 text-gray-300 opacity-20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-2xl font-bold text-white">
              Powerful Stock Analysis
            </p>
          </div>
        </div>
      </section>

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
              onClick={() => scroll("left")}
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
              <div key={index} className="flex-none w-[300px] snap-center">
                <Link href={scenario.href} className="block">
                  <Card
                    className={`h-full hover:shadow-lg transition-shadow ${scenario.color}`}
                  >
                    <CardHeader>
                      <scenario.icon className="w-10 h-10 mb-2 text-gray-700" />
                      <CardTitle className="text-gray-800">
                        {scenario.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {scenario.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        className="w-full bg-white text-gray-700 hover:bg-gray-50"
                      >
                        Start Scan <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
          {showRightArrow && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      <section className="bg-gray-100 rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">
          Why Choose StockScan Pro?
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <BarChart className="w-6 h-6 text-gray-700" />
            <span className="text-gray-700">Advanced Algorithms</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-gray-700" />
            <span className="text-gray-700">Real-Time Data</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-gray-700" />
            <span className="text-gray-700">Customizable Scans</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-6 h-6 text-gray-700" />
            <span className="text-gray-700">Expert Insights</span>
          </div>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">
          Ready to Start?
        </h2>
        <p className="text-xl text-gray-600 mb-6">
          Choose a scanning scenario above or learn more about our services.
        </p>
        <Button asChild className="bg-gray-800 text-white hover:bg-gray-700">
          <Link href="/about">Learn More</Link>
        </Button>
      </section>
    </div>
  );
}
