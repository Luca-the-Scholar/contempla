import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, LogOut, User, Shield, Database, ShieldCheck, Vibrate, Volume2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AdminApprovalPanel } from "@/components/admin/AdminApprovalPanel";
import { useHaptic } from "@/hooks/use-haptic";
import { useTimerSound, TimerSound, SOUND_LABELS } from "@/hooks/use-timer-sound";

export function SettingsView() {
  const [userName, setUserName] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends_only' | 'private'>('public');
  const [showPracticeHistory, setShowPracticeHistory] = useState(true);
  const [showStreakToFriends, setShowStreakToFriends] = useState(true);
  const [showTechniquesToFriends, setShowTechniquesToFriends] = useState(true);
  const [shareHealthData, setShareHealthData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Timer alert settings
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [screenWakeLock, setScreenWakeLock] = useState(true);
  const [visualFlash, setVisualFlash] = useState(true);
  const [testingFlash, setTestingFlash] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSupported: hapticSupported, testVibration } = useHaptic();
  const { playSound, unlockAudio } = useTimerSound();

  useEffect(() => {
    fetchSettings();
    checkAdminStatus();
    // Load timer alert preferences
    const hapticStored = localStorage.getItem('hapticEnabled');
    if (hapticStored !== null) setHapticEnabled(hapticStored === 'true');
    
    const wakeLockStored = localStorage.getItem('screenWakeLock');
    if (wakeLockStored !== null) setScreenWakeLock(wakeLockStored === 'true');
    
    const flashStored = localStorage.getItem('visualFlash');
    if (flashStored !== null) setVisualFlash(flashStored === 'true');
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, profile_preferences, profile_visibility, show_practice_history, show_streak_to_friends, show_techniques_to_friends, share_health_data_for_research")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name || "");
        const prefs = profile.profile_preferences as any;
        setNotifications(prefs?.notifications || false);
        setDailyReminder(prefs?.dailyReminder || false);
        
        setProfileVisibility((profile.profile_visibility as any) || 'public');
        setShowPracticeHistory(profile.show_practice_history !== false);
        setShowStreakToFriends(profile.show_streak_to_friends !== false);
        setShowTechniquesToFriends(profile.show_techniques_to_friends !== false);
        setShareHealthData(profile.share_health_data_for_research === true);
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data);
    } catch (error) {
      // User is not admin, that's fine
      setIsAdmin(false);
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

  const handlePrivacyUpdate = async (field: string, value: any) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Privacy setting updated" });
    } catch (error: any) {
      toast({
        title: "Error updating privacy setting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Flash overlay for testing */}
      {testingFlash && (
        <div className="fixed inset-0 bg-primary/30 z-[100] pointer-events-none animate-pulse" />
      )}
      
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

        {/* Timer Alerts */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Timer Alerts</h2>
          </div>
          <div className="space-y-5">
            {/* Test Completion Sounds */}
            <div className="space-y-2">
              <Label>Test Completion Sounds</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Preview the sounds available when timer completes
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SOUND_LABELS) as TimerSound[])
                  .filter(sound => sound !== 'none')
                  .map((sound) => (
                    <Button
                      key={sound}
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await unlockAudio();
                        playSound(sound);
                      }}
                      className="flex flex-col gap-1 h-auto py-2"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs">{SOUND_LABELS[sound]}</span>
                    </Button>
                  ))}
              </div>
            </div>

            {/* Vibration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="haptic">Vibration</Label>
                  <p className="text-sm text-muted-foreground">
                    Phone vibrates when timer ends
                  </p>
                </div>
                <Switch
                  id="haptic"
                  checked={hapticEnabled}
                  onCheckedChange={(checked) => {
                    setHapticEnabled(checked);
                    localStorage.setItem('hapticEnabled', String(checked));
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const success = testVibration();
                  if (!success) {
                    toast({ title: "Vibration not available", description: "Your device may not support haptic feedback", variant: "destructive" });
                  }
                }}
                className="w-full"
              >
                <Vibrate className="w-4 h-4 mr-2" />
                Test Vibration
              </Button>
            </div>

            {/* Visual Flash */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="visual-flash">Visual Flash</Label>
                  <p className="text-sm text-muted-foreground">
                    Screen flashes when timer completes
                  </p>
                </div>
                <Switch
                  id="visual-flash"
                  checked={visualFlash}
                  onCheckedChange={(checked) => {
                    setVisualFlash(checked);
                    localStorage.setItem('visualFlash', String(checked));
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTestingFlash(true);
                  setTimeout(() => setTestingFlash(false), 500);
                }}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Test Visual Flash
              </Button>
            </div>

            {/* Screen Wake Lock */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="wake-lock">Keep Screen Awake</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevents screen from sleeping during meditation
                  </p>
                </div>
                <Switch
                  id="wake-lock"
                  checked={screenWakeLock}
                  onCheckedChange={(checked) => {
                    setScreenWakeLock(checked);
                    localStorage.setItem('screenWakeLock', String(checked));
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Separator className="my-6" />

        {/* Privacy Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Profile Visibility</Label>
              <Select
                value={profileVisibility}
                onValueChange={(value: 'public' | 'friends_only' | 'private') => {
                  setProfileVisibility(value);
                  handlePrivacyUpdate('profile_visibility', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can view</SelectItem>
                  <SelectItem value="friends_only">Friends Only</SelectItem>
                  <SelectItem value="private">Private - Only you</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Control who can see your meditation profile and stats
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <Label>Show Practice History</Label>
                <p className="text-sm text-muted-foreground">Allow others to see your detailed practice history</p>
              </div>
              <Switch
                checked={showPracticeHistory}
                onCheckedChange={(checked) => {
                  setShowPracticeHistory(checked);
                  handlePrivacyUpdate('show_practice_history', checked);
                }}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <Label>Show Streak to Friends</Label>
                <p className="text-sm text-muted-foreground">Let friends see your current meditation streak</p>
              </div>
              <Switch
                checked={showStreakToFriends}
                onCheckedChange={(checked) => {
                  setShowStreakToFriends(checked);
                  handlePrivacyUpdate('show_streak_to_friends', checked);
                }}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <Label>Show Techniques to Friends</Label>
                <p className="text-sm text-muted-foreground">Allow friends to see which techniques you practice</p>
              </div>
              <Switch
                checked={showTechniquesToFriends}
                onCheckedChange={(checked) => {
                  setShowTechniquesToFriends(checked);
                  handlePrivacyUpdate('show_techniques_to_friends', checked);
                }}
                disabled={saving}
              />
            </div>
          </div>
        </Card>

        {/* Health Data Research */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Data & Research</h2>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <Label>Share Health Data for Research</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Contribute anonymized health and meditation data to help research on meditation benefits. 
                Opting out means your data stays private and won't be used for analytics or research purposes.
              </p>
            </div>
            <Switch
              checked={shareHealthData}
              onCheckedChange={(checked) => {
                setShareHealthData(checked);
                handlePrivacyUpdate('share_health_data_for_research', checked);
              }}
              disabled={saving}
            />
          </div>
        </Card>

        <Separator className="my-6" />

        {/* Admin Section */}
        {isAdmin && (
          <>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Admin Panel</h2>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Review and approve technique submissions for the global library.
                </p>
                <AdminApprovalPanel />
              </div>
            </Card>

            <Separator className="my-6" />
          </>
        )}

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
    </>
  );
}