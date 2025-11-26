import { FC } from "react";
import { Card } from "@/components/ui/Layout";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Nullable } from "../types/shared.types";

interface CompanyOverviewCardProps {
  description: Nullable<string>;
}

const CompanyOverviewCard: FC<CompanyOverviewCardProps> = ({ description }) => (
  <Card>
    <div className="p-4 border-b border-slate-100">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <InformationCircleIcon className="h-5 w-5 text-primary" />
        Company Overview
      </h3>
    </div>
    <div className="p-4">
      <p className="text-gray-700 leading-relaxed">
        {description || "No description available."}
      </p>
    </div>
  </Card>
);

export default CompanyOverviewCard;
