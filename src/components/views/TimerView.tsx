import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Pause, Square, Check, AlertTriangle, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNoSleep } from "@/hooks/use-nosleep";
import { useHaptic, TIMER_COMPLETE_PATTERN } from "@/hooks/use-haptic";
import { useTimerSound, TimerSound, SOUND_LABELS } from "@/hooks/use-timer-sound";

interface Technique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  original_author_name?: string | null;
}

type TimerState = 'setup' | 'running' | 'paused' | 'complete';

export function TimerView() {
  const { toast } = useToast();
  const noSleep = useNoSleep();
  const { playSound, unlockAudio } = useTimerSound();
  const { vibrate } = useHaptic();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>("");
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [duration, setDuration] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('setup');
  const [initialDuration, setInitialDuration] = useState(0);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [showWakeLockWarning, setShowWakeLockWarning] = useState(false);
  const [selectedSound, setSelectedSound] = useState<TimerSound>('singing-bowl');
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [visualFlashEnabled, setVisualFlashEnabled] = useState(true);
  const [screenWakeLockEnabled, setScreenWakeLockEnabled] = useState(true);
  const [showCompletionFlash, setShowCompletionFlash] = useState(false);
  
  const presetDurations = [5, 15, 30, 60];

  // Load timer alert preferences from localStorage
  useEffect(() => {
    const hapticStored = localStorage.getItem('hapticEnabled');
    if (hapticStored !== null) setHapticEnabled(hapticStored === 'true');
    
    const soundStored = localStorage.getItem('selectedSound');
    if (soundStored) setSelectedSound(soundStored as TimerSound);
    
    const flashStored = localStorage.getItem('visualFlash');
    if (flashStored !== null) setVisualFlashEnabled(flashStored === 'true');
    
    const wakeLockStored = localStorage.getItem('screenWakeLock');
    if (wakeLockStored !== null) setScreenWakeLockEnabled(wakeLockStored === 'true');
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

  useEffect(() => {
    if (timerState !== 'running') return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  const fetchTechniques = async () => {
    try {
      const { data: techniquesData, error: techError } = await supabase
        .from("techniques")
        .select("id, name, instructions, tradition, original_author_name");
      
      if (techError) throw techError;

      // Sort by name
      const sortedTechniques = (techniquesData || []).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

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

  const handleStart = async () => {
    if (!selectedTechniqueId) {
      toast({
        title: "Select a technique",
        description: "Please select a technique before starting",
        variant: "destructive"
      });
      return;
    }

    // Unlock audio on iOS
    await unlockAudio();

    // Enable NoSleep
    if (screenWakeLockEnabled) {
      try {
        await noSleep.enable();
      } catch (err) {
        setShowWakeLockWarning(true);
      }
    }

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
    handleReset();
  };

  const handleTimerComplete = async () => {
    // Visual flash
    if (visualFlashEnabled) {
      setShowCompletionFlash(true);
    }
    
    // Play sound
    playSound(selectedSound, 2);
    
    // Vibrate
    if (hapticEnabled) {
      vibrate(TIMER_COMPLETE_PATTERN);
    }

    await logSession(initialDuration);
  };
  
  const dismissFlash = () => {
    setShowCompletionFlash(false);
  };

  const logSession = async (minutesPracticed: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedTechniqueId) return;

      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        technique_id: selectedTechniqueId,
        duration_minutes: minutesPracticed,
        manual_entry: false
      });

      if (sessionError) throw sessionError;

      setTimerState('complete');
    } catch (error: any) {
      toast({
        title: "Error saving session",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
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

  const progress = timerState === 'running' || timerState === 'paused' 
    ? (initialDuration * 60 - secondsLeft) / (initialDuration * 60) * 100 
    : 0;

  if (techniques.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Techniques Yet</h2>
          <p className="text-muted-foreground">
            Add a technique in your Library to start practicing.
          </p>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (timerState === 'complete') {
    const minutesPracticed = Math.floor((initialDuration * 60 - secondsLeft) / 60);
    
    return (
      <>
        {showCompletionFlash && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            <div className="relative z-10 text-center space-y-6 p-8">
              <div className="text-4xl font-bold text-foreground animate-pulse">
                Session Complete!
              </div>
              <Button 
                onClick={dismissFlash} 
                size="lg" 
                className="min-w-[200px] min-h-[56px] text-lg"
              >
                <Check className="w-5 h-5 mr-2" />
                Done
              </Button>
            </div>
          </div>
        )}
        
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center px-4">
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
              <p className="font-semibold text-lg">{selectedTechnique?.name}</p>
              {selectedTechnique?.original_author_name && (
                <p className="text-sm text-primary">by {selectedTechnique.original_author_name}</p>
              )}
            </Card>

            <Button onClick={handleReset} size="lg" className="w-full">
              Done
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Full-screen Timer Display
  if (timerState === 'running' || timerState === 'paused') {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          {showWakeLockWarning && (
            <Alert className="bg-accent/50 border-accent">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                For best results, please keep your screen awake during your meditation.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{selectedTechnique?.name}</p>
            {selectedTechnique?.original_author_name && (
              <p className="text-xs text-primary">by {selectedTechnique.original_author_name}</p>
            )}
          </div>

          <div className="relative">
            <svg className="w-64 h-64 mx-auto -rotate-90">
              <circle 
                cx="128" cy="128" r="120" 
                stroke="hsl(var(--muted))" 
                strokeWidth="8" 
                fill="none" 
              />
              <circle 
                cx="128" cy="128" r="120" 
                stroke="hsl(var(--primary))" 
                strokeWidth="8" 
                fill="none" 
                strokeDasharray={`${2 * Math.PI * 120}`} 
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`} 
                className="transition-all duration-1000 ease-linear" 
                strokeLinecap="round" 
              />
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-7xl font-bold tabular-nums">
                {formatTime(secondsLeft)}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {timerState === 'running' ? (
              <>
                <Button onClick={handlePause} variant="outline" size="lg" className="flex-1">
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
                <Button onClick={handleStop} variant="destructive" size="lg" className="flex-1">
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleResume} size="lg" className="flex-1">
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
                <Button onClick={handleStop} variant="destructive" size="lg" className="flex-1">
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup Screen
  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Timer</h1>
          <p className="text-sm text-muted-foreground">Start your meditation</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Technique Selection */}
        <Card className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Select Technique
          </h2>
          <Select value={selectedTechniqueId} onValueChange={setSelectedTechniqueId}>
            <SelectTrigger className="min-h-[48px]">
              <SelectValue placeholder="Choose a technique" />
            </SelectTrigger>
            <SelectContent>
              {techniques.map(technique => (
                <SelectItem key={technique.id} value={technique.id}>
                  <div>
                    <span>{technique.name}</span>
                    {technique.original_author_name && (
                      <span className="text-xs text-muted-foreground ml-2">
                        by {technique.original_author_name}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTechnique && (
            <div className="mt-4">
              <Button
                variant="ghost"
                className="w-full text-left h-auto py-3"
                onClick={() => setInstructionsModalOpen(true)}
              >
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {selectedTechnique.instructions}
                </p>
              </Button>
            </div>
          )}
        </Card>

        {/* Duration Selection */}
        <Card className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Duration: {duration} minutes
          </h2>
          
          <div className="flex gap-2 mb-6">
            {presetDurations.map(preset => (
              <Button 
                key={preset}
                variant={duration === preset ? "default" : "outline"}
                className="flex-1 min-h-[44px]"
                onClick={() => setDuration(preset)}
              >
                {preset}m
              </Button>
            ))}
          </div>

          <Slider
            value={[duration]}
            onValueChange={([val]) => setDuration(val)}
            min={1}
            max={120}
            step={1}
            className="w-full"
          />
        </Card>

        {/* Sound Selection */}
        <Card className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Completion Sound
          </h2>
          <Select 
            value={selectedSound} 
            onValueChange={(val) => {
              setSelectedSound(val as TimerSound);
              localStorage.setItem('selectedSound', val);
            }}
          >
            <SelectTrigger className="min-h-[48px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SOUND_LABELS) as TimerSound[]).map(sound => (
                <SelectItem key={sound} value={sound}>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    {SOUND_LABELS[sound]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Start Button */}
        <Button 
          onClick={handleStart} 
          size="lg" 
          className="w-full min-h-[56px] text-lg"
          disabled={!selectedTechniqueId}
        >
          <Play className="w-5 h-5 mr-2" />
          Start Meditation
        </Button>
      </div>

      {/* Instructions Modal */}
      <Dialog open={instructionsModalOpen} onOpenChange={setInstructionsModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTechnique?.name}</DialogTitle>
            {selectedTechnique?.original_author_name && (
              <DialogDescription>by {selectedTechnique.original_author_name}</DialogDescription>
            )}
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{selectedTechnique?.instructions}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
