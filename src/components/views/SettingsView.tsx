import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function SettingsView() {
  const [userName, setUserName] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, profile_preferences")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name || "");
        const prefs = profile.profile_preferences as any;
        setNotifications(prefs?.notifications || false);
        setDailyReminder(prefs?.dailyReminder || false);
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, name: userName });

      if (error) throw error;

      toast({ title: "Name updated!" });
    } catch (error: any) {
      toast({
        title: "Error updating name",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_preferences")
        .eq("id", user.id)
        .single();

      const prefs = (profile?.profile_preferences as any) || {};
      prefs[key] = value;

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, profile_preferences: prefs });

      if (error) throw error;

      if (key === "notifications") setNotifications(value);
      if (key === "dailyReminder") setDailyReminder(value);

      toast({ title: "Setting updated!" });
    } catch (error: any) {
      toast({
        title: "Error updating setting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Profile Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Profile</h2>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="min-h-[44px]"
                />
                <Button onClick={handleSaveName} disabled={saving} className="min-h-[44px] px-6">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about your practice
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={(checked) =>
                  handleToggleSetting("notifications", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="daily-reminder">Daily Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Remind me to practice each day
                </p>
              </div>
              <Switch
                id="daily-reminder"
                checked={dailyReminder}
                onCheckedChange={(checked) =>
                  handleToggleSetting("dailyReminder", checked)
                }
              />
            </div>
          </div>
        </Card>

        {/* Sign Out */}
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full min-h-[48px]"
          size="lg"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
