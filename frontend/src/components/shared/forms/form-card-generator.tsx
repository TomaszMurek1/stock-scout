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
  <Card className="w-full max-w-2xl mx-auto bg-zinc-50 mt-4 mb-4 ">
    <CardHeader className="border-b border-gray-100 pb-4 bg-gray-300">
      <CardTitle className="flex items-center space-x-3 text-black">
        <BarChart className="w-6 h-6 text-black" />
        <span className="text-xl font-semibold">{title}</span>
      </CardTitle>
      <CardDescription className="text-black mt-8 text-left">
        {subtitle}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6 pt-4">{children}</CardContent>
  </Card>
);

export default FormCardGenerator;
