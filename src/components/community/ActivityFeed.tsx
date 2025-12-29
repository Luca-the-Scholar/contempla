import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Clock, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { trackEvent } from "@/hooks/use-analytics";
import { usePullToRefresh, shouldShowPullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullToRefreshIndicator } from "@/components/shared/PullToRefreshIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FeedSession {
  id: string;
  user_id: string;
  user_name: string;
  technique_name: string;
  duration_minutes: number;
  session_date: string;
  kudos_count: number;
  has_given_kudos: boolean;
}

export function ActivityFeed() {
  const [sessions, setSessions] = useState<FeedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [givingKudos, setGivingKudos] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionToHide, setSessionToHide] = useState<FeedSession | null>(null);
  const [isHiding, setIsHiding] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'friends' | 'all'>(() => {
    return (localStorage.getItem('feed_filter') as 'friends' | 'all') || 'friends';
  });
  const { toast } = useToast();

  const fetchFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Get current user's profile to check their sharing setting
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("id, name, share_sessions_in_feed")
        .eq("id", user.id)
        .single();

      // Get accepted friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Get friends' profiles who share sessions (friends or all)
      const { data: friendProfiles } = await supabase
        .from("profiles")
        .select("id, name, share_sessions_in_feed")
        .in("id", friendIds)
        .in("share_sessions_in_feed", ["friends", "all"]);

      // Build the list of user IDs whose sessions we want to fetch
      const sharingFriendIds = friendProfiles?.map(p => p.id) || [];

      // Build profile map for name lookups
      const profileMap = new Map<string, string>();
      friendProfiles?.forEach(p => profileMap.set(p.id, p.name || "Unknown"));

      // Add current user to the profile map
      if (currentUserProfile) {
        profileMap.set(user.id, currentUserProfile.name || "You");
      }

      // Determine which user IDs to fetch sessions for based on filter mode
      let userIdsToFetch: string[] = [];

      if (feedFilter === 'all') {
        // "All" mode: Fetch sessions from ALL users with share_sessions_in_feed = 'all'
        const { data: allSharingProfiles } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("share_sessions_in_feed", "all");

        userIdsToFetch = allSharingProfiles?.map(p => p.id) || [];

        // Add these users to profile map
        allSharingProfiles?.forEach(p => {
          if (!profileMap.has(p.id)) {
            profileMap.set(p.id, p.name || "Unknown");
          }
        });
      } else {
        // "Friends" mode: Current behavior - only sharing friends
        userIdsToFetch = [...sharingFriendIds];

        // Include current user's sessions if their sharing setting is not 'none'
        const currentUserShares = currentUserProfile?.share_sessions_in_feed &&
          currentUserProfile.share_sessions_in_feed !== 'none';
        if (currentUserShares) {
          userIdsToFetch.push(user.id);
        }
      }

      // If no one to fetch sessions from, show empty state
      if (userIdsToFetch.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Get recent sessions (using denormalized technique_name to avoid RLS issues)
      // Filter out sessions that are hidden from feed
      const { data: sessionsData, error } = await supabase
        .from("sessions")
        .select(`
          id,
          user_id,
          duration_minutes,
          session_date,
          technique_name
        `)
        .in("user_id", userIdsToFetch)
        .eq("hidden_from_feed", false)
        .order("session_date", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get kudos counts and user's kudos
      const sessionIds = sessionsData?.map(s => s.id) || [];
      
      let kudosBySession = new Map<string, { count: number; hasGiven: boolean }>();
      if (sessionIds.length > 0) {
        const { data: kudosData } = await supabase
          .from("session_kudos")
          .select("session_id, user_id")
          .in("session_id", sessionIds);

        kudosData?.forEach(k => {
          const existing = kudosBySession.get(k.session_id) || { count: 0, hasGiven: false };
          existing.count++;
          if (k.user_id === user.id) existing.hasGiven = true;
          kudosBySession.set(k.session_id, existing);
        });
      }

      const feedSessions: FeedSession[] = (sessionsData || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        user_name: profileMap.get(s.user_id) || "Unknown",
        technique_name: s.technique_name || "Meditation",
        duration_minutes: s.duration_minutes,
        session_date: s.session_date,
        kudos_count: kudosBySession.get(s.id)?.count || 0,
        has_given_kudos: kudosBySession.get(s.id)?.hasGiven || false,
      }));

      setSessions(feedSessions);
    } catch (error: any) {
      console.error("Error fetching feed:", error);
      toast({
        title: "Error loading feed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, feedFilter]);

  useEffect(() => {
    fetchFeed();
    trackEvent('feed_opened');
  }, [fetchFeed]);

  const handleFilterChange = (newFilter: 'friends' | 'all') => {
    setFeedFilter(newFilter);
    localStorage.setItem('feed_filter', newFilter);
    trackEvent('feed_filter_changed', { filter: newFilter });
  };

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await fetchFeed();
  }, [fetchFeed]);

  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: loading,
  });

  const showPullToRefresh = shouldShowPullToRefresh();

  const toggleKudos = useCallback(async (session: FeedSession) => {
    setGivingKudos(session.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (session.has_given_kudos) {
        // Remove kudos
        await supabase
          .from("session_kudos")
          .delete()
          .eq("session_id", session.id)
          .eq("user_id", user.id);
        
        trackEvent('kudos_removed', {
          session_id: session.id,
          recipient_user_id: session.user_id,
        });
      } else {
        // Give kudos
        await supabase
          .from("session_kudos")
          .insert({
            session_id: session.id,
            user_id: user.id,
          });
        
        trackEvent('kudos_given', {
          session_id: session.id,
          recipient_user_id: session.user_id,
        });
      }

      // Update local state
      setSessions(prev => prev.map(s => {
        if (s.id === session.id) {
          return {
            ...s,
            has_given_kudos: !s.has_given_kudos,
            kudos_count: s.has_given_kudos ? s.kudos_count - 1 : s.kudos_count + 1,
          };
        }
        return s;
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGivingKudos(null);
    }
  }, [toast]);

  const hideSession = useCallback(async (session: FeedSession) => {
    setIsHiding(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ hidden_from_feed: true })
        .eq("id", session.id)
        .eq("user_id", currentUserId!); // Ensure only owner can hide

      if (error) throw error;

      // Optimistically remove from UI
      setSessions(prev => prev.filter(s => s.id !== session.id));
      
      trackEvent('session_hidden_from_feed', {
        session_id: session.id,
      });

      toast({
        title: "Session removed",
        description: "This session has been removed from the activity feed.",
      });
    } catch (error: any) {
      console.error("Error hiding session:", error);
      toast({
        title: "Error",
        description: "Failed to remove session from feed.",
        variant: "destructive",
      });
    } finally {
      setIsHiding(false);
      setSessionToHide(null);
    }
  }, [currentUserId, toast]);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatSessionDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <>
        {/* Filter Control */}
        <div className="sticky top-0 z-10 bg-background pb-3 border-b mb-3">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => handleFilterChange('friends')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                feedFilter === 'friends'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => handleFilterChange('all')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                feedFilter === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              All
            </button>
          </div>
        </div>

        <div
          className="text-center py-12 text-muted-foreground"
          {...(showPullToRefresh ? handlers : {})}
        >
          {showPullToRefresh && (
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
            />
          )}
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          {feedFilter === 'friends' ? (
            <>
              <p className="font-medium">No activity from friends yet</p>
              <p className="text-sm mt-1">
                Add friends to see their meditation sessions here.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">No public sessions yet</p>
              <p className="text-sm mt-1">
                Check back soon to see sessions from the community.
              </p>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Filter Control */}
      <div className="sticky top-0 z-10 bg-background pb-3 border-b mb-3">
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => handleFilterChange('friends')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              feedFilter === 'friends'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              feedFilter === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div
        className="space-y-3"
        {...(showPullToRefresh ? handlers : {})}
      >
        {showPullToRefresh && (
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
          />
        )}
        {sessions.map((session) => (
        <Card key={session.id} className="p-4 card-interactive">
          <div className="flex items-start gap-3">
            <Avatar 
              className="w-12 h-12 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/40 transition-all"
              onClick={() => trackEvent('feed_profile_clicked', { friend_user_id: session.user_id })}
            >
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {getInitials(session.user_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{session.user_name}</span>
                <span className="text-muted-foreground">practiced</span>
              </div>
              
              <p className="text-primary font-medium mt-0.5">
                {session.technique_name}
              </p>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{session.duration_minutes} min</span>
                </div>
                <span>•</span>
                <span>{formatSessionDate(session.session_date)}</span>
              </div>
            </div>
          </div>

          {/* Kudos Button */}
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={session.has_given_kudos ? "default" : "ghost"}
                size="sm"
                className={`gap-2 ${session.has_given_kudos ? "bg-accent/80 hover:bg-accent text-accent-foreground" : ""}`}
                onClick={() => toggleKudos(session)}
                disabled={givingKudos === session.id}
              >
                {givingKudos === session.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart className={`w-4 h-4 ${session.has_given_kudos ? "fill-current" : ""}`} />
                )}
                Kudos
              </Button>
              
              {/* Hide button - only for current user's sessions */}
              {session.user_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-destructive"
                  onClick={() => setSessionToHide(session)}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>
            
            {session.kudos_count > 0 && (
              <span className="text-sm text-muted-foreground">
                {session.kudos_count} {session.kudos_count === 1 ? "kudos" : "kudos"}
              </span>
            )}
          </div>
        </Card>
      ))}
      </div>

      {/* Confirmation Dialog for Hiding Session */}
      <AlertDialog open={!!sessionToHide} onOpenChange={(open) => !open && setSessionToHide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Activity Feed?</AlertDialogTitle>
            <AlertDialogDescription>
              This session will be removed from the activity feed. Your meditation data will still be preserved for your personal history and statistics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isHiding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToHide && hideSession(sessionToHide)}
              disabled={isHiding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isHiding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
