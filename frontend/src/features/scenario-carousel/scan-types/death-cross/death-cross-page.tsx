import { Skull } from "lucide-react";
import CrossScanPage from "../cross/CrossScanPage";

export default function DeathCrossScanPage() {
  return (
    <CrossScanPage
      crossType="death"
      icon={Skull}
      dateColorClass="text-red-700"
      i18nPrefix="scans.death_cross"
      endpoint="/technical-analysis/death-cross"
    />
  );
}
