import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Technique {
  id: string;
  name: string;
}

interface ManualEntryDialogProps {
  techniques: Technique[];
  onEntryAdded: () => void;
}

const LAST_TECHNIQUE_KEY = 'inroads-last-logged-technique';

export function ManualEntryDialog({ techniques, onEntryAdded }: ManualEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [techniqueId, setTechniqueId] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Load last used technique when dialog opens
  useEffect(() => {
    if (open && techniques.length > 0) {
      const lastTechnique = localStorage.getItem(LAST_TECHNIQUE_KEY);
      if (lastTechnique && techniques.some(t => t.id === lastTechnique)) {
        setTechniqueId(lastTechnique);
      }
    }
  }, [open, techniques]);

  const handleSubmit = async () => {
    if (!date || !techniqueId || !minutes) {
      toast.error('Please fill in all fields');
      return;
    }

    const durationMinutes = parseInt(minutes, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    if (date > new Date()) {
      toast.error('Cannot log sessions in the future');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Simple insert without RPC (no mastery calculation)
      const { error } = await supabase.from('sessions').insert({
        user_id: user.id,
        technique_id: techniqueId,
        duration_minutes: durationMinutes,
        session_date: format(date, 'yyyy-MM-dd'),
        manual_entry: true,
      });

      if (error) throw error;

      // Save last used technique for convenience
      localStorage.setItem(LAST_TECHNIQUE_KEY, techniqueId);
      
      toast.success('Session logged successfully');
      setOpen(false);
      setDate(undefined);
      setMinutes('');
      onEntryAdded();
    } catch (error) {
      console.error('Error adding manual entry:', error);
      toast.error('Failed to log session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Log Past Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Log Past Meditation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Technique Selector */}
          <div className="space-y-2">
            <Label>Technique</Label>
            <Select value={techniqueId} onValueChange={setTechniqueId}>
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
          </div>

          {/* Duration Input */}
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min="1"
              placeholder="Enter minutes"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !date || !techniqueId || !minutes}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Log Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
