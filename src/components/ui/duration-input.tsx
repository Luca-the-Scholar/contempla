import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DurationInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
}

export function DurationInput({ 
  value, 
  onChange,
  className,
  min = 0,
  max = 999
}: DurationInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow empty string (will be treated as 0)
    if (rawValue === '') {
      onChange(0);
      return;
    }
    
    // Parse the number, removing leading zeros
    const parsed = parseInt(rawValue, 10);
    
    // Only update if it's a valid number within range
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text on focus so user can immediately type to replace
    e.target.select();
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === 0 ? '' : value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="0"
        min={min}
        max={max}
        className={cn(
          "text-center text-2xl font-semibold h-14 pr-20",
          "bg-muted/50 border-border/50",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        )}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
        minutes
      </span>
    </div>
  );
}
