import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UploadTechniqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadTechniqueDialog({ open, onOpenChange }: UploadTechniqueDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    source: "",
    description: "",
    instructionSteps: [""],
    suggestedDuration: "",
    legalConfirmation: false
  });

  const handleSubmit = async () => {
    // Filter out empty instruction steps
    const filledSteps = formData.instructionSteps.filter(s => s.trim());

    // Validate required fields
    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a technique title.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Description required",
        description: "Please provide a description of the technique.",
        variant: "destructive",
      });
      return;
    }

    if (filledSteps.length === 0) {
      toast({
        title: "Instructions required",
        description: "Please add at least one instruction step.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.legalConfirmation) {
      toast({
        title: "Legal confirmation required",
        description: "Please confirm you have the legal right to share this technique.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Format instructions as numbered list for storage
      const formattedInstructions = filledSteps
        .map((step, idx) => `${idx + 1}. ${step}`)
        .join("\n");

      const { error } = await supabase
        .from('global_techniques')
        .insert({
          name: formData.title.trim(),
          tradition: formData.source.trim() || "Personal Practice",
          instructions: formattedInstructions,
          origin_story: formData.description.trim(),
          lineage_info: formData.source.trim() || null,
          tags: formData.suggestedDuration ? [`${formData.suggestedDuration} min`] : [],
          submitted_by: user.id,
          approval_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Technique submitted!",
        description: "Your technique will be reviewed before appearing in the global library.",
      });

      // Reset form
      setFormData({
        title: "",
        source: "",
        description: "",
        instructionSteps: [""],
        suggestedDuration: "",
        legalConfirmation: false
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error submitting technique",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      instructionSteps: [...prev.instructionSteps, ""]
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructionSteps: prev.instructionSteps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructionSteps: prev.instructionSteps.map((step, i) => i === index ? value : step)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Contribute a Technique</DialogTitle>
          <DialogDescription>
            Share a meditation technique with the community. Your submission will be reviewed before publication.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Technique Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Technique Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder='e.g., "Four-Part Breath" or "Mantra Anchoring"'
              />
              <p className="text-xs text-muted-foreground">
                A short, recognizable title for the practice.
              </p>
            </div>

            {/* Source / Lineage */}
            <div className="space-y-2">
              <Label htmlFor="source">Influence / Lineage / Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="e.g., Thich Nhat Hanh, Zen Buddhism, The Relaxation Response"
              />
              <p className="text-xs text-muted-foreground">
                Name a teacher, tradition, or text this technique draws from, if applicable.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when this practice is useful, what it feels like, or how it has helped you..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                A paragraph contextualizing the technique.
              </p>
            </div>

            {/* Instructions (List Format) */}
            <div className="space-y-2">
              <Label>Instructions (Step by Step) *</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Add each step separately. They will be displayed as a numbered list.
              </p>
              
              <div className="space-y-2">
                {formData.instructionSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex items-center gap-1 pt-2.5 text-muted-foreground">
                      <GripVertical className="h-4 w-4 opacity-50" />
                      <span className="text-sm font-medium w-5">{idx + 1}.</span>
                    </div>
                    <Textarea
                      value={step}
                      onChange={(e) => updateStep(idx, e.target.value)}
                      placeholder={idx === 0 ? "e.g., Sit in a quiet place with eyes open or closed." : "Next step..."}
                      rows={2}
                      className="flex-1"
                    />
                    {formData.instructionSteps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(idx)}
                        className="mt-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={addStep}
                className="mt-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Step
              </Button>
            </div>

            {/* Suggested Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Suggested Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="180"
                value={formData.suggestedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, suggestedDuration: e.target.value }))}
                placeholder="e.g., 10, 20, or 45"
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Typical recommended length for this practice session.
              </p>
            </div>

            {/* Legal Confirmation */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="legal"
                  checked={formData.legalConfirmation}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, legalConfirmation: checked === true }))
                  }
                  className="mt-1"
                />
                <Label htmlFor="legal" className="text-sm font-normal leading-relaxed cursor-pointer">
                  I confirm that I have the legal right to share and publish these materials as instructions in this app. *
                </Label>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !formData.legalConfirmation} 
            className="flex-1"
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
