import React, { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface IOSPickerWheelProps {
  options: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const ITEM_HEIGHT = 44; // Height of each item in pixels
const VISIBLE_ITEMS = 5; // Number of visible items (must be odd)

export function IOSPickerWheel({ 
  options, 
  value, 
  onChange,
  className 
}: IOSPickerWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedIndex = options.findIndex(opt => opt.value === value);
  const centerOffset = Math.floor(VISIBLE_ITEMS / 2);

  // Scroll to the selected value on mount and when value changes externally
  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const targetScroll = selectedIndex * ITEM_HEIGHT;
      containerRef.current.scrollTop = targetScroll;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    isScrollingRef.current = true;

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce the snap and value update
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(options.length - 1, newIndex));
      
      // Snap to the nearest item
      containerRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth'
      });

      // Update value if changed
      if (options[clampedIndex] && options[clampedIndex].value !== value) {
        onChange(options[clampedIndex].value);
      }

      isScrollingRef.current = false;
    }, 100);
  }, [options, value, onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const containerHeight = ITEM_HEIGHT * VISIBLE_ITEMS;

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted/50",
        className
      )}
      style={{ height: containerHeight }}
    >
      {/* Gradient overlays for fade effect */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      
      {/* Selection indicator */}
      <div 
        className="absolute left-2 right-2 bg-primary/10 border-y border-primary/20 rounded-lg z-0 pointer-events-none"
        style={{ 
          top: centerOffset * ITEM_HEIGHT,
          height: ITEM_HEIGHT 
        }}
      />
      
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingTop: centerOffset * ITEM_HEIGHT,
          paddingBottom: centerOffset * ITEM_HEIGHT,
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          
          return (
            <div
              key={option.value}
              className={cn(
                "flex items-center justify-center snap-center transition-all duration-150",
                isSelected 
                  ? "text-foreground font-semibold text-lg" 
                  : "text-muted-foreground text-base"
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => {
                onChange(option.value);
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    top: index * ITEM_HEIGHT,
                    behavior: 'smooth'
                  });
                }
              }}
            >
              {option.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
