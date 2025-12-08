import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, LogOut, User, Shield, Vibrate, Sparkles, Check, Heart, Pencil, Mail, Lock, Crown, Trash2 } from "lucide-react";
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
import { useHaptic } from "@/hooks/use-haptic";
import { ProfileEditDialog } from "@/components/settings/ProfileEditDialog";
import { AdminPanel } from "@/components/settings/AdminPanel";
import { PremiumModal } from "@/components/settings/PremiumModal";
import { trackEvent } from "@/hooks/use-analytics";

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
  // Granular privacy settings only
  const [streakVisibility, setStreakVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [techniqueVisibility, setTechniqueVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [historyVisibility, setHistoryVisibility] = useState<'all' | 'friends' | 'private'>('friends');
  const [sessionFeedVisibility, setSessionFeedVisibility] = useState<'all' | 'friends' | 'none'>('friends');

  // Timer alert settings
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [screenWakeLock, setScreenWakeLock] = useState(true);
  const [visualFlash, setVisualFlash] = useState(true);
  const [testingFlash, setTestingFlash] = useState(false);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  // Premium modal state
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    testVibration
  } = useHaptic();
  
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
      } = await supabase.from("profiles").select("name, profile_preferences, profile_visibility, show_streak_to_friends, show_techniques_to_friends, show_practice_history, share_sessions_in_feed").eq("id", user.id).single();
      if (profile) {
        setUserName(profile.name || "");
        const prefs = profile.profile_preferences as any;
        setNotifications(prefs?.notifications || false);
        setDailyReminder(prefs?.dailyReminder || false);
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
  const openEditDialog = (type: "name" | "email" | "password") => {
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
      {/* Flash overlay for testing */}
      {testingFlash && <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 animate-pulse" />
          <div className="relative z-10 text-center space-y-6 p-8">
            <div className="text-4xl font-bold text-foreground animate-pulse">
              Timer Complete!
            </div>
            <Button onClick={() => setTestingFlash(false)} size="lg" className="min-w-[200px] min-h-[56px] text-lg">
              <Check className="w-5 h-5 mr-2" />
              Done
            </Button>
          </div>
        </div>}
      
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
                <Button variant="ghost" size="icon" onClick={() => openEditDialog("name")} className="shrink-0">
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
          <ProfileEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} editType={editType} currentValue={editType === "name" ? userName : editType === "email" ? userEmail : ""} onSuccess={fetchSettings} />

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
                <Switch id="notifications" checked={notifications} onCheckedChange={checked => handleToggleSetting("notifications", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="daily-reminder">Daily Reminder</Label>
                  <p className="text-sm text-muted-foreground">
                    Remind me to practice each day
                  </p>
                </div>
                <Switch id="daily-reminder" checked={dailyReminder} onCheckedChange={checked => handleToggleSetting("dailyReminder", checked)} />
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
                <Button variant="outline" size="sm" onClick={() => {
                const success = testVibration();
                if (!success) {
                  toast({
                    title: "Vibration not available",
                    description: "Your device may not support haptic feedback",
                    variant: "destructive"
                  });
                }
              }} className="w-full">
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
                  <Switch id="visual-flash" checked={visualFlash} onCheckedChange={checked => {
                  setVisualFlash(checked);
                  localStorage.setItem('visualFlash', String(checked));
                }} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setTestingFlash(true)} className="w-full">
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
                <Switch id="wake-lock" checked={screenWakeLock} onCheckedChange={checked => {
                setScreenWakeLock(checked);
                localStorage.setItem('screenWakeLock', String(checked));
              }} />
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
                <Label>Streak Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Who can see your meditation streak
                </p>
                <Select value={streakVisibility} onValueChange={(value: 'all' | 'friends' | 'private') => {
                setStreakVisibility(value);
                handlePrivacyUpdate('show_streak_to_friends', value);
              }}>
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
                <Select value={techniqueVisibility} onValueChange={(value: 'all' | 'friends' | 'private') => {
                setTechniqueVisibility(value);
                handlePrivacyUpdate('show_techniques_to_friends', value);
              }}>
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
                <Select value={historyVisibility} onValueChange={(value: 'all' | 'friends' | 'private') => {
                setHistoryVisibility(value);
                handlePrivacyUpdate('show_practice_history', value);
              }}>
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
                <Label>Session Feed Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Share your sessions in the community activity feed
                </p>
                <Select value={sessionFeedVisibility} onValueChange={(value: 'all' | 'friends' | 'none') => {
                setSessionFeedVisibility(value);
                handlePrivacyUpdate('share_sessions_in_feed', value);
                trackEvent('practice_visibility_toggled', { new_visibility_setting: value });
              }}>
                  <SelectTrigger className="min-h-[44px]">
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
              Unlock premium features and enhance your meditation practice.
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