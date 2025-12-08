import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ManualEntryDialog } from "@/components/timer/ManualEntryDialog";
import { ManualEntriesView } from "@/components/timer/ManualEntriesView";
import { SessionFeed, FeedSession } from "@/components/shared/SessionFeed";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { trackEvent } from "@/hooks/use-analytics";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    // Track calendar opened
    trackEvent('calendar_opened');
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
      toast.error("Error loading history: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse date string without timezone shift
  const parseSessionDate = (dateStr: string): Date => {
    // session_date comes as "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
    // Extract just the date part and create a local date
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const calculateStreak = (sessionData: Session[]) => {
    if (sessionData.length === 0) {
      setCurrentStreak(0);
      return;
    }

    const uniqueDates = new Set(
      sessionData.map((s) => format(parseSessionDate(s.session_date), "yyyy-MM-dd"))
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

  const handleEditSession = async (sessionId: string, newMinutes: number) => {
    const { error } = await supabase
      .from('sessions')
      .update({ duration_minutes: newMinutes })
      .eq('id', sessionId);

    if (error) throw error;
    toast.success('Session updated');
    fetchData();
  };

  const handleDeleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    toast.success('Session deleted');
    fetchData();
  };

  // Aggregate sessions by date for heatmap
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((session) => {
      const dateKey = format(parseSessionDate(session.session_date), "yyyy-MM-dd");
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

  const getHeatmapColor = (minutes: number) => {
    if (minutes === 0) return "bg-muted/30";
    // Distinct solid colors: cool blue → warm orange progression
    if (minutes >= 60) return "bg-[hsl(25,85%,55%)]"; // Bright orange
    if (minutes >= 45) return "bg-[hsl(35,75%,50%)]"; // Warm amber
    if (minutes >= 30) return "bg-[hsl(50,65%,45%)]"; // Golden yellow
    if (minutes >= 15) return "bg-[hsl(180,50%,40%)]"; // Teal
    return "bg-[hsl(210,60%,45%)]"; // Cool blue
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Convert sessions to FeedSession format
  const feedSessions: FeedSession[] = sessions.map(s => ({
    id: s.id,
    technique_name: s.technique_name || "Unknown",
    duration_minutes: s.duration_minutes,
    session_date: s.session_date,
    manual_entry: s.manual_entry,
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Summary Stats */}
        <div className="stats-card">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="w-7 h-7 streak-flame animate-pulse-soft" />
                <span className="text-4xl font-bold text-gradient">
                  {currentStreak}
                </span>
              </div>
              <div className="text-sm text-muted-foreground font-medium">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-1">
                {totalHours}<span className="text-2xl text-muted-foreground">h</span> {remainingMinutes}<span className="text-2xl text-muted-foreground">m</span>
              </div>
              <div className="text-sm text-muted-foreground font-medium">Total Time</div>
            </div>
          </div>
        </div>

        {/* Manual Entry Actions */}
        <div className="flex items-center justify-center gap-2">
          <ManualEntryDialog
            techniques={techniques}
            onEntryAdded={fetchData}
          />
          <ManualEntriesView onEntriesChanged={fetchData} />
        </div>

        {/* Calendar Heatmap */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="font-semibold text-lg">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-9 w-9"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div
                key={i}
                className="text-center text-xs text-muted-foreground font-semibold py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
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
                  onClick={() => {
                    trackEvent('calendar_day_clicked', { date_clicked: dateKey });
                    setSelectedDate(day);
                  }}
                  className={`
                    aspect-square rounded-lg transition-all duration-200 flex items-center justify-center
                    ${getHeatmapColor(minutes)}
                    ${isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}
                    ${isSelected ? "ring-2 ring-foreground scale-110" : ""}
                    hover:scale-105 active:scale-95
                  `}
                  title={`${format(day, "MMM d")}: ${minutes}m`}
                >
                  <span className={`text-xs font-medium ${minutes > 0 ? 'text-white' : 'text-muted-foreground'}`}>
                    {format(day, "d")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-5 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 rounded-md bg-muted/30" />
              <div className="w-4 h-4 rounded-md bg-[hsl(210,60%,45%)]" />
              <div className="w-4 h-4 rounded-md bg-[hsl(180,50%,40%)]" />
              <div className="w-4 h-4 rounded-md bg-[hsl(50,65%,45%)]" />
              <div className="w-4 h-4 rounded-md bg-[hsl(35,75%,50%)]" />
              <div className="w-4 h-4 rounded-md bg-[hsl(25,85%,55%)]" />
            </div>
            <span>More</span>
          </div>
        </Card>

        {/* Session Feed - Infinite Scroll */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground sticky top-0 bg-background py-2 z-10">
            Practice History
          </h3>
          <SessionFeed
            sessions={feedSessions}
            editable={true}
            onEdit={handleEditSession}
            onDelete={handleDeleteSession}
            emptyMessage="No sessions recorded yet. Start your practice!"
          />
        </div>
      </div>
    </div>
  );
}
