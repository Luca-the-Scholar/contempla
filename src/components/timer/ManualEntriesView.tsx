import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>('');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
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
      fetchSessions();
    }
  }, [open]);

  const handleDelete = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session deleted');
      fetchSessions();
      onEntriesChanged();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const hasExplicitTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.getHours() !== 0 || date.getMinutes() !== 0;
    } catch {
      return false;
    }
  };

  const startEdit = (session: Session) => {
    setEditingId(session.id);
    setEditMinutes(session.duration_minutes.toString());
    const sessionDate = new Date(session.session_date);
    setEditDate(sessionDate);
    if (hasExplicitTime(session.session_date)) {
      setEditTime(format(sessionDate, 'HH:mm'));
    } else {
      setEditTime('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMinutes('');
    setEditDate(undefined);
    setEditTime('');
  };

  const saveEdit = async (session: Session) => {
    const newMinutes = parseInt(editMinutes, 10);
    if (isNaN(newMinutes) || newMinutes <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    if (!editDate) {
      toast.error('Please select a date');
      return;
    }

    // Build the new session date
    const newSessionDate = new Date(editDate);
    if (editTime) {
      const [hours, minutes] = editTime.split(':').map(Number);
      newSessionDate.setHours(hours, minutes, 0, 0);
    } else {
      newSessionDate.setHours(0, 0, 0, 0);
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          duration_minutes: newMinutes,
          session_date: newSessionDate.toISOString(),
        })
        .eq('id', session.id);

      if (error) throw error;

      toast.success('Session updated');
      setEditingId(null);
      setEditMinutes('');
      setEditDate(undefined);
      setEditTime('');
      fetchSessions();
      onEntriesChanged();
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          View Past Sessions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Past Sessions
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No sessions yet
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
                    
                    {editingId === session.id ? (
                      <div className="space-y-2 mt-2">
                        {/* Date picker */}
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-7 text-xs justify-start",
                                  !editDate && "text-muted-foreground"
                                )}
                              >
                                {editDate ? format(editDate, "PPP") : "Pick date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editDate}
                                onSelect={setEditDate}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* Time input */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <Input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="h-7 w-28 text-xs"
                            placeholder="Optional"
                          />
                          <span className="text-xs text-muted-foreground">(optional)</span>
                        </div>
                        
                        {/* Duration input */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <Input
                            type="number"
                            value={editMinutes}
                            onChange={(e) => setEditMinutes(e.target.value)}
                            className="w-20 h-7 text-xs"
                            min="1"
                          />
                          <span className="text-xs text-muted-foreground">minutes</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.session_date), 'PPP')}
                          {hasExplicitTime(session.session_date) && (
                            <span> at {format(new Date(session.session_date), 'h:mm a')}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{session.duration_minutes} min</span>
                          {session.manual_entry && (
                            <span className="text-xs text-muted-foreground/70">
                              (manual)
                            </span>
                          )}
                        </div>
                      </>
                    )}
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
                                This will permanently remove this session from your history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(session.id);
                                }}
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