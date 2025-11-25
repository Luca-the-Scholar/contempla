import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Check, X, Search, Flame, User, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageThread } from "@/components/messaging/MessageThread";

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
  recentTechniques?: Array<{
    technique_name: string;
    total_minutes: number;
    session_count: number;
  }>;
}

interface UserProfile {
  id: string;
  name: string;
  profile_visibility: string;
}

export function CommunityView() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [friendStats, setFriendStats] = useState<Record<string, FriendStats>>({});
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [messagingFriend, setMessagingFriend] = useState<{ id: string; name: string } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .rpc('get_user_profile_stats', { profile_user_id: friendId });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const stats = data[0];
        const recentTechniques = Array.isArray(stats.recent_techniques) 
          ? stats.recent_techniques as Array<{ technique_name: string; total_minutes: number; session_count: number; }>
          : [];
          
        setFriendStats(prev => ({
          ...prev,
          [friendId]: {
            totalMinutes: stats.total_minutes || 0,
            currentStreak: stats.current_streak || 0,
            totalSessions: stats.total_sessions || 0,
            recentTechniques
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching friend stats:', error);
    }
  };

  const openProfileDialog = (friendId: string) => {
    setSelectedProfile(friendId);
    setProfileDialogOpen(true);
  };

  const sendFriendRequest = async () => {
    toast({
      title: "Coming soon!",
      description: "Friend requests will be available in a future update.",
    });
  };

  const startConversation = async (friendId: string, friendName: string) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: friendId
      });

      if (error) throw error;

      setConversationId(data);
      setMessagingFriend({ id: friendId, name: friendName });
    } catch (error: any) {
      toast({
        title: "Error starting conversation",
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
      <div className="min-h-screen flex items-center justify-center pb-32">
        <p className="text-muted-foreground">Loading community...</p>
      </div>
    );
  }

  if (messagingFriend && conversationId) {
    return (
      <div className="h-screen pb-24">
        <MessageThread
          conversationId={conversationId}
          friendName={messagingFriend.name}
          friendId={messagingFriend.id}
          onBack={() => {
            setMessagingFriend(null);
            setConversationId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
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

                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                        <div className="text-center">
                          <div className="text-xl font-bold text-primary">
                            {formatTime(stats.totalMinutes)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Time</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xl font-bold text-primary">
                              {stats.currentStreak}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">Day Streak</div>
                        </div>
                        <div className="text-center col-span-2 sm:col-span-1">
                          <div className="text-xl font-bold text-primary">
                            {stats.totalSessions}
                          </div>
                          <div className="text-sm text-muted-foreground">Sessions</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openProfileDialog(friendId)}
                        >
                          <User className="h-3 w-3 mr-1" />
                          Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startConversation(friendId, friendship.friend_profile?.name || 'Friend')}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Details</DialogTitle>
          </DialogHeader>
          {selectedProfile && friendStats[selectedProfile] && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Recent Techniques</h4>
                {friendStats[selectedProfile].recentTechniques && friendStats[selectedProfile].recentTechniques!.length > 0 ? (
                  <div className="space-y-2">
                    {friendStats[selectedProfile].recentTechniques!.map((tech, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="font-medium">{tech.technique_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.floor(tech.total_minutes / 60)}h {tech.total_minutes % 60}m · {tech.session_count} sessions
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent practice data</p>
                )}
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Overall Stats</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Time</div>
                    <div className="font-medium">{formatTime(friendStats[selectedProfile].totalMinutes)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current Streak</div>
                    <div className="font-medium">{friendStats[selectedProfile].currentStreak} days</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Sessions</div>
                    <div className="font-medium">{friendStats[selectedProfile].totalSessions}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
