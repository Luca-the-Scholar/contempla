import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Square, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Technique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  lastPracticed?: string;
}

type TimerState = 'setup' | 'running' | 'paused' | 'complete';

export function TimerView() {
  const { toast } = useToast();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>("");
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [duration, setDuration] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('setup');
  const [initialDuration, setInitialDuration] = useState(0);
  const [masteryBefore, setMasteryBefore] = useState(0);
  const [masteryAfter, setMasteryAfter] = useState(0);

  const presetDurations = [5, 10, 20, 40];

  useEffect(() => {
    fetchTechniques();
  }, []);

  useEffect(() => {
    if (selectedTechniqueId) {
      const technique = techniques.find((t) => t.id === selectedTechniqueId);
      setSelectedTechnique(technique || null);
      fetchCurrentMastery();
    }
  }, [selectedTechniqueId, techniques]);

  useEffect(() => {
    if (timerState !== 'running') return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
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
        .select("*");

      if (techError) throw techError;

      const { data: masteryData } = await supabase
        .from("mastery_scores")
        .select("technique_id, last_practiced_at")
        .order("last_practiced_at", { ascending: false });

      const masteryMap = new Map(
        masteryData?.map((m) => [m.technique_id, m.last_practiced_at]) || []
      );

      const techniquesWithPractice = (techniquesData || [])
        .map((t) => ({
          ...t,
          lastPracticed: masteryMap.get(t.id),
        }))
        .sort((a, b) => {
          if (!a.lastPracticed && !b.lastPracticed) return 0;
          if (!a.lastPracticed) return 1;
          if (!b.lastPracticed) return -1;
          return (
            new Date(b.lastPracticed).getTime() -
            new Date(a.lastPracticed).getTime()
          );
        });

      setTechniques(techniquesWithPractice);
      if (techniquesWithPractice.length > 0 && !selectedTechniqueId) {
        setSelectedTechniqueId(techniquesWithPractice[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading techniques",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchCurrentMastery = async () => {
    if (!selectedTechniqueId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("mastery_scores")
        .select("mastery_score")
        .eq("user_id", user.id)
        .eq("technique_id", selectedTechniqueId)
        .maybeSingle();

      setMasteryBefore(data?.mastery_score || 0);
    } catch (error) {
      console.error("Error fetching mastery:", error);
    }
  };

  const handleStart = () => {
    if (!selectedTechniqueId) {
      toast({
        title: "Select a technique",
        description: "Please select a technique before starting",
        variant: "destructive",
      });
      return;
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
    await logSession(initialDuration, false);
  };

  const logSession = async (minutesPracticed: number, stoppedEarly: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedTechniqueId) return;

      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        technique_id: selectedTechniqueId,
        duration_minutes: minutesPracticed,
        manual_entry: false,
      });

      if (sessionError) throw sessionError;

      const { error: masteryError } = await supabase.rpc(
        "update_mastery_after_session",
        {
          p_user_id: user.id,
          p_technique_id: selectedTechniqueId,
          p_duration_minutes: minutesPracticed,
        }
      );

      if (masteryError) throw masteryError;

      // Fetch updated mastery
      const { data } = await supabase
        .from("mastery_scores")
        .select("mastery_score")
        .eq("user_id", user.id)
        .eq("technique_id", selectedTechniqueId)
        .single();

      setMasteryAfter(data?.mastery_score || 0);
      setTimerState('complete');
    } catch (error: any) {
      toast({
        title: "Error saving session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setTimerState('setup');
    setSecondsLeft(0);
    setMasteryBefore(0);
    setMasteryAfter(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = timerState === 'running' || timerState === 'paused'
    ? ((initialDuration * 60 - secondsLeft) / (initialDuration * 60)) * 100
    : 0;

  if (techniques.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24 px-4">
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
    const wasCompleted = secondsLeft === 0;
    const masteryGain = masteryAfter - masteryBefore;

    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          
          <div>
            <h2 className="text-3xl font-bold mb-2">
              {wasCompleted ? "Session Complete!" : "Session Ended"}
            </h2>
            <p className="text-muted-foreground">
              {wasCompleted 
                ? `You completed ${minutesPracticed} minutes of practice`
                : `You practiced for ${minutesPracticed} minutes`}
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Technique</p>
              <p className="font-semibold text-lg">{selectedTechnique?.name}</p>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Mastery Progress</span>
                <span className="text-primary font-semibold">+{masteryGain.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold">{masteryBefore.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Before</div>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-primary">{masteryAfter.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">After</div>
                </div>
              </div>
            </div>
          </Card>

          <Button onClick={handleReset} size="lg" className="w-full">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Full-screen Timer Display
  if (timerState === 'running' || timerState === 'paused') {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full space-y-12">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{selectedTechnique?.name}</p>
            <h2 className="text-lg font-semibold text-muted-foreground">
              {selectedTechnique?.tradition}
            </h2>
          </div>

          <div className="relative">
            {/* Animated circle */}
            <svg className="w-64 h-64 mx-auto -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                className="transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            </svg>
            
            {/* Timer display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-7xl font-bold mb-2 tabular-nums">
                  {formatTime(secondsLeft)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {progress.toFixed(0)}% complete
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {timerState === 'running' ? (
              <>
                <Button
                  onClick={handlePause}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={handleStop}
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleResume}
                  size="lg"
                  className="flex-1"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
                <Button
                  onClick={handleStop}
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                >
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
    <div className="min-h-screen bg-background pb-24 px-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-8">
        {/* Technique Selector */}
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Begin Practice</h1>
            <p className="text-muted-foreground">Choose a technique and duration</p>
          </div>

          <Card 
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => document.getElementById('technique-select')?.click()}
          >
            {selectedTechnique ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{selectedTechnique.name}</h3>
                  <span className="text-xs text-muted-foreground">Change</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedTechnique.tradition}
                </p>
                <p className="text-sm text-foreground/80 line-clamp-3">
                  {selectedTechnique.instructions}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Select a technique</p>
            )}
          </Card>

          <Select value={selectedTechniqueId} onValueChange={setSelectedTechniqueId}>
            <SelectTrigger id="technique-select" className="sr-only">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {techniques.map((technique) => (
                <SelectItem key={technique.id} value={technique.id}>
                  {technique.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duration Selection */}
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-4 text-center">Duration</h3>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {presetDurations.map((preset) => (
                <Button
                  key={preset}
                  variant={duration === preset ? "default" : "outline"}
                  onClick={() => setDuration(preset)}
                  className="h-16"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold">{preset}</div>
                    <div className="text-xs opacity-80">min</div>
                  </div>
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Custom Duration</span>
                <span className="text-lg font-semibold">{duration} min</span>
              </div>
              <Slider
                value={[duration]}
                onValueChange={(vals) => setDuration(vals[0])}
                min={1}
                max={120}
                step={1}
                className="py-4"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setDuration(Math.max(1, Math.min(120, val)));
                  }}
                  min={1}
                  max={120}
                  className="text-center"
                  placeholder="Enter minutes"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button onClick={handleStart} size="lg" className="w-full h-16 text-lg">
          <Play className="w-6 h-6 mr-2" />
          Start Session
        </Button>
      </div>
    </div>
  );
}