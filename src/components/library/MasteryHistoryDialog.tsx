import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface MasteryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  techniqueId: string;
  techniqueName: string;
  currentMastery: number;
}

interface HistoryPoint {
  recorded_at: string;
  mastery_score: number;
  cumulative_effective_minutes: number;
}

export function MasteryHistoryDialog({ 
  open, 
  onOpenChange, 
  techniqueId, 
  techniqueName,
  currentMastery 
}: MasteryHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && techniqueId) {
      fetchHistory();
    }
  }, [open, techniqueId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mastery_history')
        .select('recorded_at, mastery_score, cumulative_effective_minutes')
        .eq('technique_id', techniqueId)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching mastery history:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = history.map((point) => ({
    date: format(new Date(point.recorded_at), 'MMM d'),
    mastery: Number(point.mastery_score.toFixed(2)),
    minutes: Math.round(point.cumulative_effective_minutes),
  }));

  // Calculate stats
  const totalMinutes = history.length > 0 
    ? history[history.length - 1].cumulative_effective_minutes 
    : 0;
  const hoursFormatted = (totalMinutes / 60).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mastery Progress: {techniqueName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{currentMastery.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Current Mastery</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{hoursFormatted}h</p>
              <p className="text-xs text-muted-foreground">Effective Hours</p>
            </div>
          </div>

          {/* Chart */}
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">No history data yet</p>
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'mastery' ? `${value}%` : `${value} mins`,
                      name === 'mastery' ? 'Mastery' : 'Effective Minutes'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mastery" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Formula explanation */}
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p><strong>Mastery Formula:</strong> 100 / (1 + e^(-(E - 50000) / 9000))</p>
            <p><strong>Duration Multiplier:</strong> 1.0x (≤30min) → 1.8x (59min) → continues growing</p>
            <p><strong>Streak Bonus:</strong> 1.05x per consecutive day (stacks multiplicatively)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
