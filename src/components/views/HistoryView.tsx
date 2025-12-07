import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ManualEntryDialog } from "@/components/timer/ManualEntryDialog";
import { ManualEntriesView } from "@/components/timer/ManualEntriesView";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";

interface Session {
  id: string;
  duration_minutes: number;
  session_date: string;
  manual_entry: boolean;
  technique_id: string;
  technique_name?: string;
}

interface Technique {
  id: string;
  name: string;
}

export function HistoryView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsResult, techniquesResult] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, duration_minutes, session_date, manual_entry, technique_id")
          .order("session_date", { ascending: false }),
        supabase.from("techniques").select("id, name"),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (techniquesResult.error) throw techniquesResult.error;

      const techniqueMap = new Map(
        (techniquesResult.data || []).map((t) => [t.id, t.name])
      );

      const sessionsWithNames = (sessionsResult.data || []).map((s) => ({
        ...s,
        technique_name: techniqueMap.get(s.technique_id) || "Unknown",
      }));

      setSessions(sessionsWithNames);
      setTechniques(techniquesResult.data || []);

      // Calculate streak
      calculateStreak(sessionsResult.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (sessionData: Session[]) => {
    if (sessionData.length === 0) {
      setCurrentStreak(0);
      return;
    }

    const uniqueDates = new Set(
      sessionData.map((s) => format(new Date(s.session_date), "yyyy-MM-dd"))
    );

    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    );

    // Check if practiced today or yesterday
    if (!uniqueDates.has(today) && !uniqueDates.has(yesterday)) {
      setCurrentStreak(0);
      return;
    }

    let streak = 0;
    let checkDate = uniqueDates.has(today) ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);

    while (uniqueDates.has(format(checkDate, "yyyy-MM-dd"))) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    }

    setCurrentStreak(streak);
  };

  // Aggregate sessions by date for heatmap
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((session) => {
      const dateKey = format(new Date(session.session_date), "yyyy-MM-dd");
      map.set(dateKey, (map.get(dateKey) || 0) + session.duration_minutes);
    });
    return map;
  }, [sessions]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Calculate max minutes for color scaling
  const maxMinutes = useMemo(() => {
    return Math.max(...Array.from(sessionsByDate.values()), 1);
  }, [sessionsByDate]);

  const getHeatmapColor = (minutes: number) => {
    if (minutes === 0) return "bg-muted/50";
    const intensity = Math.min(minutes / maxMinutes, 1);
    if (intensity < 0.25) return "bg-primary/25";
    if (intensity < 0.5) return "bg-primary/50";
    if (intensity < 0.75) return "bg-primary/75";
    return "bg-primary";
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Get sessions for selected date
  const selectedDateSessions = selectedDate
    ? sessions.filter((s) =>
        isSameDay(new Date(s.session_date), selectedDate)
      )
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">History</h1>
          <p className="text-sm text-muted-foreground">
            Your meditation practice over time
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Stats */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                <span className="text-3xl font-bold text-primary">
                  {currentStreak}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {totalHours}h {remainingMinutes}m
              </div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </div>
          </div>
        </Card>

        {/* Manual Entry Actions */}
        <div className="flex items-center justify-center gap-2">
          <ManualEntryDialog
            techniques={techniques}
            onEntryAdded={fetchData}
          />
          <ManualEntriesView onEntriesChanged={fetchData} />
        </div>

        {/* Calendar Heatmap */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div
                key={i}
                className="text-center text-xs text-muted-foreground font-medium"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map(
              (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              )
            )}

            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const minutes = sessionsByDate.get(dateKey) || 0;
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square rounded-md transition-all
                    ${getHeatmapColor(minutes)}
                    ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                    ${isSelected ? "ring-2 ring-foreground" : ""}
                    hover:opacity-80
                  `}
                  title={`${format(day, "MMM d")}: ${minutes}m`}
                >
                  <span className="text-xs">{format(day, "d")}</span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-muted/50" />
              <div className="w-3 h-3 rounded bg-primary/25" />
              <div className="w-3 h-3 rounded bg-primary/50" />
              <div className="w-3 h-3 rounded bg-primary/75" />
              <div className="w-3 h-3 rounded bg-primary" />
            </div>
            <span>More</span>
          </div>
        </Card>

        {/* Selected Date Sessions */}
        {selectedDate && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">
              {format(selectedDate, "MMMM d, yyyy")}
            </h3>
            {selectedDateSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sessions on this day
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDateSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{session.technique_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.duration_minutes} minutes
                        {session.manual_entry && " • Manual entry"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Recent Sessions List */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Recent Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sessions recorded yet
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.slice(0, 20).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 bg-accent/30 rounded"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {session.technique_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(session.session_date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {session.duration_minutes}m
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
