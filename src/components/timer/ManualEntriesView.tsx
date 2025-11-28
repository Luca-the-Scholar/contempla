import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Session {
  id: string;
  technique_id: string;
  duration_minutes: number;
  effective_minutes: number | null;
  session_date: string;
  manual_entry: boolean;
  technique_name?: string;
}

interface ManualEntriesViewProps {
  onEntriesChanged: () => void;
}

export function ManualEntriesView({ onEntriesChanged }: ManualEntriesViewProps) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState<string>('');

  const fetchManualSessions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('manual_entry', true)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch technique names
      const techniqueIds = [...new Set(sessionsData?.map(s => s.technique_id) || [])];
      const { data: techniquesData } = await supabase
        .from('techniques')
        .select('id, name')
        .in('id', techniqueIds);

      const techniqueMap = new Map(techniquesData?.map(t => [t.id, t.name]) || []);

      const sessionsWithNames = sessionsData?.map(s => ({
        ...s,
        technique_name: techniqueMap.get(s.technique_id) || 'Unknown',
      })) || [];

      setSessions(sessionsWithNames);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchManualSessions();
    }
  }, [open]);

  const handleDelete = async (sessionId: string, techniqueId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      // Recalculate mastery for this technique
      await supabase.rpc('recalculate_technique_mastery', {
        p_user_id: user.id,
        p_technique_id: techniqueId,
      });

      toast.success('Session deleted');
      fetchManualSessions();
      onEntriesChanged();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const startEdit = (session: Session) => {
    setEditingId(session.id);
    setEditMinutes(session.duration_minutes.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMinutes('');
  };

  const saveEdit = async (session: Session) => {
    const newMinutes = parseInt(editMinutes, 10);
    if (isNaN(newMinutes) || newMinutes <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate new effective minutes
      const multiplier = calculateMultiplier(newMinutes);
      const effectiveMinutes = newMinutes * multiplier;

      const { error } = await supabase
        .from('sessions')
        .update({ 
          duration_minutes: newMinutes,
          effective_minutes: effectiveMinutes,
        })
        .eq('id', session.id);

      if (error) throw error;

      // Recalculate mastery
      await supabase.rpc('recalculate_technique_mastery', {
        p_user_id: user.id,
        p_technique_id: session.technique_id,
      });

      toast.success('Session updated');
      setEditingId(null);
      setEditMinutes('');
      fetchManualSessions();
      onEntriesChanged();
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  // New formula: multiplier = 1 + slope × (minutes - 30) where slope = (1.8 - 1.0) / 29
  const calculateMultiplier = (mins: number): number => {
    if (mins <= 30) return 1.0;
    const slope = (1.8 - 1.0) / 29;
    return 1.0 + slope * (mins - 30);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          View Manual Entries
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Manual Session Entries
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No manual entries yet
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{session.technique_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.session_date), 'PPP')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {editingId === session.id ? (
                        <Input
                          type="number"
                          value={editMinutes}
                          onChange={(e) => setEditMinutes(e.target.value)}
                          className="w-20 h-6 text-sm"
                          min="1"
                        />
                      ) : (
                        <span>{session.duration_minutes} min</span>
                      )}
                      {session.effective_minutes && (
                        <span className="text-xs">
                          ({Number(session.effective_minutes).toFixed(1)} effective)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {editingId === session.id ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => saveEdit(session)}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => startEdit(session)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove this session and recalculate your mastery score for this technique.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(session.id, session.technique_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}