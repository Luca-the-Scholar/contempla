import React, { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface IOSPickerWheelProps {
  options: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

export function IOSPickerWheel({ 
  options, 
  value, 
  onChange,
  className 
}: IOSPickerWheelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedIndex = options.findIndex(opt => opt.value === value);
  const centerOffset = Math.floor(VISIBLE_ITEMS / 2);
  const selectedLabel = options.find(opt => opt.value === value)?.label || '';

  // Scroll to the selected value when expanded
  useEffect(() => {
    if (isExpanded && containerRef.current && !isScrollingRef.current) {
      const targetScroll = selectedIndex * ITEM_HEIGHT;
      containerRef.current.scrollTop = targetScroll;
    }
  }, [selectedIndex, isExpanded]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(options.length - 1, newIndex));
      
      containerRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth'
      });

      if (options[clampedIndex] && options[clampedIndex].value !== value) {
        onChange(options[clampedIndex].value);
      }

      isScrollingRef.current = false;
    }, 100);
  }, [options, value, onChange]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const containerHeight = ITEM_HEIGHT * VISIBLE_ITEMS;

  // Collapsed state - just a button showing current selection
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl",
          "bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors",
          "text-foreground font-medium",
          className
        )}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  // Expanded state - full picker wheel
  return (
    <div className={cn("relative", className)}>
      <div 
        className="relative overflow-hidden rounded-xl bg-muted/50 border border-border/50"
        style={{ height: containerHeight }}
      >
        {/* Gradient overlays */}
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
                  "flex items-center justify-center snap-center transition-all duration-150 cursor-pointer",
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
      
      {/* Done button to collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full mt-2 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
