import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Flame, ArrowLeft, ChevronLeft, ChevronRight, Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isAfter,
  isBefore,
  subDays,
  startOfDay,
} from "date-fns";
import { FriendsListDialog } from "@/components/community/FriendsListDialog";
import { ActivityFeed } from "@/components/community/ActivityFeed";

// Helper to calculate streak from practice days
const calculateStreakFromDates = (dates: string[]): number => {
  if (dates.length === 0) return 0;

  const uniqueDates = new Set(dates);
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  // Check if practiced today or yesterday
  if (!uniqueDates.has(today) && !uniqueDates.has(yesterday)) {
    return 0;
  }

  let streak = 0;
  let checkDate = uniqueDates.has(today) ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);

  while (uniqueDates.has(format(checkDate, "yyyy-MM-dd"))) {
    streak++;
    checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
};

interface UserProfile {
  id: string;
  name: string | null;
  streak: number;
  favoriteTechnique: string | null;
  totalMinutes: number;
}

interface FriendProfile {
  id: string;
  name: string | null;
  streak: number;
  favoriteTechnique: string | null;
  totalMinutes: number;
  showStreak: boolean;
  showTechniques: boolean;
  showHistory: boolean;
  practiceDays: { date: string; minutes: number; technique: string }[];
}

export function CommunityView() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendCalendarMonth, setFriendCalendarMonth] = useState(new Date());
  const [selectedFriendDate, setSelectedFriendDate] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", user.id)
        .maybeSingle();

      // Fetch user's sessions for streak calculation and stats
      const { data: sessions } = await supabase
        .from("sessions")
        .select("technique_id, duration_minutes, session_date, techniques(name)")
        .order("session_date", { ascending: false });

      // Calculate streak from session dates (same logic as HistoryView)
      const sessionDates = (sessions || []).map((s: any) => {
        const datePart = s.session_date.split('T')[0];
        return datePart;
      });
      const calculatedStreak = calculateStreakFromDates(sessionDates);

      // Calculate total minutes
      const totalMinutes = (sessions || []).reduce((sum: number, s: any) => sum + s.duration_minutes, 0);

      // Calculate favorite technique
      const techniqueMinutes: Record<string, { name: string; minutes: number }> = {};
      sessions?.forEach((session: any) => {
        const techId = session.technique_id;
        const techName = session.techniques?.name || "Unknown";
        if (!techniqueMinutes[techId]) {
          techniqueMinutes[techId] = { name: techName, minutes: 0 };
        }
        techniqueMinutes[techId].minutes += session.duration_minutes;
      });

      const favoriteTech = Object.values(techniqueMinutes).sort((a, b) => b.minutes - a.minutes)[0];

      setUserProfile({
        id: user.id,
        name: profile?.name || "Meditator",
        streak: calculatedStreak,
        favoriteTechnique: favoriteTech?.name || null,
        totalMinutes: totalMinutes,
      });
    } catch (error: any) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewFriendProfile = async (friendId: string) => {
    try {
      // Fetch friend's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, show_streak_to_friends, show_techniques_to_friends, show_practice_history")
        .eq("id", friendId)
        .maybeSingle();

      if (!profile) {
        toast({ title: "Profile not found", variant: "destructive" });
        return;
      }

      // Fetch friend's sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("technique_id, duration_minutes, session_date, techniques(name)")
        .eq("user_id", friendId)
        .order("session_date", { ascending: false });

      const practiceDays = (sessions || []).map((s: any) => ({
        date: s.session_date.split('T')[0],
        minutes: s.duration_minutes,
        technique: s.techniques?.name || "Meditation",
      }));

      const sessionDates = practiceDays.map(p => p.date);
      const streak = calculateStreakFromDates(sessionDates);
      const totalMinutes = practiceDays.reduce((sum, p) => sum + p.minutes, 0);

      // Calculate favorite technique
      const techniqueMinutes: Record<string, { name: string; minutes: number }> = {};
      practiceDays.forEach(p => {
        if (!techniqueMinutes[p.technique]) {
          techniqueMinutes[p.technique] = { name: p.technique, minutes: 0 };
        }
        techniqueMinutes[p.technique].minutes += p.minutes;
      });
      const favoriteTech = Object.values(techniqueMinutes).sort((a, b) => b.minutes - a.minutes)[0];

      setSelectedFriend({
        id: profile.id,
        name: profile.name,
        streak,
        favoriteTechnique: favoriteTech?.name || null,
        totalMinutes,
        showStreak: profile.show_streak_to_friends !== 'private',
        showTechniques: profile.show_techniques_to_friends !== 'private',
        showHistory: profile.show_practice_history !== 'private',
        practiceDays,
      });
    } catch (error: any) {
      console.error("Error loading friend profile:", error);
      toast({ title: "Error loading profile", description: error.message, variant: "destructive" });
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Friend calendar helpers
  const friendCalendarDays = useMemo(() => {
    const start = startOfMonth(friendCalendarMonth);
    const end = endOfMonth(friendCalendarMonth);
    return eachDayOfInterval({ start, end });
  }, [friendCalendarMonth]);

  const friendPracticeDayMap = useMemo(() => {
    if (!selectedFriend) return new Map();
    const map = new Map<string, number>();
    selectedFriend.practiceDays.forEach(day => {
      map.set(day.date, (map.get(day.date) || 0) + day.minutes);
    });
    return map;
  }, [selectedFriend]);

  const getHeatmapColor = (minutes: number) => {
    if (minutes === 0) return "bg-muted/30";
    // Fixed scale: 60 min = max, 45 min = near max
    if (minutes >= 60) return "bg-gradient-to-br from-primary to-accent";
    if (minutes >= 45) return "bg-gradient-to-br from-primary/90 to-accent/90";
    if (minutes >= 30) return "bg-gradient-to-br from-primary/60 to-accent/40";
    if (minutes >= 15) return "bg-gradient-to-br from-primary/40 to-primary/50";
    return "bg-gradient-to-br from-primary/20 to-primary/30";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32">
        <p className="text-muted-foreground">Loading community...</p>
      </div>
    );
  }

  // Friend Profile View
  if (selectedFriend) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => {
              setSelectedFriend(null);
              setSelectedFriendDate(null);
            }}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {/* Friend Profile Header */}
          <div className="stats-card">
            <div className="flex items-center gap-5">
              <Avatar className="w-20 h-20 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                <AvatarFallback className="text-xl bg-primary/20 text-primary">{getInitials(selectedFriend.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{selectedFriend.name}</h1>
                
                {selectedFriend.showStreak && (
                  <div className="flex items-center gap-2 mt-2">
                    <Flame className="w-6 h-6 streak-flame animate-pulse-soft" />
                    <span className="text-lg font-bold text-gradient">
                      {selectedFriend.streak} day streak
                    </span>
                  </div>
                )}

                {selectedFriend.showTechniques && selectedFriend.favoriteTechnique && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Heart className="w-4 h-4 text-accent" />
                    <span className="text-sm text-muted-foreground">
                      Favorite: <span className="text-foreground font-medium">{selectedFriend.favoriteTechnique}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Friend's Practice Calendar (if shared) */}
          {selectedFriend.showHistory && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFriendCalendarMonth(subMonths(friendCalendarMonth, 1))}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h3 className="font-semibold text-lg">
                  {format(friendCalendarMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFriendCalendarMonth(addMonths(friendCalendarMonth, 1))}
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
                {Array.from({ length: getDay(startOfMonth(friendCalendarMonth)) }).map(
                  (_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  )
                )}

                {friendCalendarDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const minutes = friendPracticeDayMap.get(dateKey) || 0;
                  const isToday = isSameDay(day, new Date());
                  const today = startOfDay(new Date());
                  const thirtyDaysAgo = subDays(today, 30);
                  const isFuture = isAfter(day, today);
                  const isTooOld = isBefore(day, thirtyDaysAgo);
                  const isOutOfRange = isFuture || isTooOld;
                  const isSelected = selectedFriendDate && isSameDay(day, selectedFriendDate);

                  return (
                    <button
                      key={dateKey}
                      onClick={() => !isOutOfRange && setSelectedFriendDate(day)}
                      disabled={isOutOfRange}
                      className={`
                        aspect-square rounded-lg transition-all duration-200 flex items-center justify-center
                        ${isOutOfRange ? "bg-muted/20 text-muted-foreground/40 cursor-not-allowed" : getHeatmapColor(minutes)}
                        ${isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}
                        ${isSelected ? "ring-2 ring-foreground scale-110" : ""}
                        ${!isOutOfRange ? "hover:scale-105 active:scale-95" : ""}
                      `}
                      title={isOutOfRange ? format(day, "MMM d") : `${format(day, "MMM d")}: ${minutes}m`}
                    >
                      <span className={`text-xs font-medium ${!isOutOfRange && minutes > 0 ? 'text-white' : 'text-muted-foreground'}`}>
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
                  <div className="w-4 h-4 rounded-md bg-gradient-to-br from-primary/20 to-primary/30" />
                  <div className="w-4 h-4 rounded-md bg-gradient-to-br from-primary/40 to-primary/50" />
                  <div className="w-4 h-4 rounded-md bg-gradient-to-br from-primary/60 to-accent/40" />
                  <div className="w-4 h-4 rounded-md bg-gradient-to-br from-primary to-accent" />
                </div>
                <span>More</span>
              </div>
            </Card>
          )}

          {/* Selected Date Sessions */}
          {selectedFriend.showHistory && selectedFriendDate && (
            <Card className="p-5 animate-fade-in">
              <h3 className="font-semibold text-lg mb-4">
                {format(selectedFriendDate, "MMMM d, yyyy")}
              </h3>
              {(() => {
                const dateKey = format(selectedFriendDate, "yyyy-MM-dd");
                const sessionsForDate = selectedFriend.practiceDays.filter(s => s.date === dateKey);
                
                if (sessionsForDate.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No sessions on this day
                    </p>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {sessionsForDate.map((session, idx) => (
                      <div
                        key={`${session.date}-${idx}`}
                        className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{session.technique}</div>
                          <div className="text-sm text-muted-foreground">
                            {session.minutes} minutes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Recent Sessions List (if history is shared) */}
          {selectedFriend.showHistory && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Recent Sessions</h3>
              {selectedFriend.practiceDays.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sessions recorded yet
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...selectedFriend.practiceDays]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .filter(session => {
                      const sessionDate = new Date(session.date);
                      const today = startOfDay(new Date());
                      const thirtyDaysAgo = subDays(today, 30);
                      return !isAfter(sessionDate, today) && !isBefore(sessionDate, thirtyDaysAgo);
                    })
                    .slice(0, 20)
                    .map((session, idx) => {
                      const [year, month, day] = session.date.split('-').map(Number);
                      const sessionDate = new Date(year, month - 1, day);
                      return (
                        <div
                          key={`${session.date}-${idx}`}
                          className="flex items-center justify-between p-2 bg-accent/30 rounded"
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {session.technique}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(sessionDate, "MMM d, yyyy")}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">{session.minutes}m</div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Main Community View with Activity Feed
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* User Profile Summary */}
        <div className="stats-card">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarFallback className="text-lg bg-primary/20 text-primary font-semibold">
                {getInitials(userProfile?.name || null)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{userProfile?.name || "Meditator"}</h2>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <Flame className="w-5 h-5 streak-flame" />
                  <span className="font-semibold text-gradient">{userProfile?.streak || 0}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatTime(userProfile?.totalMinutes || 0)} total
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Friends List Button */}
        <FriendsListDialog onViewFriend={viewFriendProfile} />

        {/* Activity Feed Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Activity Feed</h3>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}