import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Info, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TechniqueCardProps {
  technique: {
    id: string;
    name: string;
    tradition: string;
    is_favorite: boolean;
    mastery?: number;
  };
  onToggleFavorite: () => void;
  onViewDetails: () => void;
}

export function TechniqueCard({ technique, onToggleFavorite, onViewDetails }: TechniqueCardProps) {
  const navigate = useNavigate();
  const mastery = technique.mastery || 0;

  return (
    <Card className="p-4 hover:shadow-lg hover:shadow-primary/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{technique.name}</h3>
          <p className="text-sm text-muted-foreground">{technique.tradition}</p>
        </div>
        <button
          onClick={onToggleFavorite}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <Star
            className={`w-5 h-5 ${
              technique.is_favorite ? "fill-primary text-primary" : ""
            }`}
          />
        </button>
      </div>

      {/* Mastery Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Mastery</span>
          <span className="text-primary font-semibold">{mastery.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${Math.min(100, mastery)}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onViewDetails}
        >
          <Info className="w-4 h-4 mr-1" />
          Details
        </Button>
        <Button
          size="sm"
          className="flex-1 glow-button"
          onClick={() => navigate(`/timer?technique=${technique.id}`)}
        >
          <Play className="w-4 h-4 mr-1" />
          Practice
        </Button>
      </div>
    </Card>
  );
}