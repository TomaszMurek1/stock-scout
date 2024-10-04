import { BarChart, Activity, TrendingUp, DollarSign } from "lucide-react";

const features = [
  { icon: BarChart, text: "Advanced Algorithms" },
  { icon: Activity, text: "Real-Time Data" },
  { icon: TrendingUp, text: "Customizable Scans" },
  { icon: DollarSign, text: "Expert Insights" },
];

const Features = () => (
  <section className="bg-gray-100 rounded-lg p-8">
    <h2 className="text-3xl font-bold mb-4 text-gray-800">
      Why Choose StockScan Pro?
    </h2>
    <div className="grid grid-cols-2 gap-4">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center space-x-2">
          <feature.icon className="w-6 h-6 text-gray-700" />
          <span className="text-gray-700">{feature.text}</span>
        </div>
      ))}
    </div>
  </section>
);

export default Features;
