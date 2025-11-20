import { Star, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StarTechniqueCardProps {
  technique: {
    id: string;
    name: string;
    tradition: string;
    is_favorite: boolean;
    mastery?: number;
    lastPracticed?: string;
  };
  onToggleFavorite: () => void;
  onViewDetails: () => void;
}

export function StarTechniqueCard({ 
  technique, 
  onToggleFavorite, 
  onViewDetails 
}: StarTechniqueCardProps) {
  const navigate = useNavigate();
  const mastery = technique.mastery || 0;
  
  // Determine if recently practiced (within last 24 hours)
  const isRecentlyPracticed = technique.lastPracticed 
    ? (new Date().getTime() - new Date(technique.lastPracticed).getTime()) < 24 * 60 * 60 * 1000
    : false;

  // Color progression: purple (0-33) → blue (33-66) → white (66-100)
  const getStarColor = () => {
    if (mastery < 33) {
      return "hsl(270, 70%, 60%)"; // Purple
    } else if (mastery < 66) {
      return "hsl(210, 90%, 65%)"; // Blue
    } else {
      return "hsl(0, 0%, 95%)"; // Near white
    }
  };

  // Glow intensity increases with mastery
  const getGlowIntensity = () => {
    const baseOpacity = 0.2;
    const maxOpacity = 0.8;
    return baseOpacity + (mastery / 100) * (maxOpacity - baseOpacity);
  };

  const starColor = getStarColor();
  const glowOpacity = getGlowIntensity();

  return (
    <div className="relative group">
      {/* Glow effect container */}
      <div 
        className="absolute inset-0 rounded-full blur-xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${starColor} 0%, transparent 70%)`,
          opacity: glowOpacity,
          transform: 'scale(1.2)',
        }}
      />
      
      {/* Star card */}
      <div
        className={`
          relative w-32 h-32 rounded-full 
          backdrop-blur-sm border-2 
          transition-all duration-700 cursor-pointer
          flex flex-col items-center justify-center
          hover:scale-110
          ${isRecentlyPracticed ? 'animate-twinkle' : ''}
        `}
        style={{
          borderColor: starColor,
          background: `radial-gradient(circle at 30% 30%, ${starColor}40, ${starColor}10)`,
          boxShadow: `
            0 0 20px ${starColor}${Math.floor(glowOpacity * 255).toString(16)},
            inset 0 0 20px ${starColor}20
          `,
        }}
        onClick={() => navigate(`/timer?technique=${technique.id}`)}
      >
        {/* Core star center */}
        <div 
          className="absolute w-8 h-8 rounded-full animate-pulse"
          style={{
            background: starColor,
            boxShadow: `0 0 15px ${starColor}`,
            opacity: 0.6 + (mastery / 100) * 0.4,
          }}
        />

        {/* Technique name */}
        <div className="relative z-10 text-center px-3">
          <p 
            className="font-semibold text-xs mb-1 leading-tight"
            style={{ color: starColor }}
          >
            {technique.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {mastery.toFixed(0)}%
          </p>
        </div>

        {/* Favorite indicator */}
        {technique.is_favorite && (
          <div className="absolute top-2 right-2">
            <Sparkles 
              className="w-3 h-3 animate-pulse" 
              style={{ color: starColor }}
            />
          </div>
        )}

        {/* Recently practiced indicator */}
        {isRecentlyPracticed && (
          <div 
            className="absolute inset-0 rounded-full border-2 animate-ping"
            style={{ borderColor: starColor, opacity: 0.3 }}
          />
        )}
      </div>

      {/* Action buttons on hover */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="text-xs px-2 py-1 rounded bg-card/90 hover:bg-card border border-border backdrop-blur-sm"
        >
          <Star 
            className={`w-3 h-3 ${technique.is_favorite ? 'fill-current' : ''}`}
            style={{ color: starColor }}
          />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="text-xs px-2 py-1 rounded bg-card/90 hover:bg-card border border-border backdrop-blur-sm text-foreground"
        >
          Info
        </button>
      </div>
    </div>
  );
}
