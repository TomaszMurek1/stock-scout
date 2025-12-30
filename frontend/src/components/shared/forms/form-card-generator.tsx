import {
  Card,
  CardContent,
  CardDescription,
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
    <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-900 border-b-2 border-blue-500 pb-4 rounded-t-lg">
      <CardTitle className="flex items-center space-x-3 text-white">
        <BarChart className="w-6 h-6 text-blue-300" />
        <span className="text-xl font-semibold">{title}</span>
      </CardTitle>
      <CardDescription className="text-slate-100 mt-2 text-left [&_ul]:!text-slate-200 [&_li]:!text-slate-200 [&_strong]:!text-white [&_p]:!text-slate-100">
        {subtitle}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6 pt-4">{children}</CardContent>
  </Card>
);

export default FormCardGenerator;
