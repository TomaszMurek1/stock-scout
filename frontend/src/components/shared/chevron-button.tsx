import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChevronButtonProps {
  direction: "left" | "right";
  onClick: () => void;
}

const ChevronButton: React.FC<ChevronButtonProps> = ({
  direction,
  onClick,
}) => {
  const isLeft = direction === "left";
  const Icon = isLeft ? ChevronLeft : ChevronRight;

  return (
    <Button
      variant="outline"
      size="icon"
      className={`absolute ${
        isLeft ? "left-2" : "right-2"
      } top-1/2 -translate-y-1/2 z-10 rounded-full bg-white hover:bg-gray-100 border border-gray-300 shadow-md h-10 w-10`}
      onClick={onClick}
      aria-label={isLeft ? "Previous" : "Next"}
    >
      <Icon className="h-6 w-6 text-gray-600" />
    </Button>
  );
};

export default ChevronButton;
