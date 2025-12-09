import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const opacity = Math.min(progress * 1.5, 1);
  const scale = 0.5 + progress * 0.5;
  const rotation = progress * 360;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{
        height: pullDistance,
        opacity,
      }}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center",
          isRefreshing && "animate-pulse"
        )}
        style={{
          transform: isRefreshing 
            ? `scale(1)` 
            : `scale(${scale}) rotate(${rotation}deg)`,
          transition: isRefreshing ? 'transform 0.2s ease' : 'none',
        }}
      >
        <Loader2 
          className={cn(
            "w-5 h-5 text-primary",
            isRefreshing && "animate-spin"
          )} 
        />
      </div>
    </div>
  );
}
