interface Point {
  x: number;
  y: number;
  id: string;
}

interface ConstellationLinesProps {
  points: Point[];
  color?: string;
}

export function ConstellationLines({ points, color = "hsl(210, 100%, 70%)" }: ConstellationLinesProps) {
  if (points.length < 2) return null;

  // Calculate lines between nearby points
  const lines: Array<[Point, Point]> = [];
  
  points.forEach((point, i) => {
    // Connect to next point in circular pattern
    const nextPoint = points[(i + 1) % points.length];
    lines.push([point, nextPoint]);
  });

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {lines.map(([start, end], i) => {
        const distance = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        // Only draw lines if points are reasonably close (within 300px)
        if (distance > 300) return null;

        return (
          <line
            key={`${start.id}-${end.id}-${i}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.2"
            className="animate-pulse"
            style={{ animationDuration: "4s" }}
          />
        );
      })}
    </svg>
  );
}
