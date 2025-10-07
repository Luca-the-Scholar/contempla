import { useRef, useEffect, useState } from "react";

interface TimeWheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
  label: string;
}

export function TimeWheelPicker({ value, onChange, max, label }: TimeWheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const items = Array.from({ length: max + 1 }, (_, i) => i);
  const itemHeight = 48;
  
  useEffect(() => {
    if (scrollRef.current && !isDragging) {
      scrollRef.current.scrollTop = value * itemHeight;
    }
  }, [value, isDragging]);
  
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const newValue = Math.round(scrollTop / itemHeight);
      if (newValue !== value && newValue >= 0 && newValue <= max) {
        onChange(newValue);
      }
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="relative h-[144px] w-20">
        {/* Selection indicator */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y-2 border-primary/20 bg-primary/5 pointer-events-none rounded-lg" />
        
        {/* Scrollable wheel */}
        <div
          ref={scrollRef}
          className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={handleScroll}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
        >
          {/* Top padding */}
          <div style={{ height: itemHeight }} />
          
          {items.map((item) => (
            <div
              key={item}
              className="flex items-center justify-center snap-center"
              style={{ height: itemHeight }}
            >
              <span className={`text-2xl font-medium transition-opacity ${
                item === value ? "text-foreground opacity-100" : "text-muted-foreground opacity-40"
              }`}>
                {item.toString().padStart(2, "0")}
              </span>
            </div>
          ))}
          
          {/* Bottom padding */}
          <div style={{ height: itemHeight }} />
        </div>
      </div>
    </div>
  );
}
