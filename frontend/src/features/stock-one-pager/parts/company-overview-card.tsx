import { FC } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Nullable } from "@/components/types/shared.types";
import { StockData } from "../stock-one-pager.types";
import { RefreshedCard, RefreshedHeader, RefreshedContent } from "../components/refreshed-card";

interface CompanyOverviewCardProps {
  description: Nullable<string>;
  isRefreshed?: boolean;
}

const CompanyOverviewCard: FC<CompanyOverviewCardProps> = ({ description, isRefreshed = false }) => (
  <RefreshedCard isRefreshed={isRefreshed}>
    <RefreshedHeader isRefreshed={isRefreshed} className="p-4 border-b border-slate-100 bg-slate-50/50">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <InformationCircleIcon className="h-5 w-5 text-primary" />
        Company Overview
      </h3>
    </RefreshedHeader>
    <RefreshedContent isRefreshed={isRefreshed} className="p-4">
      <p className="text-gray-700 leading-relaxed">
        {description || "No description available."}
      </p>
    </RefreshedContent>
  </RefreshedCard>
);

export default CompanyOverviewCard;
