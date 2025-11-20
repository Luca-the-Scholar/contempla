import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Technique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  lastPracticed?: string;
}

export function TimerView() {
  const { toast } = useToast();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>("");
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [minutes, setMinutes] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [manualEntry, setManualEntry] = useState("");

  useEffect(() => {
    fetchTechniques();
  }, []);

  useEffect(() => {
    if (selectedTechniqueId) {
      const technique = techniques.find((t) => t.id === selectedTechniqueId);
      setSelectedTechnique(technique || null);
    }
  }, [selectedTechniqueId, techniques]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          handleSessionComplete(minutes);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

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

  const handleStart = () => {
    if (!selectedTechniqueId) {
      toast({
        title: "Select a technique",
        description: "Please select a technique before starting the timer",
        variant: "destructive",
      });
      return;
    }
    if (!hasStarted) {
      setHasStarted(true);
      setSecondsLeft(minutes * 60);
    }
    setIsRunning(true);
  };

  const handleSessionComplete = async (actualMinutes: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !selectedTechniqueId) return;

      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        technique_id: selectedTechniqueId,
        duration_minutes: actualMinutes,
        manual_entry: false,
      });

      if (sessionError) throw sessionError;

      const { error: masteryError } = await supabase.rpc(
        "update_mastery_after_session",
        {
          p_user_id: user.id,
          p_technique_id: selectedTechniqueId,
          p_duration_minutes: actualMinutes,
        }
      );

      if (masteryError) throw masteryError;

      toast({
        title: "Session complete!",
        description: `${actualMinutes} minutes recorded.`,
      });

      setHasStarted(false);
      setSecondsLeft(0);
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

    if (!selectedTechniqueId) {
      toast({
        title: "Select a technique",
        description: "Please select a technique first",
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        technique_id: selectedTechniqueId,
        duration_minutes: enteredMinutes,
        manual_entry: true,
      });

      if (sessionError) throw sessionError;

      const { error: masteryError } = await supabase.rpc(
        "update_mastery_after_session",
        {
          p_user_id: user.id,
          p_technique_id: selectedTechniqueId,
          p_duration_minutes: enteredMinutes,
        }
      );

      if (masteryError) throw masteryError;

      toast({
        title: "Session logged!",
        description: `${enteredMinutes} minutes recorded.`,
      });

      setManualEntry("");
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
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const progress = hasStarted
    ? ((minutes * 60 - secondsLeft) / (minutes * 60)) * 100
    : 0;

  if (techniques.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Techniques Yet</h2>
          <p className="text-muted-foreground">
            Add a technique to start practicing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 px-4">
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-center">Practice Timer</h1>

          <Select value={selectedTechniqueId} onValueChange={setSelectedTechniqueId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a technique" />
            </SelectTrigger>
            <SelectContent>
              {techniques.map((technique) => (
                <SelectItem key={technique.id} value={technique.id}>
                  {technique.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTechnique && (
            <Card className="p-4 bg-accent/30">
              <h3 className="font-semibold mb-2">{selectedTechnique.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedTechnique.tradition}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {selectedTechnique.instructions}
              </p>
            </Card>
          )}
        </div>

        <Tabs defaultValue="timer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timer">Timer</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="timer" className="space-y-6">
            {!hasStarted && (
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value) || 20)}
                  className="text-center text-2xl font-bold"
                  min={1}
                  max={120}
                />
                <span className="text-muted-foreground">minutes</span>
              </div>
            )}

            {hasStarted && (
              <div className="relative">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold mb-2">
                    {formatTime(secondsLeft)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {progress.toFixed(0)}% complete
                  </div>
                </div>

                <svg className="w-full h-2">
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="hsl(var(--muted))"
                    rx="4"
                  />
                  <rect
                    x="0"
                    y="0"
                    width={`${progress}%`}
                    height="100%"
                    fill="hsl(var(--primary))"
                    rx="4"
                  />
                </svg>
              </div>
            )}

            <div className="flex gap-3">
              {!hasStarted ? (
                <Button onClick={handleStart} className="flex-1" size="lg">
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setIsRunning(!isRunning)}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() =>
                      handleSessionComplete(
                        Math.floor((minutes * 60 - secondsLeft) / 60)
                      )
                    }
                    variant="secondary"
                    size="lg"
                  >
                    <X className="w-5 h-5 mr-2" />
                    End
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <div className="space-y-4">
              <Input
                type="number"
                placeholder="Minutes practiced"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                className="text-center text-2xl font-bold"
                min={1}
              />
              <Button onClick={handleManualEntry} className="w-full" size="lg">
                <Clock className="w-5 h-5 mr-2" />
                Log Session
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
