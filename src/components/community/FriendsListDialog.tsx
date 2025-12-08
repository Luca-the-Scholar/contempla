import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, UserPlus, Check, X, Search, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Friend {
  id: string;
  name: string | null;
  status: string;
  friendshipId: string;
  isRequester: boolean;
}

interface FriendsListDialogProps {
  onViewFriend?: (friendId: string) => void;
}

export function FriendsListDialog({ onViewFriend }: FriendsListDialogProps) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("id, user_id, friend_id, status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      // Get unique friend IDs
      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Fetch profiles for all friends
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", friendIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const friendsList = friendships?.map(f => {
        const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
        return {
          id: friendId,
          name: profileMap.get(friendId) || "Unknown",
          status: f.status,
          friendshipId: f.id,
          isRequester: f.user_id === user.id,
        };
      }) || [];

      setFriends(friendsList);
    } catch (error: any) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a name or email",
        description: "Please enter your friend's display name or email",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Search for user by name in profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .ilike("name", `%${searchQuery}%`)
        .neq("id", user.id)
        .limit(1);

      if (!profiles || profiles.length === 0) {
        toast({
          title: "User not found",
          description: "No user found with that name. Try a different search.",
          variant: "destructive",
        });
        return;
      }

      const targetUser = profiles[0];

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already connected",
          description: "You already have a pending or accepted friendship with this user.",
        });
        return;
      }

      // Create friendship request
      const { error } = await supabase
        .from("friendships")
        .insert({
          user_id: user.id,
          friend_id: targetUser.id,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Friend request sent!",
        description: `Request sent to ${targetUser.name}`,
      });
      setSearchQuery("");
      setShowAddFriend(false);
      fetchFriends();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;
      toast({ title: "Friend request accepted!" });
      fetchFriends();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const rejectRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast({ title: "Request removed" });
      fetchFriends();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const pendingReceived = friends.filter(f => f.status === "pending" && !f.isRequester);
  const pendingSent = friends.filter(f => f.status === "pending" && f.isRequester);
  const accepted = friends.filter(f => f.status === "accepted");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Friends List</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Friend Section */}
          {showAddFriend ? (
            <div className="flex gap-2">
              <Input
                placeholder="Search by display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendFriendRequest()}
              />
              <Button 
                onClick={sendFriendRequest} 
                disabled={isSearching}
                size="icon"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowAddFriend(false);
                  setSearchQuery("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => setShowAddFriend(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add Friend
            </Button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Pending Requests Received */}
              {pendingReceived.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Friend Requests</h4>
                  {pendingReceived.map((friend) => (
                    <Card key={friend.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {getInitials(friend.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{friend.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => acceptRequest(friend.friendshipId)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => rejectRequest(friend.friendshipId)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Accepted Friends */}
              {accepted.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Friends ({accepted.length})</h4>
                  {accepted.map((friend) => (
                    <Card 
                      key={friend.id} 
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => {
                        onViewFriend?.(friend.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {getInitials(friend.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{friend.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Card>
                  ))}
                </div>
              )}

              {/* Pending Sent */}
              {pendingSent.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Pending</h4>
                  {pendingSent.map((friend) => (
                    <Card key={friend.id} className="p-3 flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                            {getInitials(friend.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{friend.name}</span>
                          <p className="text-xs text-muted-foreground">Request pending</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {friends.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm">Add friends to see their practice activity!</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}