import { BarChart, Activity, TrendingUp, DollarSign } from "lucide-react";

const FeaturesSection = () => (
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
);

export default FeaturesSection;
