import ScenarioCarousel from "./ScenarioCarousel";
import FeaturesSection from "./FeatureSection";
import CallToActions from "@/components/CallToActions";
import HeroSection from "./HeroSection/HeroSection";

export default function Home() {
  return (
    <div className="space-y-12">
      <HeroSection />
      <ScenarioCarousel />
      <FeaturesSection />
      <CallToActions />
    </div>
  );
}
