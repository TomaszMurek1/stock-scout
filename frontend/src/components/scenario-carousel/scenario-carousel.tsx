import { useState, useRef, useEffect } from "react";
import ScenarioCard from "./scenario-card/scenario-card";
import { scenarios } from "./scenario-carousel.helpers";
import DotsIndicator from "../shared/dots-indicator";
import ChevronButton from "../shared/chevron-button";

const ScenarioCarousel = () => {
  // Initialize from sessionStorage
  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = sessionStorage.getItem('carouselIndex');
    return saved ? parseInt(saved, 10) : 0;
  });
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);

  const scrollToIndex = (index: number, smooth: boolean = true) => {
    if (carouselRef.current) {
      const cardElement = carouselRef.current.children[index] as HTMLElement;
      cardElement.scrollIntoView({
        behavior: smooth ? "smooth" : "instant",
        inline: "center",
      });
      setActiveIndex(index);
      // Save to sessionStorage
      sessionStorage.setItem('carouselIndex', index.toString());
    }
  };

  const scroll = (direction: "left" | "right") => {
    let newIndex;
    let isWrapping = false;
    
    if (direction === "left") {
      // Wrap to last if on first
      if (activeIndex === 0) {
        newIndex = scenarios.length - 1;
        isWrapping = true;
      } else {
        newIndex = activeIndex - 1;
      }
    } else {
      // Wrap to first if on last
      if (activeIndex === scenarios.length - 1) {
        newIndex = 0;
        isWrapping = true;
      } else {
        newIndex = activeIndex + 1;
      }
    }
    
    // Use instant scroll for wrapping to create infinite wheel effect
    scrollToIndex(newIndex, !isWrapping);
  };

  useEffect(() => {
    // Initial scroll without animation
    scrollToIndex(activeIndex, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse wheel support with throttling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      // Throttle: only allow scroll every 200ms for fluid but controlled scrolling
      if (now - lastScrollTime.current < 200) {
        e.preventDefault();
        return;
      }
      
      lastScrollTime.current = now;
      e.preventDefault();
      
      if (e.deltaY > 0) {
        scroll("right");
      } else if (e.deltaY < 0) {
        scroll("left");
      }
    };

    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('wheel', handleWheel, { passive: false });
      return () => carousel.removeEventListener('wheel', handleWheel);
    }
  }, [activeIndex]);

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
        />


      </div>
    </section>
  );
};

export default ScenarioCarousel;
