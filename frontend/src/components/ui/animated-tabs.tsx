"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const AnimatedTabs = TabsPrimitive.Root;

const AnimatedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
AnimatedTabsList.displayName = TabsPrimitive.List.displayName;

// Let's make a Specialized component that just takes `isSelected` for the visual part, 
// and wrap the Radix Trigger.
// Helper to merge refs
function useMergedRef<T>(...refs: (React.Ref<T> | undefined)[]) {
  return React.useCallback((element: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(element);
      } else if (ref && typeof ref === "object") {
        (ref as React.MutableRefObject<T | null>).current = element;
      }
    });
  }, [refs]); // ref dependencies should ideally be stable, but this is safe enough
}

const FramerTabTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    isSelected?: boolean; // Explicitly passed
    layoutId?: string;
  }
>(({ className, children, isSelected, layoutId = "active-tab-bg", ...props }, ref) => {
  const elementRef = React.useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRef(ref, elementRef);

  React.useEffect(() => {
    if (isSelected && elementRef.current) {
      elementRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [isSelected]);

  return (
    <TabsPrimitive.Trigger
      ref={mergedRef}
      className={cn(
        "group relative flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium uppercase tracking-wider transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 z-0",
        "text-muted-foreground hover:text-foreground",
        "data-[state=active]:text-foreground",
        className
      )}
      {...props}
    >
      {isSelected && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 bg-background shadow-sm rounded-md -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
FramerTabTrigger.displayName = "FramerTabTrigger";


const AnimatedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, forceMount, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    forceMount={forceMount}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:hidden",
      className
    )}
    {...props}
  />
));
AnimatedTabsContent.displayName = TabsPrimitive.Content.displayName;

export { AnimatedTabs, AnimatedTabsList, AnimatedTabsContent, FramerTabTrigger };
