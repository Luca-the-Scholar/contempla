import { useState } from "react";
import { z } from "zod";
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
import { trackEvent } from "@/hooks/use-analytics";

// Validation schema with length limits - Beta v1 spec
const techniqueSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().min(50, "Description must be at least 50 characters").max(2000, "Description must be 2000 characters or less"),
  instructionSteps: z.array(z.string().max(500, "Each step must be 500 characters or less")).min(1, "At least one instruction step is required").max(30, "Maximum 30 instruction steps allowed"),
  tipSteps: z.array(z.string().max(500, "Each tip must be 500 characters or less")).max(10, "Maximum 10 tips allowed").optional(),
  tradition: z.string().max(500, "Tradition/Context must be 500 characters or less").optional(),
  source: z.string().max(300, "Relevant text must be 300 characters or less").optional(),
  suggestedDuration: z.string().optional(),
  personalContext: z.string().max(1500, "Personal context must be 1500 characters or less").optional(),
  legalConfirmation: z.literal(true, { errorMap: () => ({ message: "You must confirm legal rights" }) })
});

interface UploadTechniqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadTechniqueDialog({ open, onOpenChange }: UploadTechniqueDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructionSteps: [""],
    tipSteps: [] as string[],
    tradition: "",
    source: "",
    suggestedDuration: "",
    personalContext: "",
    legalConfirmation: false
  });

  const handleSubmit = async () => {
    // Filter out empty instruction steps and tips
    const filledSteps = formData.instructionSteps.filter(s => s.trim());
    const filledTips = formData.tipSteps.filter(t => t.trim());

    // Validate with zod schema
    const validationData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      instructionSteps: filledSteps,
      tipSteps: filledTips.length > 0 ? filledTips : undefined,
      tradition: formData.tradition.trim() || undefined,
      source: formData.source.trim() || undefined,
      suggestedDuration: formData.suggestedDuration || undefined,
      personalContext: formData.personalContext.trim() || undefined,
      legalConfirmation: formData.legalConfirmation as true
    };

    const result = techniqueSchema.safeParse(validationData);
    
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "Validation error",
        description: firstError.message,
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

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Format instructions as numbered list for storage
      const formattedInstructions = filledSteps
        .map((step, idx) => `${idx + 1}. ${step}`)
        .join("\n");

      // Format tips as bullet points for storage
      const formattedTips = filledTips.length > 0
        ? filledTips.map(tip => `• ${tip}`).join("\n")
        : null;

      const { error } = await supabase
        .from('global_techniques')
        .insert({
          name: formData.title.trim(),
          tradition: formData.tradition.trim() || "Personal Practice",
          instructions: formattedInstructions,
          tips: formattedTips,
          origin_story: formData.description.trim(),
          lineage_info: formData.source.trim() || null,
          tags: formData.suggestedDuration ? [`${formData.suggestedDuration} min`] : [],
          worldview_context: formData.personalContext.trim() || null,
          submitted_by: user.id,
          approval_status: 'pending'
        });

      if (error) throw error;

      // Track technique submitted
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();
      
      trackEvent('technique_submitted', {
        submitter_name: profile?.name || 'Unknown',
        technique_name: formData.title.trim(),
        description: formData.description.trim(),
        instructions: formattedInstructions,
        approx_duration_minutes: formData.suggestedDuration ? parseInt(formData.suggestedDuration) : undefined,
        legal_permission_confirmed: formData.legalConfirmation,
        source_or_influence_name: formData.source.trim() || undefined,
        personal_context_provided: formData.personalContext.trim().length > 0
      });

      toast({
        title: "Technique submitted!",
        description: "Your technique will be reviewed before appearing in the global library.",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        instructionSteps: [""],
        tipSteps: [],
        tradition: "",
        source: "",
        suggestedDuration: "",
        personalContext: "",
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
    if (formData.instructionSteps.length < 30) {
      setFormData(prev => ({
        ...prev,
        instructionSteps: [...prev.instructionSteps, ""]
      }));
    }
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

  const addTip = () => {
    if (formData.tipSteps.length < 10) {
      setFormData(prev => ({
        ...prev,
        tipSteps: [...prev.tipSteps, ""]
      }));
    }
  };

  const removeTip = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tipSteps: prev.tipSteps.filter((_, i) => i !== index)
    }));
  };

  const updateTip = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      tipSteps: prev.tipSteps.map((tip, i) => i === index ? value : tip)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Contribute a Technique</DialogTitle>
          <DialogDescription>
            Share a meditation technique with the community. Your display name will be associated with your submission, which will be reviewed before publication.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* REQUIRED FIELDS */}

            {/* Technique Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Technique Title *</Label>
              <div className="relative">
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder='e.g., "Four-Part Breath" or "Mantra Anchoring"'
                  maxLength={100}
                  className="pr-16"
                />
                <span className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                  {formData.title.length}/100
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                A short, recognizable title for the practice.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <div className="relative">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide a brief overview of the meditation technique"
                  rows={4}
                  maxLength={2000}
                  className="pr-16"
                />
                <span className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                  {formData.description.length}/2000
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                What is the fundamental purpose or approach of this practice?
              </p>
            </div>

            {/* Instructions (List Format) */}
            <div className="space-y-2">
              <Label>Instructions (Step by Step) *</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Add each step separately (maximum 30 steps). They will be displayed as a numbered list.
              </p>

              <div className="space-y-2">
                {formData.instructionSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex items-center gap-1 pt-2.5 text-muted-foreground">
                      <GripVertical className="h-4 w-4 opacity-50" />
                      <span className="text-sm font-medium w-5">{idx + 1}.</span>
                    </div>
                    <div className="relative flex-1">
                      <Textarea
                        value={step}
                        onChange={(e) => updateStep(idx, e.target.value)}
                        placeholder={idx === 0 ? "e.g., Sit in a quiet place with eyes open or closed." : "Next step..."}
                        rows={2}
                        maxLength={500}
                        className="pr-16"
                      />
                      <span className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                        {step.length}/500
                      </span>
                    </div>
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
                disabled={formData.instructionSteps.length >= 30}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Step {formData.instructionSteps.length >= 30 && "(Max 30)"}
              </Button>
            </div>

            {/* Tips for Practice (Optional) */}
            <div className="space-y-2">
              <Label>💡 Tips for Practice (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Add helpful tips or advice for practitioners (maximum 10 tips). These will be displayed as bullet points.
              </p>

              {formData.tipSteps.length > 0 && (
                <div className="space-y-2">
                  {formData.tipSteps.map((tip, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex items-center gap-1 pt-2.5 text-muted-foreground">
                        <span className="text-sm font-medium">•</span>
                      </div>
                      <div className="relative flex-1">
                        <Textarea
                          value={tip}
                          onChange={(e) => updateTip(idx, e.target.value)}
                          placeholder="Tip for practice..."
                          rows={2}
                          maxLength={500}
                          className="pr-16"
                        />
                        <span className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                          {tip.length}/500
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTip(idx)}
                        className="mt-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={addTip}
                className="mt-2"
                disabled={formData.tipSteps.length >= 10}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Tip {formData.tipSteps.length >= 10 && "(Max 10)"}
              </Button>
            </div>

            {/* OPTIONAL FIELDS */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground mb-4">Optional Fields</p>

              {/* Tradition/Context */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="tradition">Tradition/Context</Label>
                <div className="relative">
                  <Textarea
                    id="tradition"
                    value={formData.tradition}
                    onChange={(e) => setFormData(prev => ({ ...prev, tradition: e.target.value }))}
                    placeholder="In your own words, describe the tradition, lineage, or context of this technique"
                    rows={3}
                    maxLength={500}
                    className="pr-16"
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                    {formData.tradition.length}/500
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This could include a religious tradition, cultural context, or how you learned about this practice
                </p>
              </div>

              {/* Relevant Text */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="source">Relevant Text/Source</Label>
                <div className="relative">
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    placeholder='e.g., "The Miracle of Mindfulness" by Thich Nhat Hanh'
                    maxLength={300}
                    className="pr-16"
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                    {formData.source.length}/300
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Name and author of a book or text relevant for understanding this technique
                </p>
              </div>

              {/* Suggested Duration */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="duration">Suggested Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="180"
                  value={formData.suggestedDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, suggestedDuration: e.target.value }))}
                  placeholder="Typical length of practice"
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Typical recommended length for this practice session
                </p>
              </div>

              {/* Personal Context */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="personalContext">Personal Context</Label>
                <div className="relative">
                  <Textarea
                    id="personalContext"
                    value={formData.personalContext}
                    onChange={(e) => setFormData(prev => ({ ...prev, personalContext: e.target.value }))}
                    placeholder="How did you discover this technique? What does it mean to you?"
                    rows={4}
                    maxLength={1500}
                    className="pr-16"
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                    {formData.personalContext.length}/1500
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This information helps our research team understand meditation practices. Your response may be used for anonymized research purposes.
                </p>
              </div>
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
                  I confirm I have the right to share this technique and understand it will be published in the Global Library *
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
