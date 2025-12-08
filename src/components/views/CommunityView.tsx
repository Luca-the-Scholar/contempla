import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Flame, ArrowLeft, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FriendsListDialog } from "@/components/community/FriendsListDialog";
import { ActivityFeed } from "@/components/community/ActivityFeed";
import { SessionFeed, FeedSession } from "@/components/shared/SessionFeed";
import { trackEvent } from "@/hooks/use-analytics";

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
  sessions: FeedSession[];
}

export function CommunityView() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
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
    // Track friend profile viewed
    trackEvent('friend_profile_viewed', { friend_user_id: friendId });
    
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
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("id, technique_id, duration_minutes, session_date, manual_entry, techniques(name)")
        .eq("user_id", friendId)
        .order("session_date", { ascending: false });

      const sessions: FeedSession[] = (sessionsData || []).map((s: any) => ({
        id: s.id,
        user_id: friendId,
        user_name: profile.name || "Friend",
        technique_name: s.techniques?.name || "Meditation",
        duration_minutes: s.duration_minutes,
        session_date: s.session_date,
        manual_entry: s.manual_entry,
      }));

      const sessionDates = sessions.map(s => s.session_date.split('T')[0]);
      const streak = calculateStreakFromDates(sessionDates);
      const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);

      // Calculate favorite technique
      const techniqueMinutes: Record<string, { name: string; minutes: number }> = {};
      sessions.forEach(s => {
        if (!techniqueMinutes[s.technique_name]) {
          techniqueMinutes[s.technique_name] = { name: s.technique_name, minutes: 0 };
        }
        techniqueMinutes[s.technique_name].minutes += s.duration_minutes;
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
        sessions,
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
            onClick={() => setSelectedFriend(null)}
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
                
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {selectedFriend.showStreak && (
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-5 h-5 streak-flame animate-pulse-soft" />
                      <span className="font-bold text-gradient">
                        {selectedFriend.streak} day streak
                      </span>
                    </div>
                  )}
                  
                  <span className="text-sm text-muted-foreground">
                    {formatTime(selectedFriend.totalMinutes)} total
                  </span>
                </div>

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

          {/* Friend's Practice Feed */}
          {selectedFriend.showHistory ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground sticky top-0 bg-background py-2 z-10">
                Practice History
              </h3>
              <SessionFeed
                sessions={selectedFriend.sessions}
                showUserInfo={false}
                emptyMessage="No practice sessions yet"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Practice history is private</p>
            </div>
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