import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, LogOut, User, Shield, Vibrate, Sparkles, Check, Heart, Pencil, Mail, Lock, Crown, Trash2, Music, Wifi, HelpCircle, PlayCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { triggerNotificationHaptic } from "@/lib/haptics";
import { ProfileEditDialog } from "@/components/settings/ProfileEditDialog";
import { AdminPanel } from "@/components/settings/AdminPanel";
import { PremiumModal } from "@/components/settings/PremiumModal";
import { SpotifySettings } from "@/components/settings/SpotifySettings";
import { EdgeFunctionTest } from "@/components/diagnostics/EdgeFunctionTest";
import { trackEvent } from "@/hooks/use-analytics";
import { scheduleReminders, requestReminderPermissions, checkReminderPermissions } from "@/lib/reminder-scheduler";

export function SettingsView() {
  const [userName, setUserName] = useState("");
  const [userHandle, setUserHandle] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [saving, setSaving] = useState(false);

  // Daily reminder settings
  const [morningEnabled, setMorningEnabled] = useState(false);
  const [morningTime, setMorningTime] = useState("08:00");
  const [eveningEnabled, setEveningEnabled] = useState(false);
  const [eveningTime, setEveningTime] = useState("20:00");

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<"name" | "email" | "password" | "handle">("name");

  // Privacy settings
  // Granular privacy settings only
  const [streakVisibility, setStreakVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [techniqueVisibility, setTechniqueVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [historyVisibility, setHistoryVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [sessionFeedVisibility, setSessionFeedVisibility] = useState<'all' | 'friends' | 'none'>('friends');

  // Timer alert settings
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [screenWakeLock, setScreenWakeLock] = useState(true);
  const [startSoundEnabled, setStartSoundEnabled] = useState(true);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  // Premium modal state
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchSettings();
    // Load timer alert preferences
    const hapticStored = localStorage.getItem('hapticEnabled');
    if (hapticStored !== null) setHapticEnabled(hapticStored === 'true');
    const wakeLockStored = localStorage.getItem('screenWakeLock');
    if (wakeLockStored !== null) setScreenWakeLock(wakeLockStored === 'true');
    const startSoundStored = localStorage.getItem('startSoundEnabled');
    if (startSoundStored !== null) setStartSoundEnabled(startSoundStored === 'true');
  }, []);
  const fetchSettings = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      // Check if user is admin
      const {
        data: adminCheck
      } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin"
      });
      setIsAdmin(!!adminCheck);
      const {
        data: profile
      } = await supabase.from("profiles").select("name, handle, profile_preferences, profile_visibility, show_streak_to_friends, show_techniques_to_friends, show_practice_history, share_sessions_in_feed").eq("id", user.id).single();
      if (profile) {
        setUserName(profile.name || "");
        setUserHandle(profile.handle);
        const prefs = profile.profile_preferences as any;
        setNotifications(prefs?.notifications || false);
        setDailyReminder(prefs?.dailyReminder || false);

        // Load reminder settings
        setMorningEnabled(prefs?.morningEnabled || false);
        setMorningTime(prefs?.morningTime || "08:00");
        setEveningEnabled(prefs?.eveningEnabled || false);
        setEveningTime(prefs?.eveningTime || "20:00");
        // Profile visibility removed - using granular settings only
        setStreakVisibility(profile.show_streak_to_friends as any || 'friends');
        setTechniqueVisibility(profile.show_techniques_to_friends as any || 'friends');
        setHistoryVisibility(profile.show_practice_history as any || 'friends');
        setSessionFeedVisibility(profile.share_sessions_in_feed as any || 'friends');
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };
  const openEditDialog = (type: "name" | "email" | "password" | "handle") => {
    setEditType(type);
    setEditDialogOpen(true);
  };
  const handleToggleSetting = async (key: string, value: boolean) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: profile
      } = await supabase.from("profiles").select("profile_preferences").eq("id", user.id).single();
      const prefs = profile?.profile_preferences as any || {};
      prefs[key] = value;
      const {
        error
      } = await supabase.from("profiles").upsert({
        id: user.id,
        profile_preferences: prefs
      });
      if (error) throw error;
      if (key === "notifications") setNotifications(value);
      if (key === "dailyReminder") setDailyReminder(value);
      toast({
        title: "Setting updated!"
      });
    } catch (error: any) {
      toast({
        title: "Error updating setting",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handler for morning reminder toggle
  const handleMorningToggle = async (checked: boolean) => {
    try {
      // Check/request permissions first
      const hasPermission = await checkReminderPermissions();
      if (!hasPermission && checked) {
        const granted = await requestReminderPermissions();
        if (!granted) {
          toast({
            title: "Permission denied",
            description: "Please enable notifications in your device settings to use reminders.",
            variant: "destructive",
          });
          return;
        }
      }

      setMorningEnabled(checked);
      await saveReminderSettings({ morningEnabled: checked });
    } catch (error: any) {
      toast({
        title: "Error updating reminder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handler for evening reminder toggle
  const handleEveningToggle = async (checked: boolean) => {
    try {
      // Check/request permissions first
      const hasPermission = await checkReminderPermissions();
      if (!hasPermission && checked) {
        const granted = await requestReminderPermissions();
        if (!granted) {
          toast({
            title: "Permission denied",
            description: "Please enable notifications in your device settings to use reminders.",
            variant: "destructive",
          });
          return;
        }
      }

      setEveningEnabled(checked);
      await saveReminderSettings({ eveningEnabled: checked });
    } catch (error: any) {
      toast({
        title: "Error updating reminder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handler for time changes
  const handleTimeChange = async (type: 'morning' | 'evening', time: string) => {
    if (type === 'morning') {
      setMorningTime(time);
      await saveReminderSettings({ morningTime: time });
    } else {
      setEveningTime(time);
      await saveReminderSettings({ eveningTime: time });
    }
  };

  // Save reminder settings to database and schedule notifications
  const saveReminderSettings = async (updates: Partial<{
    morningEnabled: boolean;
    morningTime: string;
    eveningEnabled: boolean;
    eveningTime: string;
  }>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_preferences")
        .eq("id", user.id)
        .single();

      const prefs = (profile?.profile_preferences as any) || {};

      // Update with new reminder settings
      const newPrefs = {
        ...prefs,
        morningEnabled: updates.morningEnabled !== undefined ? updates.morningEnabled : morningEnabled,
        morningTime: updates.morningTime || morningTime,
        eveningEnabled: updates.eveningEnabled !== undefined ? updates.eveningEnabled : eveningEnabled,
        eveningTime: updates.eveningTime || eveningTime,
      };

      // Save to database
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          profile_preferences: newPrefs,
        });

      if (error) throw error;

      // Schedule/update notifications
      await scheduleReminders({
        morningEnabled: newPrefs.morningEnabled,
        morningTime: newPrefs.morningTime,
        eveningEnabled: newPrefs.eveningEnabled,
        eveningTime: newPrefs.eveningTime,
      });

      toast({
        title: "Reminder updated!",
        description: "Your daily meditation reminder has been saved.",
      });
    } catch (error: any) {
      console.error("Error saving reminder settings:", error);
      toast({
        title: "Error saving reminder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePrivacyUpdate = async (field: string, value: any) => {
    setSaving(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        error
      } = await supabase.from("profiles").update({
        [field]: value
      }).eq("id", user.id);
      if (error) throw error;
      toast({
        title: "Privacy setting updated"
      });
    } catch (error: any) {
      toast({
        title: "Error updating privacy setting",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handleClearHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "History cleared",
        description: "All your meditation sessions have been deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error clearing history",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return <>
      <div className="min-h-screen bg-transparent pb-32 safe-top">
        <div className="max-w-2xl mx-auto space-y-4 px-[12px] pb-[25px]">
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
                <Button variant="ghost" size="icon" onClick={() => openEditDialog("name")} className="shrink-0">
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>

              {/* Handle */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Label className="text-muted-foreground text-sm">Handle</Label>
                  <p className="text-foreground font-medium truncate">
                    {userHandle ? `@${userHandle}` : <span className="text-muted-foreground italic">Not set — friends can't find you</span>}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEditDialog("handle")} className="shrink-0">
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
                <Button variant="ghost" size="icon" onClick={() => openEditDialog("email")} className="shrink-0">
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
                <Button variant="ghost" size="icon" onClick={() => openEditDialog("password")} className="shrink-0">
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Edit Profile Dialog */}
          <ProfileEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} editType={editType} currentValue={editType === "name" ? userName : editType === "handle" ? (userHandle || "") : editType === "email" ? userEmail : ""} onSuccess={fetchSettings} />

          {/* Daily Reminders */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Daily Reminders</h2>
            </div>
            <div className="space-y-5">
              {/* Morning Reminder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="morning-reminder">Morning Reminder</Label>
                    <p className="text-sm text-muted-foreground">
                      Start your day with meditation
                    </p>
                  </div>
                  <Switch
                    id="morning-reminder"
                    checked={morningEnabled}
                    onCheckedChange={handleMorningToggle}
                  />
                </div>

                {morningEnabled && (
                  <div className="pl-4 border-l-2 border-accent/20">
                    <Label htmlFor="morning-time" className="text-sm">Time</Label>
                    <Input
                      id="morning-time"
                      type="time"
                      step="1"
                      value={morningTime}
                      onChange={(e) => handleTimeChange('morning', e.target.value)}
                      className="w-32 mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Evening Reminder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="evening-reminder">Evening Reminder</Label>
                    <p className="text-sm text-muted-foreground">
                      Wind down with reflection
                    </p>
                  </div>
                  <Switch
                    id="evening-reminder"
                    checked={eveningEnabled}
                    onCheckedChange={handleEveningToggle}
                  />
                </div>

                {eveningEnabled && (
                  <div className="pl-4 border-l-2 border-accent/20">
                    <Label htmlFor="evening-time" className="text-sm">Time</Label>
                    <Input
                      id="evening-time"
                      type="time"
                      step="1"
                      value={eveningTime}
                      onChange={(e) => handleTimeChange('evening', e.target.value)}
                      className="w-32 mt-1"
                    />
                  </div>
                )}
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

              {/* Vibration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="haptic">Vibration</Label>
                    <p className="text-sm text-muted-foreground">
                      Phone vibrates when timer ends
                    </p>
                  </div>
                  <Switch id="haptic" checked={hapticEnabled} onCheckedChange={checked => {
                  setHapticEnabled(checked);
                  localStorage.setItem('hapticEnabled', String(checked));
                }} />
                </div>
                <Button variant="outline" size="sm" onClick={async () => {
                const success = await triggerNotificationHaptic('success');
                if (!success) {
                  toast({
                    title: "Vibration not available",
                    description: "Your device may not support haptic feedback",
                    variant: "destructive"
                  });
                } else {
                  toast({
                    title: "Vibration test successful",
                    description: "This is how your phone will vibrate when the timer ends",
                  });
                }
              }} className="w-full">
                  <Vibrate className="w-4 h-4 mr-2" />
                  Test Vibration
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
                <Switch id="wake-lock" checked={screenWakeLock} onCheckedChange={checked => {
                setScreenWakeLock(checked);
                localStorage.setItem('screenWakeLock', String(checked));
              }} />
              </div>

              {/* Start Sound */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="start-sound">Start Sound</Label>
                  <p className="text-sm text-muted-foreground">
                    Play a sound when timer begins
                  </p>
                </div>
                <Switch id="start-sound" checked={startSoundEnabled} onCheckedChange={checked => {
                setStartSoundEnabled(checked);
                localStorage.setItem('startSoundEnabled', String(checked));
              }} />
              </div>
            </div>
          </Card>

          {/* Spotify */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Music className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Spotify</h2>
            </div>
            <SpotifySettings />
          </Card>

          {/* Help & Support */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Help & Support</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Welcome Tutorial</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review the app features and how to get started
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/?showWelcome=true')}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  View Tutorial
                </Button>
              </div>
            </div>
          </Card>

          {/* Privacy */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Privacy</h2>
            </div>

            {/* Privacy Presets */}
            <div className="mb-6">
              <Label className="mb-2 block">Quick Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStreakVisibility('all');
                    setTechniqueVisibility('all');
                    setHistoryVisibility('all');
                    setSessionFeedVisibility('all');
                    handlePrivacyUpdate('show_streak_to_friends', 'all');
                    handlePrivacyUpdate('show_techniques_to_friends', 'all');
                    handlePrivacyUpdate('show_practice_history', 'all');
                    handlePrivacyUpdate('share_sessions_in_feed', 'all');
                  }}
                >
                  Public
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStreakVisibility('friends');
                    setTechniqueVisibility('friends');
                    setHistoryVisibility('friends');
                    setSessionFeedVisibility('friends');
                    handlePrivacyUpdate('show_streak_to_friends', 'friends');
                    handlePrivacyUpdate('show_techniques_to_friends', 'friends');
                    handlePrivacyUpdate('show_practice_history', 'friends');
                    handlePrivacyUpdate('share_sessions_in_feed', 'friends');
                  }}
                >
                  Friends Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStreakVisibility('private');
                    setTechniqueVisibility('private');
                    setHistoryVisibility('private');
                    setSessionFeedVisibility('none');
                    handlePrivacyUpdate('show_streak_to_friends', 'private');
                    handlePrivacyUpdate('show_techniques_to_friends', 'private');
                    handlePrivacyUpdate('show_practice_history', 'private');
                    handlePrivacyUpdate('share_sessions_in_feed', 'none');
                  }}
                >
                  Private
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Or customize individual settings below
              </p>
            </div>

            <div className="space-y-4">
              
              <div className="space-y-2">
                <Label>Streak Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Who can see your meditation streak
                </p>
                <Select value={streakVisibility} onValueChange={(value: 'all' | 'friends' | 'private') => {
                setStreakVisibility(value);
                handlePrivacyUpdate('show_streak_to_friends', value);
              }}>
                  <SelectTrigger>
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
                <Select value={techniqueVisibility} onValueChange={(value: 'all' | 'friends' | 'private') => {
                setTechniqueVisibility(value);
                handlePrivacyUpdate('show_techniques_to_friends', value);
              }}>
                  <SelectTrigger>
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
                <Select value={historyVisibility} onValueChange={(value: 'all' | 'friends' | 'private') => {
                setHistoryVisibility(value);
                handlePrivacyUpdate('show_practice_history', value);
              }}>
                  <SelectTrigger>
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
                <Label>Session Feed Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Share your sessions in the community activity feed
                </p>
                <Select value={sessionFeedVisibility} onValueChange={(value: 'all' | 'friends' | 'none') => {
                setSessionFeedVisibility(value);
                handlePrivacyUpdate('share_sessions_in_feed', value);
                trackEvent('practice_visibility_toggled', { new_visibility_setting: value });
              }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="none">Don't Share</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Premium */}
          <Card className="p-6 border-accent/20">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-gradient">Contempla+</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Unlock premium features and support Contempla's mission to expand meditation knowledge.
            </p>
            <Button 
              className="w-full min-h-[44px] bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70" 
              onClick={async () => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    await supabase.from("subscription_interest").insert({
                      user_id: user.id,
                      action_type: "settings_click",
                      metadata: { 
                        source: "settings_card",
                        email: user.email,
                        timestamp: new Date().toISOString()
                      }
                    });
                  }
                } catch (error) {
                  console.error("Error tracking click:", error);
                }
                setPremiumModalOpen(true);
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Contempla+
            </Button>
          </Card>
          
          <PremiumModal open={premiumModalOpen} onOpenChange={setPremiumModalOpen} />

          {/* Admin Panel - Only visible for admins */}
          {isAdmin && <Card className="p-6 border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Administration</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Manage user roles and approve technique submissions.
              </p>
              <Button variant="outline" className="w-full min-h-[44px]" onClick={() => setAdminPanelOpen(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Open Admin Panel
              </Button>
            </Card>}

          <AdminPanel open={adminPanelOpen} onOpenChange={setAdminPanelOpen} />

          {/* Diagnostics */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wifi className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Diagnostics</h2>
            </div>
            <EdgeFunctionTest />
          </Card>

          {/* Data Management */}
          <Card className="p-6 border-destructive/20">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold">Data Management</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Clear all your meditation session history. This cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full min-h-[44px] border-destructive/50 text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Entire Meditation History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your meditation sessions, including your streak data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearHistory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>

          <Separator />

          {/* Sign Out */}
          <Button variant="outline" className="w-full min-h-[44px]" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </>;
}