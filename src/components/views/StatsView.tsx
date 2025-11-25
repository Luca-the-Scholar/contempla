import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Flame, Activity, Heart, Moon, TrendingUp, Footprints, Brain, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TechniqueData {
  id: string;
  name: string;
  tradition: string;
  mastery: number;
  totalMinutes: number;
  streak: number;
  sessions: Session[];
}

interface Session {
  id: string;
  duration_minutes: number;
  session_date: string;
  manual_entry: boolean;
}

export function StatsView() {
  const [techniquesData, setTechniquesData] = useState<TechniqueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTechniques, setOpenTechniques] = useState<Set<string>>(new Set());
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [healthData, setHealthData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    checkPermissionStatus();
  }, []);

  const fetchData = async () => {
    try {
      const { data: techniques, error: techError } = await supabase
        .from("techniques")
        .select("*");

      if (techError) throw techError;

      const { data: mastery, error: masteryError } = await supabase
        .from("mastery_scores")
        .select("*");

      if (masteryError) throw masteryError;

      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .order("session_date", { ascending: false });

      if (sessionsError) throw sessionsError;

      const data: TechniqueData[] = (techniques || []).map((technique) => {
        const masteryScore = mastery?.find((m) => m.technique_id === technique.id);
        const techniqueSessions = sessions?.filter(
          (s) => s.technique_id === technique.id
        ) || [];
        const totalMinutes = techniqueSessions.reduce(
          (sum, s) => sum + s.duration_minutes,
          0
        );

        return {
          id: technique.id,
          name: technique.name,
          tradition: technique.tradition,
          mastery: masteryScore?.mastery_score || 0,
          totalMinutes,
          streak: masteryScore?.streak || 0,
          sessions: techniqueSessions as Session[],
        };
      });

      // Sort by most practiced (total minutes)
      data.sort((a, b) => b.totalMinutes - a.totalMinutes);

      setTechniquesData(data);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Health integration functions
  const checkPermissionStatus = async () => {
    const granted = localStorage.getItem('mock_health_permission') === 'true';
    setPermissionGranted(granted);
    
    if (granted) {
      await loadHealthData();
    }
  };

  const generateMockHealthData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const meditationMinutes = Math.floor(Math.random() * 60) + (i < 15 ? 20 : 0);
      const stressLevel = Math.max(1, 5 - Math.floor(meditationMinutes / 15));
      const moodScore = Math.min(5, Math.floor(meditationMinutes / 12) + 2);
      
      data.push({
        date: date.toISOString().split('T')[0],
        meditation_minutes: meditationMinutes,
        heart_rate_avg: 68 + Math.floor(Math.random() * 12),
        heart_rate_resting: 58 + Math.floor(Math.random() * 8),
        sleep_hours: 6.5 + Math.random() * 2,
        steps: 4000 + Math.floor(Math.random() * 6000),
        energy_level: Math.min(5, Math.floor(meditationMinutes / 15) + 2),
        stress_level: stressLevel,
        mood_score: moodScore
      });
    }
    
    return data;
  };

  const loadHealthData = async () => {
    try {
      const { data: existingData } = await supabase
        .from('mock_health_metrics')
        .select('*')
        .order('metric_date', { ascending: true })
        .limit(30);

      if (existingData && existingData.length > 0) {
        const formattedData = existingData.map(d => ({
          date: d.metric_date,
          meditation_minutes: d.mindful_minutes || 0,
          heart_rate_avg: d.heart_rate_avg || 70,
          heart_rate_resting: d.heart_rate_resting || 60,
          sleep_hours: d.sleep_hours || 7,
          steps: d.steps || 5000,
          energy_level: d.energy_level || 3,
          stress_level: d.stress_level || 3,
          mood_score: d.mood_score || 3
        }));
        setHealthData(formattedData);
      } else {
        const mockData = generateMockHealthData();
        setHealthData(mockData);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const dbRecords = mockData.map(d => ({
            user_id: user.id,
            metric_date: d.date,
            heart_rate_avg: d.heart_rate_avg,
            heart_rate_resting: d.heart_rate_resting,
            sleep_hours: d.sleep_hours,
            steps: d.steps,
            mindful_minutes: d.meditation_minutes,
            energy_level: d.energy_level,
            stress_level: d.stress_level,
            mood_score: d.mood_score
          }));
          
          await supabase.from('mock_health_metrics').insert(dbRecords);
        }
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const handleGrantPermission = async () => {
    localStorage.setItem('mock_health_permission', 'true');
    setPermissionGranted(true);
    setShowPermissionDialog(false);
    
    toast({
      title: "Health Access Granted",
      description: "Mock health data integration is now active.",
    });
    
    await loadHealthData();
  };

  const calculateCorrelation = () => {
    if (healthData.length < 7) return null;
    
    const recentData = healthData.slice(-14);
    const avgMeditation = recentData.reduce((sum, d) => sum + d.meditation_minutes, 0) / recentData.length;
    const avgStress = recentData.reduce((sum, d) => sum + d.stress_level, 0) / recentData.length;
    const avgMood = recentData.reduce((sum, d) => sum + d.mood_score, 0) / recentData.length;
    
    return {
      avgMeditation: Math.round(avgMeditation),
      avgStress: avgStress.toFixed(1),
      avgMood: avgMood.toFixed(1),
      insight: avgMeditation > 20 
        ? "Your meditation practice appears to correlate with improved mood and reduced stress levels."
        : "Consider increasing meditation frequency to potentially improve wellness metrics."
    };
  };

  const correlation = calculateCorrelation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading stats...</p>
      </div>
    );
  }

  if (techniquesData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Data Yet</h2>
          <p className="text-muted-foreground">
            Start practicing to see your progress metrics.
          </p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalMinutes = techniquesData.reduce((sum, t) => sum + t.totalMinutes, 0);
  const totalSessions = techniquesData.reduce((sum, t) => sum + t.sessions.length, 0);
  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Stats</h1>
          <p className="text-sm text-muted-foreground">
            Track your progress and health insights
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <Tabs defaultValue="practice" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="practice">Practice Stats</TabsTrigger>
            <TabsTrigger value="health">Health Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="practice" className="space-y-4">
            {/* Summary Stats */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
              <h2 className="text-lg font-semibold mb-4">Overall Progress</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {totalHours}h {remainingMinutes}m
                  </div>
                  <div className="text-sm text-muted-foreground">Total Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalSessions}</div>
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <div className="text-2xl font-bold text-primary">{avgSessionMinutes}m</div>
                  <div className="text-sm text-muted-foreground">Avg Session</div>
                </div>
              </div>
            </Card>

            {/* Per-Technique Stats */}
            <div>
              <h2 className="text-base font-semibold mb-2 px-1">By Technique</h2>
              <div className="space-y-3">
                {techniquesData.map((technique) => (
                  <Collapsible 
                    key={technique.id}
                    open={openTechniques.has(technique.id)}
                    onOpenChange={(isOpen) => {
                      setOpenTechniques(prev => {
                        const next = new Set(prev);
                        if (isOpen) {
                          next.add(technique.id);
                        } else {
                          next.delete(technique.id);
                        }
                        return next;
                      });
                    }}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full p-4 hover:bg-accent/50 transition-colors min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="text-left">
                              <h3 className="font-semibold">{technique.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {technique.tradition}
                              </p>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${openTechniques.has(technique.id) ? 'rotate-180' : ''}`} />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Mastery</span>
                              <span className="font-semibold">
                                {technique.mastery.toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={technique.mastery} className="h-2" />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-accent/30 rounded-lg">
                              <div className="text-2xl font-bold text-primary">
                                {formatTime(technique.totalMinutes)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Total Time
                              </div>
                            </div>
                            <div className="text-center p-3 bg-accent/30 rounded-lg">
                              <div className="flex items-center justify-center gap-1">
                                <Flame className="w-5 h-5 text-orange-500" />
                                <span className="text-2xl font-bold text-primary">
                                  {technique.streak}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Day Streak
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-border p-4 space-y-2">
                          <h4 className="font-semibold text-sm mb-3">
                            Session History ({technique.sessions.length})
                          </h4>
                          {technique.sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No sessions recorded yet
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {technique.sessions.map((session) => (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between p-2 bg-accent/30 rounded"
                                >
                                  <div>
                                    <div className="text-sm font-medium">
                                      {formatTime(session.duration_minutes)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatDate(session.session_date)}
                                    </div>
                                  </div>
                                  {session.manual_entry && (
                                    <span className="text-sm text-muted-foreground italic">
                                      Manual
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            {!permissionGranted ? (
              <Card className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Activity className="h-12 w-12 text-primary" />
                  </div>
                </div>
                
                <h2 className="text-xl font-semibold">Connect Health Data</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Track correlations between your meditation practice and health metrics like sleep, heart rate, and mood.
                </p>
                
                <Badge variant="outline" className="mt-2 text-sm">
                  <Info className="h-3 w-3 mr-1" />
                  Demo Mode - Uses simulated data only
                </Badge>

                <div className="pt-4">
                  <Button onClick={() => setShowPermissionDialog(true)} size="lg">
                    Enable Health Tracking
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {correlation && (
                  <Card className="p-6 bg-primary/5 border-primary/20">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Correlation Insight</h3>
                        <p className="text-sm text-muted-foreground mb-3">{correlation.insight}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Avg Meditation</div>
                            <div className="font-medium">{correlation.avgMeditation} min/day</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Avg Stress</div>
                            <div className="font-medium">{correlation.avgStress}/5</div>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <div className="text-muted-foreground">Avg Mood</div>
                            <div className="font-medium">{correlation.avgMood}/5</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Meditation & Stress Levels</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-sm"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="meditation_minutes" stroke="#2F6FAF" name="Meditation (min)" strokeWidth={2} />
                      <Line type="monotone" dataKey="stress_level" stroke="#E78A3A" name="Stress Level" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Mood & Sleep Quality</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-sm"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="mood_score" stroke="#2F6FAF" name="Mood Score" strokeWidth={2} />
                      <Line type="monotone" dataKey="sleep_hours" stroke="#8B5CF6" name="Sleep (hrs)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Avg Heart Rate</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(healthData.reduce((sum, d) => sum + d.heart_rate_avg, 0) / healthData.length)} bpm
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Avg Sleep</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {(healthData.reduce((sum, d) => sum + d.sleep_hours, 0) / healthData.length).toFixed(1)} hrs
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Footprints className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Avg Steps</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(healthData.reduce((sum, d) => sum + d.steps, 0) / healthData.length).toLocaleString()}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">Avg Energy</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {(healthData.reduce((sum, d) => sum + d.energy_level, 0) / healthData.length).toFixed(1)}/5
                    </div>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Health Data Access</DialogTitle>
            <DialogDescription>
              This is a demonstration of the Health integration UX. No real health data will be accessed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm">
              Contempla would like to access:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Heart Rate Data
              </li>
              <li className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-blue-500" />
                Sleep Analysis
              </li>
              <li className="flex items-center gap-2">
                <Footprints className="h-4 w-4 text-green-500" />
                Activity & Steps
              </li>
              <li className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                Mindfulness Minutes
              </li>
            </ul>
            
            <p className="text-sm text-muted-foreground pt-2">
              In a production app, this would request actual Apple Health permissions. 
              This demo uses generated data to show the UX flow.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleGrantPermission} className="flex-1">
              Allow Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
