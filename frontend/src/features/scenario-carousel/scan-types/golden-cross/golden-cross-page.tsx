import { Sun } from "lucide-react";
import CrossScanPage from "../cross/CrossScanPage";

export default function GoldenCrossScanPage() {
  return (
    <CrossScanPage
      crossType="golden"
      icon={Sun}
      dateColorClass="text-green-700"
      i18nPrefix="scans.golden_cross"
      endpoint="/technical-analysis/golden-cross"
    />
  );
}
