import { useState, useRef, useEffect } from "react";
import ScenarioCard from "./scenario-card/scenario-card";
import { scenarios } from "./scenario-carousel.helpers";
import DotsIndicator from "../shared/dots-indicator";
import ChevronButton from "../shared/chevron-button";

const ScenarioCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      const cardElement = carouselRef.current.children[index] as HTMLElement;
      cardElement.scrollIntoView({
        behavior: "smooth",
        inline: "center",
      });
      setActiveIndex(index);
    }
  };

  const scroll = (direction: "left" | "right") => {
    const newIndex = direction === "left" ? activeIndex - 1 : activeIndex + 1;
    if (newIndex >= 0 && newIndex < scenarios.length) {
      scrollToIndex(newIndex);
    }
  };

  useEffect(() => {
    scrollToIndex(activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="relative px-4 py-8 md:px-6 lg:px-8 overflow-visible">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Choose a Scanning Scenario
      </h2>
      <div className="relative overflow-visible">
        <DotsIndicator
          total={scenarios.length}
          activeIndex={activeIndex}
          onClick={scrollToIndex}
        />
        <ChevronButton
          direction="left"
          onClick={() => scroll("left")}
          disabled={activeIndex === 0}
        />

        <div
          ref={carouselRef}
          className="flex overflow-x-auto overflow-y-visible pb-4 snap-x snap-mandatory hide-scrollbar space-x-4 px-4"
        >
          {scenarios.map((scenario, index) => (
            <ScenarioCard
              key={scenario.href}
              {...scenario}
              isActive={activeIndex === index}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>

        <ChevronButton
          direction="right"
          onClick={() => scroll("right")}
          disabled={activeIndex === scenarios.length - 1}
        />


      </div>
    </section>
  );
};

export default ScenarioCarousel;
