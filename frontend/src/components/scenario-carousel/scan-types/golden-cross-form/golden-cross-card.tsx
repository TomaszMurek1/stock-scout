import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart } from "lucide-react";

interface GoldenCrossCardProps {
  children: React.ReactNode;
}

const GoldenCrossCard = ({ children }: GoldenCrossCardProps) => (
  <Card className="w-full max-w-xl mx-auto bg-zinc-200 mt-4 mb-4 ">
    <CardHeader className="border-b border-slate-200 pb-4">
      <CardTitle className="flex items-center space-x-3 text-slate-800">
        <BarChart className="w-6 h-6 text-slate-600" />
        <span className="text-xl font-semibold">Golden Cross Scan</span>
      </CardTitle>
      <CardDescription className="text-slate-600 mt-8 text-left">
        Set parameters to scan for stocks showing a Golden Cross pattern.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6 pt-4">{children}</CardContent>
  </Card>
);

export default GoldenCrossCard;
