import React from "react";
import { ChevronRight } from "lucide-react";

const ScanTypeBreadcrumbs: React.FC<{
  selectedScan: string;
  setSelectedScan: (value: string) => void;
}> = ({ selectedScan, setSelectedScan }) => {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <a
            href="#"
            onClick={() => setSelectedScan("")}
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            Scan Types
          </a>
        </li>
        {selectedScan && (
          <li>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                {selectedScan}
              </span>
            </div>
          </li>
        )}
      </ol>
    </nav>
  );
};

export default ScanTypeBreadcrumbs;
