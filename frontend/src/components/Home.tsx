import ScenarioCarousel from "./scenario-carousel/scenario-carousel";
// import FeaturesSection from "./to-be-used/feature-section";
// import CallToActions from "@/components/to-be-used/call-to-actions";
import HeroSection from "./hero-section/hero-section";
import { LinkToPortfolio } from "./portfolio-management/LinkToPortfolio";
import { CompanySearch } from "./company-search/CompanySearch";

export default function Home() {
  return (
    <div className="container p-8">
      <HeroSection />
      <ScenarioCarousel />
      <CompanySearch />
      {location.pathname === "/" && <LinkToPortfolio />}
      {/* <FeaturesSection /> */}
      {/* <CallToActions /> */}
    </div>
  );
}
