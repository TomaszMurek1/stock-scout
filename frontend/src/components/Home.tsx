import ScenarioCarousel from "./scenario-carousel/scenario-carousel";
// import FeaturesSection from "./to-be-used/feature-section";
// import CallToActions from "@/components/to-be-used/call-to-actions";
import HeroSection from "./hero-section/hero-section";
import { LinkToPortfolio } from "./portfolio-management/LinkToPortfolio";
import { CompanySearch } from "./company-search/CompanySearch";
import { useLocation } from "react-router-dom";

export default function Home() {
  const location = useLocation();
  return (
    <div className="container p-8">
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
