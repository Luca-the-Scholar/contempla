import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, LogOut, User, Shield, Vibrate, Volume2, Sparkles, Check, Heart, ExternalLink, Pencil, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useHaptic } from "@/hooks/use-haptic";
import { useTimerSound, TimerSound, SOUND_LABELS } from "@/hooks/use-timer-sound";
import { ProfileEditDialog } from "@/components/settings/ProfileEditDialog";

export function SettingsView() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<"name" | "email" | "password">("name");
  
  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends_only' | 'private'>('public');
  const [streakVisibility, setStreakVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [techniqueVisibility, setTechniqueVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [historyVisibility, setHistoryVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  
  // Timer alert settings
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [screenWakeLock, setScreenWakeLock] = useState(true);
  const [visualFlash, setVisualFlash] = useState(true);
  const [testingFlash, setTestingFlash] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { testVibration } = useHaptic();
  const { playSound, unlockAudio } = useTimerSound();

  useEffect(() => {
    fetchSettings();
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

      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, profile_preferences, profile_visibility, show_streak_to_friends, show_techniques_to_friends, show_practice_history")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.name || "");
        const prefs = profile.profile_preferences as any;
        setNotifications(prefs?.notifications || false);
        setDailyReminder(prefs?.dailyReminder || false);
        setProfileVisibility((profile.profile_visibility as any) || 'public');
        setStreakVisibility((profile.show_streak_to_friends as any) || 'friends');
        setTechniqueVisibility((profile.show_techniques_to_friends as any) || 'friends');
        setHistoryVisibility((profile.show_practice_history as any) || 'friends');
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const openEditDialog = (type: "name" | "email" | "password") => {
    setEditType(type);
    setEditDialogOpen(true);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 animate-pulse" />
          <div className="relative z-10 text-center space-y-6 p-8">
            <div className="text-4xl font-bold text-foreground animate-pulse">
              Timer Complete!
            </div>
            <Button 
              onClick={() => setTestingFlash(false)} 
              size="lg" 
              className="min-w-[200px] min-h-[56px] text-lg"
            >
              <Check className="w-5 h-5 mr-2" />
              Done
            </Button>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-background pb-32">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Profile Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Account</h2>
            </div>
            <div className="space-y-4">
              {/* Display Name */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Label className="text-muted-foreground text-sm">Display Name</Label>
                  <p className="text-foreground font-medium truncate">{userName || "Not set"}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => openEditDialog("name")}
                  className="shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Label className="text-muted-foreground text-sm flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </Label>
                  <p className="text-foreground font-medium truncate">{userEmail}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => openEditDialog("email")}
                  className="shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Label className="text-muted-foreground text-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Password
                  </Label>
                  <p className="text-foreground font-medium">••••••••</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => openEditDialog("password")}
                  className="shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Edit Profile Dialog */}
          <ProfileEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            editType={editType}
            currentValue={editType === "name" ? userName : editType === "email" ? userEmail : ""}
            onSuccess={fetchSettings}
          />

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
                  onClick={() => setTestingFlash(true)}
                  className="w-full"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Test Visual Flash
                </Button>
              </div>

              {/* Screen Wake Lock */}
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
          </Card>

          {/* Privacy */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Privacy</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Visibility</Label>
                <Select 
                  value={profileVisibility} 
                  onValueChange={(value: 'public' | 'friends_only' | 'private') => {
                    setProfileVisibility(value);
                    handlePrivacyUpdate('profile_visibility', value);
                  }}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends_only">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Streak Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Who can see your meditation streak
                </p>
                <Select 
                  value={streakVisibility} 
                  onValueChange={(value: 'all' | 'friends' | 'private') => {
                    setStreakVisibility(value);
                    handlePrivacyUpdate('show_streak_to_friends', value);
                  }}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Most Practiced Technique</Label>
                <p className="text-sm text-muted-foreground">
                  Who can see your favorite technique
                </p>
                <Select 
                  value={techniqueVisibility} 
                  onValueChange={(value: 'all' | 'friends' | 'private') => {
                    setTechniqueVisibility(value);
                    handlePrivacyUpdate('show_techniques_to_friends', value);
                  }}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Practice History</Label>
                <p className="text-sm text-muted-foreground">
                  Who can see your practice calendar
                </p>
                <Select 
                  value={historyVisibility} 
                  onValueChange={(value: 'all' | 'friends' | 'private') => {
                    setHistoryVisibility(value);
                    handlePrivacyUpdate('show_practice_history', value);
                  }}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Support */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Support the App</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Help us continue developing and improving the meditation experience.
            </p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full min-h-[44px]"
                onClick={() => window.open('https://ko-fi.com/', '_blank')}
              >
                <Heart className="w-4 h-4 mr-2" />
                Support on Ko-fi
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="secondary" 
                className="w-full min-h-[44px]"
                onClick={() => toast({ title: "Coming Soon!", description: "Premium features are in development." })}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Join Premium Waitlist
              </Button>
            </div>
          </Card>

          <Separator />

          {/* Sign Out */}
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
