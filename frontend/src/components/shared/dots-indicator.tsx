interface DotsIndicatorProps {
  total: number;
  activeIndex: number;
  onClick: (index: number) => void;
}

const DotsIndicator: React.FC<DotsIndicatorProps> = ({
  total,
  activeIndex,
  onClick,
}) => {
  return (
    <div className="flex justify-center mb-4">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          className={`mx-1 h-2 w-2 rounded-full ${activeIndex === index ? "bg-gray-800" : "bg-gray-400"
            }`}
          onClick={() => onClick(index)}
          aria-label={`Scenario ${index + 1}`}
        />
      ))}
    </div>
  );
};

export default DotsIndicator;
