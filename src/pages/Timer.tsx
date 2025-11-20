import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Play, Pause, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Timer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const techniqueId = searchParams.get("technique");
  const { toast } = useToast();

  const [technique, setTechnique] = useState<any>(null);
  const [minutes, setMinutes] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [manualEntry, setManualEntry] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    if (techniqueId) {
      fetchTechnique();
    }
  }, [techniqueId]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          handleSessionComplete(Math.floor((minutes * 60 - prev) / 60));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const fetchTechnique = async () => {
    try {
      const { data, error } = await supabase
        .from("techniques")
        .select("*")
        .eq("id", techniqueId)
        .single();

      if (error) throw error;
      setTechnique(data);
    } catch (error: any) {
      toast({
        title: "Error loading technique",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStart = () => {
    if (!hasStarted) {
      setHasStarted(true);
      setSecondsLeft(minutes * 60);
    }
    setIsRunning(true);
  };

  const handleSessionComplete = async (actualMinutes: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !techniqueId) return;

      // Record session
      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        technique_id: techniqueId,
        duration_minutes: actualMinutes,
        manual_entry: false,
      });

      if (sessionError) throw sessionError;

      // Update mastery using database function
      const { error: masteryError } = await supabase.rpc(
        "update_mastery_after_session",
        {
          p_user_id: user.id,
          p_technique_id: techniqueId,
          p_duration_minutes: actualMinutes,
        }
      );

      if (masteryError) throw masteryError;

      toast({
        title: "Session complete!",
        description: `${actualMinutes} minutes of practice recorded.`,
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error saving session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManualEntry = async () => {
    const enteredMinutes = parseInt(manualEntry);
    if (isNaN(enteredMinutes) || enteredMinutes <= 0) {
      toast({
        title: "Invalid entry",
        description: "Please enter a valid number of minutes",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !techniqueId) return;

      // Record manual session
      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        technique_id: techniqueId,
        duration_minutes: enteredMinutes,
        manual_entry: true,
      });

      if (sessionError) throw sessionError;

      // Update mastery
      const { error: masteryError } = await supabase.rpc(
        "update_mastery_after_session",
        {
          p_user_id: user.id,
          p_technique_id: techniqueId,
          p_duration_minutes: enteredMinutes,
        }
      );

      if (masteryError) throw masteryError;

      toast({
        title: "Session logged!",
        description: `${enteredMinutes} minutes of practice recorded.`,
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error logging session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = hasStarted
    ? ((minutes * 60 - secondsLeft) / (minutes * 60)) * 100
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col p-4">
        <header className="py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{technique?.name || "Timer"}</h2>
            <p className="text-sm text-muted-foreground">
              {technique?.tradition}
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          {!hasStarted ? (
            <Card className="w-full max-w-sm p-8 space-y-6 backdrop-blur-sm bg-card/80">
              <div className="space-y-4">
                <label className="text-sm text-muted-foreground">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                  min={1}
                  className="text-center text-2xl h-16"
                />
              </div>
              <Button
                onClick={handleStart}
                className="w-full h-14 glow-button"
                disabled={minutes <= 0}
              >
                <Play className="w-6 h-6 mr-2" />
                Start Practice
              </Button>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="w-full"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Manual Time Entry
                </Button>
                {showManualEntry && (
                  <div className="mt-4 space-y-2">
                    <Input
                      type="number"
                      placeholder="Minutes practiced"
                      value={manualEntry}
                      onChange={(e) => setManualEntry(e.target.value)}
                    />
                    <Button
                      onClick={handleManualEntry}
                      className="w-full"
                      variant="secondary"
                    >
                      Log Session
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="text-center space-y-8">
              {/* Progress Ring */}
              <div className="relative">
                <svg width="280" height="280" className="transform -rotate-90">
                  <circle
                    cx="140"
                    cy="140"
                    r="120"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="120"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                    style={{
                      filter: "drop-shadow(0 0 8px hsl(var(--primary)))",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-bold">
                    {formatTime(secondsLeft)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-4 justify-center">
                {!isRunning ? (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    className="w-20 h-20 rounded-full glow-button"
                  >
                    <Play className="w-8 h-8" />
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setIsRunning(false)}
                      className="w-16 h-16 rounded-full"
                    >
                      <Pause className="w-6 h-6" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        handleSessionComplete(
                          Math.floor((minutes * 60 - secondsLeft) / 60)
                        )
                      }
                      className="px-6 h-16 rounded-full"
                    >
                      End Session
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}