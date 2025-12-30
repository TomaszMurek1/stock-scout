import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart } from "lucide-react";

interface FormCardGeneratorProps {
  title: string;
  subtitle: string | React.ReactNode;
  children: React.ReactNode;
}

const FormCardGenerator = ({
  children,
  title,
  subtitle,
}: FormCardGeneratorProps) => (
  <Card className="w-full max-w-2xl mx-auto bg-zinc-50 mt-4 mb-4 shadow-lg overflow-hidden">
    <CardHeader className="from-blue-800 to-blue-900 bg-gradient-to-br border-b-4 border-blue-400 rounded-t-xl text-white">
      <div className="flex items-center gap-3">
        <BarChart className="w-6 h-6 text-blue-300" />
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      </div>
      {subtitle && (
        <div className="text-sm text-gray-200 mt-2 [&_ul]:!text-slate-200 [&_li]:!text-slate-200 [&_strong]:!text-white">
          {subtitle}
        </div>
      )}
    </CardHeader>
    <CardContent className="p-6 pt-4">{children}</CardContent>
  </Card>
);

export default FormCardGenerator;
