import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Clock, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TimerSound, SOUND_LABELS } from "@/hooks/use-timer-sound";

interface Preset {
  id: string;
  name: string;
  duration_minutes: number;
  sound: string;
}

interface PresetManagerProps {
  techniqueId: string;
  techniqueName: string;
}

export function PresetManager({ techniqueId, techniqueName }: PresetManagerProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(20);
  const [sound, setSound] = useState<TimerSound>("singing-bowl");
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPresets();
  }, [techniqueId]);

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase
        .from("technique_presets")
        .select("*")
        .eq("technique_id", techniqueId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPresets(data || []);
    } catch (error: any) {
      console.error("Error fetching presets:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDuration(20);
    setSound("singing-bowl");
    setEditingPreset(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (preset: Preset) => {
    setEditingPreset(preset);
    setName(preset.name);
    setDuration(preset.duration_minutes);
    setSound(preset.sound as TimerSound);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Please enter a preset name", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingPreset) {
        const { error } = await supabase
          .from("technique_presets")
          .update({
            name: name.trim(),
            duration_minutes: duration,
            sound,
          })
          .eq("id", editingPreset.id);

        if (error) throw error;
        toast({ title: "Preset updated" });
      } else {
        const { error } = await supabase
          .from("technique_presets")
          .insert({
            user_id: user.id,
            technique_id: techniqueId,
            name: name.trim(),
            duration_minutes: duration,
            sound,
          });

        if (error) throw error;
        toast({ title: "Preset created" });
      }

      setDialogOpen(false);
      resetForm();
      fetchPresets();
    } catch (error: any) {
      toast({ title: "Error saving preset", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (presetId: string) => {
    try {
      const { error } = await supabase
        .from("technique_presets")
        .delete()
        .eq("id", presetId);

      if (error) throw error;
      toast({ title: "Preset deleted" });
      fetchPresets();
    } catch (error: any) {
      toast({ title: "Error deleting preset", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading presets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Timer Presets</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              Add Preset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPreset ? "Edit Preset" : "New Preset"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Preset Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Morning Session"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Duration: {duration} minutes</Label>
                <Slider
                  value={[duration]}
                  onValueChange={(vals) => setDuration(vals[0])}
                  min={1}
                  max={120}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Completion Sound</Label>
                <Select value={sound} onValueChange={(v) => setSound(v as TimerSound)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOUND_LABELS) as TimerSound[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SOUND_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editingPreset ? "Update Preset" : "Create Preset"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {presets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No presets yet. Create a preset to quickly configure your timer settings.
        </p>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <Card key={preset.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{preset.name}</div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {preset.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      {SOUND_LABELS[preset.sound as TimerSound] || preset.sound}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(preset)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Preset?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{preset.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(preset.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
