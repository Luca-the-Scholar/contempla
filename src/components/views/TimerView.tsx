import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Pause, Square, Check, AlertTriangle, Volume2, Music } from "lucide-react";
import { DurationInput } from "@/components/ui/duration-input";
import { useToast } from "@/hooks/use-toast";
import { useNoSleep } from "@/hooks/use-nosleep";
import { triggerNotificationHaptic } from "@/lib/haptics";
import { useTimerSound, TimerSound, SOUND_LABELS } from "@/hooks/use-timer-sound";
import { trackEvent } from "@/hooks/use-analytics";
import { incrementSessionAndCheckReview } from "@/lib/app-review";
import { shareSession, canShare } from "@/lib/native-share";
import { scheduleTimerNotification, cancelTimerNotification } from "@/lib/notifications";
import { formatDateForStorage } from "@/lib/date-utils";
import { startSpotifyPlayback, stopSpotifyPlayback } from "@/hooks/use-spotify";
import { formatTechniqueName } from "@/lib/technique-utils";

interface Technique {
  id: string;
  name: string;
  teacher_attribution?: string | null;
  instructions: string;
  tradition: string;
  original_author_name?: string | null;
}
type TimerState = 'setup' | 'running' | 'paused' | 'complete';
export function TimerView() {
  const {
    toast
  } = useToast();
  const noSleep = useNoSleep();
  const {
    playSound,
    stopSound,
    unlockAudio
  } = useTimerSound();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>("");
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [duration, setDuration] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('setup');
  const [initialDuration, setInitialDuration] = useState(0);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [showWakeLockWarning, setShowWakeLockWarning] = useState(false);
  const [selectedSound, setSelectedSound] = useState<TimerSound>('bowl-struck-1');
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [screenWakeLockEnabled, setScreenWakeLockEnabled] = useState(true);
  const [notificationId, setNotificationId] = useState<number | null>(null);
  const [showPartialSaveDialog, setShowPartialSaveDialog] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Spotify playback state - independent of timer state
  // This allows users to control music separately from meditation timer
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string | null>(null);

  // Timer timing state - use elapsed-time calculation for accuracy when screen locks
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);

  // Max duration for input field
  const MAX_DURATION = 999;

  // Guard to prevent multiple completion triggers
  const hasCompletedRef = useRef(false);
  // Guard to prevent multiple start sound plays
  const hasPlayedStartSoundRef = useRef(false);
  const presetDurations = [10, 30, 45, 60];

  // Load timer alert preferences and Spotify settings from localStorage
  useEffect(() => {
    const hapticStored = localStorage.getItem('hapticEnabled');
    if (hapticStored !== null) setHapticEnabled(hapticStored === 'true');
    const soundStored = localStorage.getItem('selectedSound');
    if (soundStored) setSelectedSound(soundStored as TimerSound);
    const wakeLockStored = localStorage.getItem('screenWakeLock');
    if (wakeLockStored !== null) setScreenWakeLockEnabled(wakeLockStored === 'true');

    // Load Spotify settings from database
    async function loadSpotifySettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[Spotify] No user authenticated, skipping settings load');
          return;
        }

        const { data, error } = await supabase
          .from('spotify_settings')
          .select('selected_playlist_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[Spotify] Failed to load settings:', error);
          return;
        }

        if (data?.selected_playlist_name) {
          console.log('[Spotify] Loaded saved playlist:', data.selected_playlist_name);
          setCurrentPlaylistName(data.selected_playlist_name);
        } else {
          console.log('[Spotify] No playlist configured');
        }
      } catch (error) {
        console.error('[Spotify] Error loading settings:', error);
      }
    }

    loadSpotifySettings();
  }, []);
  useEffect(() => {
    fetchTechniques();
  }, []);
  useEffect(() => {
    if (selectedTechniqueId) {
      const technique = techniques.find(t => t.id === selectedTechniqueId);
      setSelectedTechnique(technique || null);
    }
  }, [selectedTechniqueId, techniques]);
  // CRITICAL: Use elapsed-time calculation instead of countdown
  // This ensures timer accuracy even when screen locks or app is backgrounded
  useEffect(() => {
    if (timerState !== 'running' || !timerStartTime || !timerEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timerEndTime - now) / 1000));

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        // Guard: only complete once per timer run
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          handleTimerComplete();
        }
      }
    }, 100); // Check every 100ms for better accuracy

    return () => clearInterval(interval);
  }, [timerState, timerStartTime, timerEndTime]);
  const fetchTechniques = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: techniquesData,
        error: techError
      } = await supabase.from("techniques").select("id, name, teacher_attribution, instructions, tradition, original_author_name");
      if (techError) throw techError;

      // Get the most recent session for each technique to determine sort order
      const {
        data: sessionsData
      } = await supabase.from("sessions").select("technique_id, created_at").eq("user_id", user.id).order("created_at", {
        ascending: false
      });

      // Create a map of technique_id -> most recent session timestamp
      const lastPracticedMap = new Map<string, string>();
      if (sessionsData) {
        for (const session of sessionsData) {
          if (!lastPracticedMap.has(session.technique_id)) {
            lastPracticedMap.set(session.technique_id, session.created_at);
          }
        }
      }

      // Sort by most recently practiced, then by name for techniques never practiced
      const sortedTechniques = (techniquesData || []).sort((a, b) => {
        const aLastPracticed = lastPracticedMap.get(a.id);
        const bLastPracticed = lastPracticedMap.get(b.id);

        // Both have been practiced - sort by most recent
        if (aLastPracticed && bLastPracticed) {
          return new Date(bLastPracticed).getTime() - new Date(aLastPracticed).getTime();
        }

        // Only a has been practiced - a comes first
        if (aLastPracticed && !bLastPracticed) return -1;

        // Only b has been practiced - b comes first
        if (!aLastPracticed && bLastPracticed) return 1;

        // Neither has been practiced - sort alphabetically
        return a.name.localeCompare(b.name);
      });
      setTechniques(sortedTechniques);
      if (sortedTechniques.length > 0 && !selectedTechniqueId) {
        setSelectedTechniqueId(sortedTechniques[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading techniques",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  // Music playback control handlers - independent of timer
  const handlePlayMusic = async () => {
    console.log('[handlePlayMusic] Called');
    console.log('[handlePlayMusic] Current state - isSpotifyPlaying:', isSpotifyPlaying);

    try {
      const result = await startSpotifyPlayback();

      if (result.success) {
        console.log('[handlePlayMusic] Success - setting isSpotifyPlaying to true');
        setIsSpotifyPlaying(true);
        console.log('[Spotify] Playback started successfully');

        // If Spotify app was opened, show toast to guide user back
        if (result.spotifyAppOpened) {
          toast({
            title: "Music started!",
            description: "Swipe back to Contempla",
            duration: 3000,
          });
        }
      } else {
        console.log('[handlePlayMusic] Failed - result:', result);
        setIsSpotifyPlaying(false);

        // Handle specific error codes with toasts
        let errorMessage = "Failed to start music";
        if (result.code === 'NO_ACTIVE_DEVICE') {
          errorMessage = "Make sure Spotify is installed and running";
        } else if (result.code === 'PREMIUM_REQUIRED') {
          errorMessage = "Spotify Premium required";
        } else if (result.code === 'TOKEN_EXPIRED') {
          errorMessage = "Reconnect Spotify in Settings";
        } else if (result.code === 'RATE_LIMITED') {
          errorMessage = "Spotify API limit reached";
        }

        toast({
          title: "Music Error",
          description: errorMessage,
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('[handlePlayMusic] Exception:', error);
      setIsSpotifyPlaying(false);
      toast({
        title: "Music Error",
        description: error.message || "Failed to start music",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handlePauseMusic = async () => {
    console.log('[handlePauseMusic] Called');
    console.log('[handlePauseMusic] Current state - isSpotifyPlaying:', isSpotifyPlaying);

    try {
      const result = await stopSpotifyPlayback();
      if (result.success) {
        console.log('[handlePauseMusic] Success - setting isSpotifyPlaying to false');
        setIsSpotifyPlaying(false);
        console.log('[Spotify] Playback paused');
      } else {
        console.log('[handlePauseMusic] Failed - result:', result);
        toast({
          title: "Music Error",
          description: "Failed to pause music",
          variant: "destructive",
          duration: 2000,
        });
      }
    } catch (error: any) {
      console.error('[handlePauseMusic] Exception:', error);
      toast({
        title: "Music Error",
        description: error.message || "Failed to pause music",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleStart = async () => {
    if (!selectedTechniqueId) {
      toast({
        title: "Select a technique",
        description: "Please select a technique before starting",
        variant: "destructive"
      });
      return;
    }

    // Reset guards for new timer run
    hasCompletedRef.current = false;
    hasPlayedStartSoundRef.current = false;

    // Calculate timer start and end times for elapsed-time calculation
    const startTime = Date.now();
    const endTime = startTime + (duration * 60 * 1000);
    setTimerStartTime(startTime);
    setTimerEndTime(endTime);
    setSecondsLeft(duration * 60);

    // Track timer started
    trackEvent('timer_started', {
      technique_id: selectedTechniqueId
    });

    // Unlock audio on iOS - DO NOT await, must be synchronous in gesture context
    // iOS requires audio to be initiated directly from user gesture
    unlockAudio();

    // Read start sound setting directly from localStorage (SettingsView is source of truth)
    const startSoundStored = localStorage.getItem('startSoundEnabled');
    const isStartSoundEnabled = startSoundStored === null ? true : startSoundStored === 'true';

    // Play start sound exactly once if enabled
    // Native audio (iOS) uses focus: false to mix with Spotify - no pause/resume needed
    // Fallback: If native audio fails and web audio interrupts Spotify, resume it after
    if (isStartSoundEnabled && !hasPlayedStartSoundRef.current) {
      hasPlayedStartSoundRef.current = true;
      
      // Capture state BEFORE playing sound (avoids race conditions)
      const shouldResumeSpotify = isSpotifyPlaying;
      
      playSound(selectedSound, {
        onBeforePlay: async () => {
          console.log('[DEBUG] Start sound - playing');
        },
        onAfterPlay: async () => {
          console.log('[DEBUG] Start sound - finished');
          // Resume Spotify if it was playing (fallback when native audio doesn't work)
          if (shouldResumeSpotify) {
            console.log('[DEBUG] Resuming Spotify after start sound');
            try {
              // Allow device reactivation since iOS may have deactivated Spotify
              await startSpotifyPlayback();
              setIsSpotifyPlaying(true);
            } catch (err) {
              console.error('[DEBUG] Failed to resume Spotify:', err);
            }
          }
        }
      });
    }

    // Enable NoSleep
    if (screenWakeLockEnabled) {
      try {
        await noSleep.enable();
      } catch (err) {
        setShowWakeLockWarning(true);
      }
    }

    // Schedule background notification for when timer completes (with user's selected sound)
    const notifId = await scheduleTimerNotification(duration * 60 * 1000, selectedSound);
    if (notifId) {
      setNotificationId(notifId);
    }

    // Music playback is now controlled independently via Play Music button
    // Start sound plays regardless of music state
    // If music is already playing, start sound overlays it (both audible simultaneously)
    // This provides better user control and eliminates race conditions

    setInitialDuration(duration);
    setSecondsLeft(duration * 60);
    setTimerState('running');
  };
  const handlePause = () => {
    setTimerState('paused');
  };
  const handleResume = () => {
    setTimerState('running');
  };
  const handleStop = () => {
    // Calculate elapsed time in seconds using actual elapsed time
    const elapsed = timerStartTime ? Math.floor((Date.now() - timerStartTime) / 1000) : 0;

    // Stop the timer immediately
    setTimerState('setup');

    // Clear timer timing state
    setTimerStartTime(null);
    setTimerEndTime(null);

    // Cancel notification and stop sounds
    if (notificationId) {
      cancelTimerNotification(notificationId);
      setNotificationId(null);
    }
    stopSound();
    noSleep.disable();

    // Stop Spotify playback
    stopSpotifyPlayback();

    // Ask if they want to save
    setElapsedSeconds(elapsed);
    setShowPartialSaveDialog(true);
  };
  const handleSavePartialSession = async () => {
    setShowPartialSaveDialog(false);

    // Log the partial session (convert seconds to minutes, minimum 1 minute for valid session)
    const minutesToSave = Math.max(1, Math.round(elapsedSeconds / 60));
    await logSession(minutesToSave);
  };
  const handleDiscardPartialSession = () => {
    setShowPartialSaveDialog(false);
  };
  const handleTimerComplete = async () => {
    // Clear timer timing state
    setTimerStartTime(null);
    setTimerEndTime(null);

    // Capture state BEFORE playing sound (avoids race conditions)
    const shouldResumeSpotify = isSpotifyPlaying;

    // Play completion sound
    // Native audio (iOS) uses focus: false to mix with Spotify - no pause/resume needed
    // Fallback: If native audio fails and web audio interrupts Spotify, resume it after
    playSound(selectedSound, {
      onBeforePlay: async () => {
        console.log('[DEBUG] Completion sound - playing');
      },
      onAfterPlay: async () => {
        console.log('[DEBUG] Completion sound - finished');
        // Resume Spotify if it was playing (fallback when native audio doesn't work)
        if (shouldResumeSpotify) {
          console.log('[DEBUG] Resuming Spotify after completion sound');
          try {
            // Allow device reactivation since iOS may have deactivated Spotify
            await startSpotifyPlayback();
            setIsSpotifyPlaying(true);
          } catch (err) {
            console.error('[DEBUG] Failed to resume Spotify:', err);
          }
        }
      }
    });

    // Vibrate - use iOS notification haptic for best effect
    if (hapticEnabled) {
      await triggerNotificationHaptic('success');
    }

    // Cancel any scheduled notification since we're handling completion
    if (notificationId) {
      await cancelTimerNotification(notificationId);
      setNotificationId(null);
    }

    // Music playback continues independently - user controls when to stop
    // Completion sound plays over music if music is still playing
    // This gives users flexibility to continue listening or stop manually

    try {
      await logSession(initialDuration);
    } finally {
      // Check if we should prompt for app review (after 50 sessions, only on native)
      await incrementSessionAndCheckReview();
    }
  };
  const logSession = async (minutesPracticed: number) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user || !selectedTechniqueId || !selectedTechnique) return;
      const {
        error: sessionError
      } = await supabase.from("sessions").insert({
        user_id: user.id,
        technique_id: selectedTechniqueId,
        technique_name: selectedTechnique.name,
        duration_minutes: minutesPracticed,
        session_date: formatDateForStorage(new Date(), true),
        manual_entry: false
      });
      if (sessionError) throw sessionError;

      // Track timer completed and practice logged
      trackEvent('timer_completed', {
        technique_id: selectedTechniqueId,
        duration_minutes: minutesPracticed
      });
      trackEvent('practice_logged', {
        technique_id: selectedTechniqueId,
        duration_minutes: minutesPracticed,
        method: 'timer'
      });

      // Check if user shares sessions to feed and track accordingly
      const {
        data: profile
      } = await supabase.from('profiles').select('share_sessions_in_feed').eq('id', user.id).single();
      if (profile?.share_sessions_in_feed && profile.share_sessions_in_feed !== 'none') {
        trackEvent('practice_posted_to_feed', {
          technique_id: selectedTechniqueId,
          duration_minutes: minutesPracticed
        });
      }
      setTimerState('complete');
    } catch (error: any) {
      toast({
        title: "Error saving session",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleReset = async () => {
    // Reset guards
    hasCompletedRef.current = false;
    hasPlayedStartSoundRef.current = false;

    // Stop any playing sound
    stopSound();

    // Cancel any scheduled notification
    if (notificationId) {
      await cancelTimerNotification(notificationId);
      setNotificationId(null);
    }
    noSleep.disable();
    setShowWakeLockWarning(false);
    setTimerState('setup');
    setSecondsLeft(0);
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  const progress = timerState === 'running' || timerState === 'paused' ? (initialDuration * 60 - secondsLeft) / (initialDuration * 60) * 100 : 0;
  if (techniques.length === 0) {
    return <div className="min-h-screen flex items-center justify-center pb-32 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Techniques Yet</h2>
          <p className="text-muted-foreground">
            Add a technique in your Library to start practicing.
          </p>
        </div>
      </div>;
  }

  // Completion Screen
  if (timerState === 'complete') {
    const minutesPracticed = Math.floor((initialDuration * 60 - secondsLeft) / 60);
    return <>
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center px-4 safe-all">
          <div className="max-w-md w-full space-y-8 text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
              <p className="text-muted-foreground">
                You practiced for {minutesPracticed} minutes
              </p>
            </div>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Technique</p>
              <p className="font-semibold text-lg">{selectedTechnique && formatTechniqueName(selectedTechnique)}</p>
              {selectedTechnique?.original_author_name && <p className="text-sm text-muted-foreground mt-1">Submitted by {selectedTechnique.original_author_name}</p>}
            </Card>

            <Button onClick={handleReset} size="lg" className="w-full">
              Done
            </Button>
          </div>
        </div>
      </>;
  }

  // Full-screen Timer Display
  if (timerState === 'running' || timerState === 'paused') {
    return <>
        {/* Partial Session Save Dialog */}
        <Dialog open={showPartialSaveDialog} onOpenChange={setShowPartialSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save your session?</DialogTitle>
              <DialogDescription>
                {elapsedSeconds >= 60 ? `You've meditated for ${Math.floor(elapsedSeconds / 60)} ${Math.floor(elapsedSeconds / 60) === 1 ? 'minute' : 'minutes'}. Would you like to save this session?` : `You've meditated for ${elapsedSeconds} ${elapsedSeconds === 1 ? 'second' : 'seconds'}. Would you like to save this session?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleDiscardPartialSession} className="w-full sm:w-auto">
                Discard
              </Button>
              <Button onClick={handleSavePartialSession} className="w-full sm:w-auto">
                Save Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-primary/5 z-50 flex flex-col items-center justify-center px-6 safe-top pb-safe-bottom">
        <div className="max-w-sm w-full space-y-6">
          {showWakeLockWarning && <Alert className="bg-accent/20 border-accent/50">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <AlertDescription className="text-sm">
                For best results, please keep your screen awake during your meditation.
              </AlertDescription>
            </Alert>}

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{selectedTechnique && formatTechniqueName(selectedTechnique)}</p>
            {selectedTechnique?.original_author_name && <p className="text-xs text-muted-foreground">Submitted by {selectedTechnique.original_author_name}</p>}
          </div>

          <div className="relative">
            <svg className="w-64 h-64 mx-auto -rotate-90 drop-shadow-lg">
              <circle cx="128" cy="128" r="120" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
              <circle cx="128" cy="128" r="120" stroke="url(#timerGradient)" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 120}`} strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`} className="transition-all duration-1000 ease-linear" strokeLinecap="round" style={{
                filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))'
              }} />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-7xl font-bold tabular-nums text-foreground">
                {formatTime(secondsLeft)}
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            {timerState === 'running' ? <>
                <Button onClick={handlePause} variant="outline" size="lg" className="flex-1 min-w-0">
                  <Pause className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">Pause</span>
                </Button>
                <Button onClick={handleStop} variant="destructive" size="lg" className="flex-1 min-w-0">
                  <Square className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">Stop</span>
                </Button>
              </> : <>
                <Button onClick={handleResume} variant="accent" size="lg" className="flex-1 min-w-0">
                  <Play className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">Resume</span>
                </Button>
                <Button onClick={handleStop} variant="destructive" size="lg" className="flex-1 min-w-0">
                  <Square className="w-5 h-5 mr-2 shrink-0" />
                  <span className="truncate">Stop</span>
                </Button>
              </>}
          </div>

          {/* Screen-on reminder */}
          <p className="text-xs text-muted-foreground text-center">
            For best results, keep this screen open during meditation
          </p>
        </div>
        </div>
      </>;
  }

  // Setup Screen
  return <>
      {/* Partial Session Save Dialog - needs to be outside setup screen to show during running state */}
      <Dialog open={showPartialSaveDialog} onOpenChange={setShowPartialSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your session?</DialogTitle>
            <DialogDescription>
              {elapsedSeconds >= 60 ? `You've meditated for ${Math.floor(elapsedSeconds / 60)} ${Math.floor(elapsedSeconds / 60) === 1 ? 'minute' : 'minutes'}. Would you like to save this session?` : `You've meditated for ${elapsedSeconds} ${elapsedSeconds === 1 ? 'second' : 'seconds'}. Would you like to save this session?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleDiscardPartialSession} className="w-full sm:w-auto">
              Discard
            </Button>
            <Button onClick={handleSavePartialSession} className="w-full sm:w-auto">
              Save Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-transparent pb-32 safe-top">
        <div className="max-w-2xl mx-auto px-[12px] pb-[25px]">
        <Card className="p-6 space-y-6 relative">
          {/* Minimal Spotify Button - Upper Right Corner */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={isSpotifyPlaying ? handlePauseMusic : handlePlayMusic}
            aria-label={isSpotifyPlaying ? "Pause music" : "Play music"}
            disabled={!currentPlaylistName}
          >
            <Music className={`h-5 w-5 ${isSpotifyPlaying ? 'text-green-500 animate-pulse' : currentPlaylistName ? 'text-muted-foreground' : 'text-muted-foreground/30'}`} />
          </Button>

          {/* Technique Selection */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Select Technique
            </h2>
            <Select value={selectedTechniqueId} onValueChange={setSelectedTechniqueId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a technique" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {techniques.map(technique => <SelectItem key={technique.id} value={technique.id} className="py-3">
                    <div className="line-clamp-2 whitespace-normal leading-snug">
                      {formatTechniqueName(technique)}
                    </div>
                  </SelectItem>)}
              </SelectContent>
            </Select>

            {selectedTechnique && <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-all" onClick={() => setInstructionsModalOpen(true)}>
              <p className="text-sm text-foreground/80 line-clamp-4 whitespace-pre-wrap">
                  {selectedTechnique.instructions}
                </p>
                <p className="text-xs text-primary mt-2">Tap to view full instructions</p>
              </div>}
          </div>

          {/* Duration Selection */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Duration
            </h2>
            <div className="flex gap-2 mb-4 justify-center max-w-full overflow-hidden">
              {presetDurations.map(preset => <Button key={preset} variant={duration === preset ? "default" : "outline"} className="px-5 py-2.5 text-base min-w-0" onClick={() => setDuration(preset)}>
                  {preset}m
                </Button>)}
            </div>

            <DurationInput value={duration} onChange={setDuration} max={MAX_DURATION} className="w-full" />
          </div>

          {/* Sound Selection */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Completion Sound
            </h2>
            <div className="flex gap-2">
              <Select value={selectedSound} onValueChange={val => {
                stopSound();
                setSelectedSound(val as TimerSound);
                localStorage.setItem('selectedSound', val);
              }}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOUND_LABELS) as TimerSound[]).map(sound => <SelectItem key={sound} value={sound}>
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        {SOUND_LABELS[sound]}
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => {
                if (selectedSound === 'none') return;

                // Unlock audio on iOS - must be synchronous in gesture context
                unlockAudio();
                playSound(selectedSound);
              }} disabled={selectedSound === 'none'}>
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Start Button */}
          <Button onClick={handleStart} variant="accent" size="lg" className="w-full text-lg" disabled={!selectedTechniqueId || duration === 0}>
            <Play className="w-5 h-5 mr-2" />
            Start Meditation
          </Button>
        </Card>
      </div>

      {/* Instructions Modal */}
      <Dialog open={instructionsModalOpen} onOpenChange={setInstructionsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTechnique && formatTechniqueName(selectedTechnique)}</DialogTitle>
            {selectedTechnique?.original_author_name && <DialogDescription>Submitted by {selectedTechnique.original_author_name}</DialogDescription>}
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{selectedTechnique?.instructions}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>;
}