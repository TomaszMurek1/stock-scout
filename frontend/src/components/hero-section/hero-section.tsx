import { BarChart } from "lucide-react";

const HeroSection = () => (
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
        <p className="text-2xl font-bold text-white">Powerful Stock Analysis</p>
      </div>
    </div>
  </section>
);

export default HeroSection;
