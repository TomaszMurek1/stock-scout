import React, { FC, ReactElement, useEffect, useRef, useState } from "react";

interface PersistentResponsiveContainerProps {
  children: ReactElement;
  width?: string | number;
  height?: string | number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

/**
 * A wrapper that behaves like Recharts ResponsiveContainer but maintains
 * the last valid dimensions when the container is hidden (size became 0),
 * preventing "width(0) and height(0)" warnings and unnecessary re-renders.
 */
export const PersistentResponsiveContainer: FC<PersistentResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minWidth = 0,
  minHeight = 0,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Only update dimensions if they are non-zero
        // This keeps the chart rendered at the last known size when hidden (display: none)
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(element);

    // Initial measure
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, minWidth, minHeight }}
    >
      {dimensions.width > 0 && dimensions.height > 0 ? (
        React.cloneElement(children, {
          width: dimensions.width,
          height: dimensions.height,
        })
      ) : null}
    </div>
  );
};
