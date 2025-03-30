import { FC } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

interface CompanyOverviewCardProps {
  description?: string;
}

const CompanyOverviewCard: FC<CompanyOverviewCardProps> = ({ description }) => (
  <Card className="border-gray-200 shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
        <InformationCircleIcon className="h-5 w-5 text-primary" />
        Company Overview
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-4">
      <p className="text-gray-700 leading-relaxed">
        {description || "No description available."}
      </p>
    </CardContent>
  </Card>
);

export default CompanyOverviewCard;
