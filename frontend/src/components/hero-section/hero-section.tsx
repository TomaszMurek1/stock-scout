import StockBanner from "./StockBanner";


const HeroSection = () => (

  <div className="relative h-64 rounded-lg overflow-hidden">
    <div className="absolute inset-0 flex items-center justify-center">
      <StockBanner />
    </div>
  </div>

);

export default HeroSection;
