import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get accepted friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      if (friendIds.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Get friends' profiles who share sessions
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, share_sessions_in_feed")
        .in("id", friendIds)
        .in("share_sessions_in_feed", ["friends", "all"]);

      const sharingFriendIds = profiles?.map(p => p.id) || [];
      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      if (sharingFriendIds.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Get recent sessions from friends
      const { data: sessionsData, error } = await supabase
        .from("sessions")
        .select(`
          id,
          user_id,
          duration_minutes,
          session_date,
          technique_id,
          techniques(name)
        `)
        .in("user_id", sharingFriendIds)
        .order("session_date", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get kudos counts and user's kudos
      const sessionIds = sessionsData?.map(s => s.id) || [];
      
      const { data: kudosData } = await supabase
        .from("session_kudos")
        .select("session_id, user_id")
        .in("session_id", sessionIds);

      const kudosBySession = new Map<string, { count: number; hasGiven: boolean }>();
      kudosData?.forEach(k => {
        const existing = kudosBySession.get(k.session_id) || { count: 0, hasGiven: false };
        existing.count++;
        if (k.user_id === user.id) existing.hasGiven = true;
        kudosBySession.set(k.session_id, existing);
      });

      const feedSessions: FeedSession[] = (sessionsData || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        user_name: profileMap.get(s.user_id) || "Unknown",
        technique_name: (s.techniques as any)?.name || "Meditation",
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
  };

  const toggleKudos = async (session: FeedSession) => {
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
      } else {
        // Give kudos
        await supabase
          .from("session_kudos")
          .insert({
            session_id: session.id,
            user_id: user.id,
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
  };

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
      <div className="text-center py-12 text-muted-foreground">
        <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No activity yet</p>
        <p className="text-sm mt-1">
          When your friends meditate, their sessions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.id} className="p-4 card-interactive">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-primary/20">
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
            
            {session.kudos_count > 0 && (
              <span className="text-sm text-muted-foreground">
                {session.kudos_count} {session.kudos_count === 1 ? "kudos" : "kudos"}
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}