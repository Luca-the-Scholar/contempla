import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Check, X, Search, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FriendProfile {
  id: string;
  name: string | null;
  email: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend_profile?: FriendProfile;
}

interface FriendStats {
  totalMinutes: number;
  currentStreak: number;
  totalSessions: number;
}

export function CommunityView() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [friendStats, setFriendStats] = useState<Record<string, FriendStats>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchFriendships();
  }, []);

  const fetchFriendships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all friendships where user is involved
      const { data: friendshipsData, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      const accepted: Friendship[] = [];
      const pending: Friendship[] = [];

      // Fetch friend profiles and categorize friendships
      for (const friendship of friendshipsData || []) {
        const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("id", friendId)
          .single();

        // Get email from auth users (need to fetch user info)
        const friendData = {
          ...friendship,
          friend_profile: {
            id: friendId,
            name: profileData?.name || "Unknown",
            email: ""
          }
        };

        if (friendship.status === "accepted") {
          accepted.push(friendData);
          fetchFriendStats(friendId);
        } else if (friendship.status === "pending" && friendship.friend_id === user.id) {
          pending.push(friendData);
        }
      }

      setFriends(accepted);
      setPendingRequests(pending);
    } catch (error: any) {
      toast({
        title: "Error loading friends",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendStats = async (friendId: string) => {
    try {
      // Get total sessions and minutes
      const { data: sessions } = await supabase
        .from("sessions")
        .select("duration_minutes")
        .eq("user_id", friendId);

      const totalMinutes = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;
      const totalSessions = sessions?.length || 0;

      // Get current streak from mastery scores
      const { data: masteryData } = await supabase
        .from("mastery_scores")
        .select("streak")
        .eq("user_id", friendId)
        .order("streak", { ascending: false })
        .limit(1)
        .single();

      setFriendStats(prev => ({
        ...prev,
        [friendId]: {
          totalMinutes,
          totalSessions,
          currentStreak: masteryData?.streak || 0
        }
      }));
    } catch (error) {
      console.error("Error fetching friend stats:", error);
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find user by email through profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      // For now, show a message that they need to know the user ID
      toast({
        title: "Feature coming soon",
        description: "Friend search by email is being implemented. For now, share user IDs directly.",
      });

      setSearchEmail("");
    } catch (error: any) {
      toast({
        title: "Error sending request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: accept ? "accepted" : "declined" })
        .eq("id", friendshipId);

      if (error) throw error;

      toast({
        title: accept ? "Friend request accepted!" : "Friend request declined",
      });

      fetchFriendships();
    } catch (error: any) {
      toast({
        title: "Error responding to request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      toast({ title: "Friend removed" });
      fetchFriendships();
    } catch (error: any) {
      toast({
        title: "Error removing friend",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24">
        <p className="text-muted-foreground">Loading community...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Community</h1>
          <p className="text-sm text-muted-foreground">
            Connect with friends and share your practice
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Add Friend Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Add Friend</h2>
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
              <Search className="w-4 h-4 mr-2" />
              Find
            </Button>
          </div>
        </Card>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-2 px-1">Pending Requests</h2>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{request.friend_profile?.name || "Unknown User"}</p>
                      <p className="text-sm text-muted-foreground">Wants to connect</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToRequest(request.id, true)}
                        className="min-h-[40px]"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToRequest(request.id, false)}
                        className="min-h-[40px]"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-base font-semibold mb-2 px-1">
            Friends ({friends.length})
          </h2>
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
              {friends.map((friendship) => {
                const friendId = friendship.user_id === friendship.friend_id 
                  ? friendship.user_id 
                  : (friendship.friend_profile?.id || "");
                const stats = friendStats[friendId] || { totalMinutes: 0, currentStreak: 0, totalSessions: 0 };

                return (
                  <Card key={friendship.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {friendship.friend_profile?.name || "Unknown User"}
                          </h3>
                          <Badge variant="secondary" className="mt-1">
                            Friend
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFriend(friendship.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                        <div className="text-center">
                          <div className="text-xl font-bold text-primary">
                            {formatTime(stats.totalMinutes)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Time</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xl font-bold text-primary">
                              {stats.currentStreak}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">Day Streak</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-primary">
                            {stats.totalSessions}
                          </div>
                          <div className="text-xs text-muted-foreground">Sessions</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
