import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Link } from "react-router-dom"; // Assuming you're using React Router
import { ArrowRight } from "lucide-react";

import { GenericIconType } from "./ScenarioCarousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ScenarioCardProps {
  title: string;
  description: string;
  icon?: GenericIconType;
  href: string;
  color: string;
  scenarioType: string;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  title,
  description,
  icon: Icon,
  href,
  color,
  scenarioType,
}: ScenarioCardProps) => {
  const navigate = useNavigate();

  const handleStartScan = () => {
    navigate(`/${scenarioType.toLowerCase()}-form`);
  };
  return (
    <div className="flex-none w-[300px] h-[240px] snap-center">
      <Link to={href} className="block h-full">
        <Card
          className={cn(
            "h-full hover:shadow-lg transition-shadow flex flex-col",
            color
          )}
        >
          <CardHeader className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className="w-6 h-6 text-gray-700" />}
              <CardTitle className="text-xl font-bold text-gray-800">
                {title}
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600 text-left">{description}</p>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button
              onClick={handleStartScan}
              variant="outline"
              className="w-full bg-white text-gray-700 hover:bg-gray-50"
            >
              Start Scan <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

export default ScenarioCard;
