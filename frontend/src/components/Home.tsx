import ScenarioCarousel from "./scenario-carousel/ScenarioCarousel";
// import FeaturesSection from "./to-be-used/feature-section";
// import CallToActions from "@/components/to-be-used/call-to-actions";
import HeroSection from "./hero-section/hero-section";

export default function Home() {
  return (
    <div className="space-y-12 p-8">
      <HeroSection />
      <ScenarioCarousel />
      {/* <FeaturesSection /> */}
      {/* <CallToActions /> */}
    </div>
  );
}
