import React, { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ScanResultCardProps {
  ticker: string;
  name: string;
  details: ReactNode;
  queryParams?: string;
}

export const DefaultScanResultCard = ({
  ticker,
  name,
  details,
  queryParams = "",
}: ScanResultCardProps) => {
  return (
    <Link
      to={`/stock-details/${ticker}${queryParams}`}
      className="
        flex items-center
        bg-white p-4
        rounded-lg border border-slate-300
        hover:bg-slate-200 transition cursor-pointer shadow-sm
      "
    >
      {/* Name box: fixed width, truncate */}
      <div
        className="flex-shrink-0 w-64 text-left truncate overflow-hidden whitespace-nowrap"
        title={name}
      >
        <span className="text-slate-900 mr-2">{name}</span> 
        <span className="text-slate-600 text-sm  mr-2">({ticker})</span>
        
      </div>

      <div className="flex-1"></div>

      <div className="flex items-center text-sm text-slate-600 space-x-4">
        {details}
      </div>
    </Link>
  );
};

interface ScanResultListProps {
  children: ReactNode;
  title?: string;
}

export const DefaultScanResultList = ({ children, title = "Scan Results" }: ScanResultListProps) => {
  return (
    <div className="mt-8 bg-slate-100 p-6 rounded-lg border border-slate-200 shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">{title}</h3>
      <div className="flex flex-col space-y-3">{children}</div>
    </div>
  );
};
