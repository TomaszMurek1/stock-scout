import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { GenericIconType } from "../scenario-carousel.helpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ScenarioCardProps {
  title: string;
  description: string;
  icon?: GenericIconType;
  href: string;
  color: string;
  type: string;
  isActive: boolean;
  onClick: () => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  title,
  description,
  icon: Icon,
  href,
  color,
  isActive,
  onClick,
}) => {
  const navigate = useNavigate();

  const handleStartScan = () => {
    navigate(`${href}`);
  };

  return (
    <div
      className={`flex-shrink-0 w-[300px] h-[240px] snap-center mt-2 relative`}
      onClick={onClick}
      style={{ overflow: "visible" }}
    >
      <div
        className={`transition-transform duration-300 ${
          isActive ? "scale-105" : "scale-100"
        } absolute inset-0`}
        style={{ transformOrigin: "center" }}
      >
        <Card
          className={cn(
            "h-full hover:shadow-lg transition-shadow flex flex-col overflow-visible",
            color,
            isActive ? "shadow-xl opacity-100" : "opacity-50",
            isActive ? "border-2 border-teal-500" : ""
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
              Activate Scan <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScenarioCard;
