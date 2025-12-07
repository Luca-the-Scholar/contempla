import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, UserPlus, Check, X, Search, Flame, Trash2, ArrowLeft, 
  ChevronLeft, ChevronRight, Heart 
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

// Mock friend data for testing
const MOCK_FRIENDS = [
  {
    id: "mock-friend-1",
    name: "Sarah Chen",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    streak: 42,
    totalMinutes: 2340,
    favoriteTechnique: "Loving-Kindness",
    showStreak: true,
    showTechniques: true,
    showHistory: true,
    // Mock practice data for calendar
    practiceDays: [
      { date: "2025-12-01", minutes: 20 },
      { date: "2025-12-02", minutes: 15 },
      { date: "2025-12-03", minutes: 30 },
      { date: "2025-12-04", minutes: 20 },
      { date: "2025-12-05", minutes: 25 },
      { date: "2025-12-06", minutes: 20 },
      { date: "2025-12-07", minutes: 15 },
    ],
  },
];

interface UserProfile {
  id: string;
  name: string | null;
  streak: number;
  favoriteTechnique: string | null;
  totalMinutes: number;
}

interface MockFriend {
  id: string;
  name: string;
  avatarUrl: string;
  streak: number;
  totalMinutes: number;
  favoriteTechnique: string;
  showStreak: boolean;
  showTechniques: boolean;
  showHistory: boolean;
  practiceDays: { date: string; minutes: number }[];
}

export function CommunityView() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<MockFriend[]>(MOCK_FRIENDS);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<MockFriend | null>(null);
  const [friendCalendarMonth, setFriendCalendarMonth] = useState(new Date());
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

      // Fetch user's stats
      const { data: stats } = await supabase
        .rpc('get_user_profile_stats', { profile_user_id: user.id });

      // Fetch user's most practiced technique
      const { data: sessions } = await supabase
        .from("sessions")
        .select("technique_id, duration_minutes, techniques(name)")
        .order("duration_minutes", { ascending: false });

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
        streak: stats?.[0]?.current_streak || 0,
        favoriteTechnique: favoriteTech?.name || null,
        totalMinutes: stats?.[0]?.total_minutes || 0,
      });
    } catch (error: any) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Enter an email",
        description: "Please enter your friend's email address",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Friend request sent!",
      description: `A request has been sent to ${searchEmail}`,
    });
    setSearchEmail("");
  };

  const removeFriend = (friendId: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
    toast({ title: "Friend removed" });
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
      map.set(day.date, day.minutes);
    });
    return map;
  }, [selectedFriend]);

  const maxFriendMinutes = useMemo(() => {
    return Math.max(...Array.from(friendPracticeDayMap.values()), 1);
  }, [friendPracticeDayMap]);

  const getHeatmapColor = (minutes: number) => {
    if (minutes === 0) return "bg-muted/50";
    const intensity = Math.min(minutes / maxFriendMinutes, 1);
    if (intensity < 0.25) return "bg-primary/25";
    if (intensity < 0.5) return "bg-primary/50";
    if (intensity < 0.75) return "bg-primary/75";
    return "bg-primary";
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
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={selectedFriend.avatarUrl} alt={selectedFriend.name} />
                <AvatarFallback className="text-xl">{getInitials(selectedFriend.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{selectedFriend.name}</h1>
                
                {selectedFriend.showStreak && (
                  <div className="flex items-center gap-2 mt-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="text-lg font-semibold text-primary">
                      {selectedFriend.streak} day streak
                    </span>
                  </div>
                )}

                {selectedFriend.showTechniques && selectedFriend.favoriteTechnique && (
                  <div className="flex items-center gap-2 mt-1">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Favorite: {selectedFriend.favoriteTechnique}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Friend's Practice Calendar (if shared) */}
          {selectedFriend.showHistory && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFriendCalendarMonth(subMonths(friendCalendarMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold">
                  {format(friendCalendarMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFriendCalendarMonth(addMonths(friendCalendarMonth, 1))}
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

                  return (
                    <div
                      key={dateKey}
                      className={`
                        aspect-square rounded-md flex items-center justify-center
                        ${isOutOfRange ? "bg-muted/20 text-muted-foreground/40" : getHeatmapColor(minutes)}
                        ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                      `}
                      title={isOutOfRange ? format(day, "MMM d") : `${format(day, "MMM d")}: ${minutes}m`}
                    >
                      <span className="text-xs">{format(day, "d")}</span>
                    </div>
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
          )}

          {/* Privacy notice if some info is hidden */}
          {(!selectedFriend.showStreak || !selectedFriend.showTechniques || !selectedFriend.showHistory) && (
            <p className="text-sm text-muted-foreground text-center">
              Some information is hidden based on {selectedFriend.name}'s privacy settings.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main Community View
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Profile Section */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-2 ring-primary/20">
              <AvatarFallback className="text-xl bg-primary/20">
                {getInitials(userProfile?.name || null)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{userProfile?.name || "Meditator"}</h2>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-primary">
                    {userProfile?.streak || 0} day streak
                  </span>
                </div>
              </div>

              {userProfile?.favoriteTechnique && (
                <div className="flex items-center gap-2 mt-1">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Most practiced: {userProfile.favoriteTechnique}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Community Section Header */}
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Community</h2>
        </div>

        {/* Add Friend */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <UserPlus className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Add Friend</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter friend's email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="min-h-[44px]"
              onKeyDown={(e) => e.key === "Enter" && sendFriendRequest()}
            />
            <Button onClick={sendFriendRequest} className="min-h-[44px] px-6">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Friends List */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Friends ({friends.length})
          </h3>
          
          {friends.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No friends yet</p>
              <p className="text-sm text-muted-foreground">
                Add friends to see their meditation progress
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <Card 
                  key={friend.id} 
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedFriend(friend)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={friend.avatarUrl} alt={friend.name} />
                      <AvatarFallback>{getInitials(friend.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{friend.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span className="text-sm text-muted-foreground">
                            {friend.streak} days
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground truncate">
                          {friend.favoriteTechnique}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFriend(friend.id);
                      }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
