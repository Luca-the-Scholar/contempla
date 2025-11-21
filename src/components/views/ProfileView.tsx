import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Flame, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProfileView() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [techniqueCount, setTechniqueCount] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      setUserName(profile?.name || "Meditator");

      const { data: techniques } = await supabase
        .from("techniques")
        .select("id");

      setTechniqueCount(techniques?.length || 0);

      const { data: sessions } = await supabase
        .from("sessions")
        .select("duration_minutes");

      const total = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;
      setTotalMinutes(total);

      const { data: mastery } = await supabase
        .from("mastery_scores")
        .select("streak")
        .order("streak", { ascending: false })
        .limit(1);

      setMaxStreak(mastery?.[0]?.streak || 0);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <Avatar className="w-24 h-24 mx-auto border-2 border-primary">
            <AvatarFallback className="text-2xl bg-primary/20 text-primary">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{userName}</h1>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center space-y-2 bg-card/50 backdrop-blur">
            <div className="flex justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{formatTime(totalMinutes)}</div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </Card>

          <Card className="p-4 text-center space-y-2 bg-card/50 backdrop-blur">
            <div className="flex justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{techniqueCount}</div>
            <div className="text-xs text-muted-foreground">Techniques</div>
          </Card>

          <Card className="p-4 text-center space-y-2 bg-card/50 backdrop-blur">
            <div className="flex justify-center">
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{maxStreak}</div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </Card>
        </div>

        {/* Recent Achievement */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <h2 className="text-lg font-semibold mb-2">Your Journey</h2>
          <p className="text-sm text-muted-foreground">
            {totalMinutes === 0 
              ? "Begin your meditation practice to track your progress."
              : `You've dedicated ${formatTime(totalMinutes)} to your practice. Keep going!`
            }
          </p>
        </Card>
      </div>
    </div>
  );
}
