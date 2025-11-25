import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TechniqueData {
  id: string;
  name: string;
  tradition: string;
  mastery: number;
  totalMinutes: number;
  streak: number;
  sessions: Session[];
}

interface Session {
  id: string;
  duration_minutes: number;
  session_date: string;
  manual_entry: boolean;
}

export function StatsView() {
  const [techniquesData, setTechniquesData] = useState<TechniqueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTechniques, setOpenTechniques] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: techniques, error: techError } = await supabase
        .from("techniques")
        .select("*");

      if (techError) throw techError;

      const { data: mastery, error: masteryError } = await supabase
        .from("mastery_scores")
        .select("*");

      if (masteryError) throw masteryError;

      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .order("session_date", { ascending: false });

      if (sessionsError) throw sessionsError;

      const data: TechniqueData[] = (techniques || []).map((technique) => {
        const masteryScore = mastery?.find((m) => m.technique_id === technique.id);
        const techniqueSessions = sessions?.filter(
          (s) => s.technique_id === technique.id
        ) || [];
        const totalMinutes = techniqueSessions.reduce(
          (sum, s) => sum + s.duration_minutes,
          0
        );

        return {
          id: technique.id,
          name: technique.name,
          tradition: technique.tradition,
          mastery: masteryScore?.mastery_score || 0,
          totalMinutes,
          streak: masteryScore?.streak || 0,
          sessions: techniqueSessions as Session[],
        };
      });

      // Sort by most practiced (total minutes)
      data.sort((a, b) => b.totalMinutes - a.totalMinutes);

      setTechniquesData(data);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading stats...</p>
      </div>
    );
  }

  if (techniquesData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Data Yet</h2>
          <p className="text-muted-foreground">
            Start practicing to see your progress metrics.
          </p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalMinutes = techniquesData.reduce((sum, t) => sum + t.totalMinutes, 0);
  const totalSessions = techniquesData.reduce((sum, t) => sum + t.sessions.length, 0);
  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Stats</h1>
          <p className="text-sm text-muted-foreground">
            Track your progress across all techniques
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Stats */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <h2 className="text-lg font-semibold mb-4">Overall Progress</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {totalHours}h {remainingMinutes}m
              </div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalSessions}</div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{avgSessionMinutes}m</div>
              <div className="text-xs text-muted-foreground">Avg Session</div>
            </div>
          </div>
        </Card>

        {/* Per-Technique Stats */}
        <div>
          <h2 className="text-base font-semibold mb-2 px-1">By Technique</h2>
          <div className="space-y-3">
            {techniquesData.map((technique) => (
          <Collapsible 
            key={technique.id}
            open={openTechniques.has(technique.id)}
            onOpenChange={(isOpen) => {
              setOpenTechniques(prev => {
                const next = new Set(prev);
                if (isOpen) {
                  next.add(technique.id);
                } else {
                  next.delete(technique.id);
                }
                return next;
              });
            }}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 hover:bg-accent/50 transition-colors min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="text-left">
                      <h3 className="font-semibold">{technique.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {technique.tradition}
                      </p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${openTechniques.has(technique.id) ? 'rotate-180' : ''}`} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mastery</span>
                      <span className="font-semibold">
                        {technique.mastery.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={technique.mastery} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-accent/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {formatTime(technique.totalMinutes)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total Time
                      </div>
                    </div>
                    <div className="text-center p-3 bg-accent/30 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="text-2xl font-bold text-primary">
                          {technique.streak}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Day Streak
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border p-4 space-y-2">
                  <h4 className="font-semibold text-sm mb-3">
                    Session History ({technique.sessions.length})
                  </h4>
                  {technique.sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sessions recorded yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {technique.sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-2 bg-accent/30 rounded"
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {formatTime(session.duration_minutes)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(session.session_date)}
                            </div>
                          </div>
                          {session.manual_entry && (
                            <span className="text-xs text-muted-foreground italic">
                              Manual
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
