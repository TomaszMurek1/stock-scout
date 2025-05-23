import ScenarioCarousel from "./scenario-carousel/scenario-carousel";
// import FeaturesSection from "./to-be-used/feature-section";
// import CallToActions from "@/components/to-be-used/call-to-actions";
import HeroSection from "./hero-section/hero-section";
import PortfolioLink from "./portfolio-management/portfolio-link";

export default function Home() {
  return (
    <div className="container space-y-12 p-8">
      <HeroSection />
      <ScenarioCarousel />
      {location.pathname === "/" && <PortfolioLink />}
      {/* <FeaturesSection /> */}
      {/* <CallToActions /> */}
    </div>
  );
}
