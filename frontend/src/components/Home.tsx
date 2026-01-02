// import FeaturesSection from "./to-be-used/feature-section";
// import CallToActions from "@/components/to-be-used/call-to-actions";
import { CompanySearch } from "@/features/company-search/CompanySearch";
import HeroSection from "@/features/hero-section/hero-section";
import { LinkToPortfolio } from "@/features/portfolio-management/LinkToPortfolio";
import ScenarioCarousel from "@/features/scenario-carousel/scenario-carousel";
import { useLocation } from "react-router-dom";

export default function Home() {
  const location = useLocation();
  return (
    <div className="max-w-[1400px] mx-auto p-8">
      <HeroSection />
      <ScenarioCarousel />
      <div className="mx-auto px-4 py-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-10">
        <CompanySearch
          containerClassName="p-0 m-0"
          contentClassName="p-0 m-0 bg-transparent shadow-none"
        />
        {location.pathname === "/" && (
          <LinkToPortfolio
            containerClassName="p-0 m-0"
            contentClassName="p-0 m-0 bg-transparent shadow-none"
          />
        )}
      </div>
      {/* <FeaturesSection /> */}
      {/* <CallToActions /> */}
    </div>
  );
}
