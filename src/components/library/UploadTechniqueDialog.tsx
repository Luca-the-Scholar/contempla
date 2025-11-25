import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UploadTechniqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadTechniqueDialog({ open, onOpenChange }: UploadTechniqueDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tradition: "",
    instructions: "",
    origin_story: "",
    worldview_context: "",
    lineage_info: "",
    home_region: "",
    relevant_texts: [""],
    external_links: [""],
    tags: [""]
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.tradition || !formData.instructions) {
      toast({
        title: "Missing required fields",
        description: "Please fill in name, tradition, and instructions.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('global_techniques')
        .insert({
          name: formData.name,
          tradition: formData.tradition,
          instructions: formData.instructions,
          origin_story: formData.origin_story || null,
          worldview_context: formData.worldview_context || null,
          lineage_info: formData.lineage_info || null,
          home_region: formData.home_region || null,
          relevant_texts: formData.relevant_texts.filter(t => t.trim()),
          external_links: formData.external_links.filter(l => l.trim()),
          tags: formData.tags.filter(t => t.trim()),
          submitted_by: user.id,
          approval_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Technique submitted!",
        description: "Your technique will be reviewed by admins before appearing in the global library.",
      });

      // Reset form
      setFormData({
        name: "",
        tradition: "",
        instructions: "",
        origin_story: "",
        worldview_context: "",
        lineage_info: "",
        home_region: "",
        relevant_texts: [""],
        external_links: [""],
        tags: [""]
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

  const addArrayField = (field: 'relevant_texts' | 'external_links' | 'tags') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ""]
    }));
  };

  const removeArrayField = (field: 'relevant_texts' | 'external_links' | 'tags', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayField = (field: 'relevant_texts' | 'external_links' | 'tags', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Contribute a Technique</DialogTitle>
          <DialogDescription>
            Share a meditation technique with the global community. Your submission will be reviewed before publication.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div>
              <Label htmlFor="name">Technique Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Loving-Kindness Meditation"
              />
            </div>

            <div>
              <Label htmlFor="tradition">Tradition / Community *</Label>
              <Input
                id="tradition"
                value={formData.tradition}
                onChange={(e) => setFormData(prev => ({ ...prev, tradition: e.target.value }))}
                placeholder="e.g., Theravada Buddhism, Secular Mindfulness"
              />
            </div>

            <div>
              <Label htmlFor="instructions">Step-by-Step Instructions *</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Provide detailed, step-by-step instructions..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="origin">Origin Story</Label>
              <Textarea
                id="origin"
                value={formData.origin_story}
                onChange={(e) => setFormData(prev => ({ ...prev, origin_story: e.target.value }))}
                placeholder="How did you learn this technique? What inspired you?"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="worldview">Cultural / Religious Context</Label>
              <Textarea
                id="worldview"
                value={formData.worldview_context}
                onChange={(e) => setFormData(prev => ({ ...prev, worldview_context: e.target.value }))}
                placeholder="Describe the worldview or influences behind this technique..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="lineage">Lineage Information</Label>
              <Textarea
                id="lineage"
                value={formData.lineage_info}
                onChange={(e) => setFormData(prev => ({ ...prev, lineage_info: e.target.value }))}
                placeholder="Any relevant teachers or lineage information..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="region">Home Region</Label>
              <Input
                id="region"
                value={formData.home_region}
                onChange={(e) => setFormData(prev => ({ ...prev, home_region: e.target.value }))}
                placeholder="e.g., Southeast Asia, California"
              />
            </div>

            <div>
              <Label>Relevant Texts (up to 3)</Label>
              {formData.relevant_texts.map((text, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    value={text}
                    onChange={(e) => updateArrayField('relevant_texts', idx, e.target.value)}
                    placeholder="e.g., The Heart of Buddhist Meditation"
                  />
                  {formData.relevant_texts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArrayField('relevant_texts', idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {formData.relevant_texts.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('relevant_texts')}
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Text
                </Button>
              )}
            </div>

            <div>
              <Label>External Links (up to 3)</Label>
              {formData.external_links.map((link, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    value={link}
                    onChange={(e) => updateArrayField('external_links', idx, e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                  {formData.external_links.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArrayField('external_links', idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {formData.external_links.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('external_links')}
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Link
                </Button>
              )}
            </div>

            <div>
              <Label>Tags</Label>
              {formData.tags.map((tag, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    value={tag}
                    onChange={(e) => updateArrayField('tags', idx, e.target.value)}
                    placeholder="e.g., compassion, breath"
                  />
                  {formData.tags.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArrayField('tags', idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addArrayField('tags')}
                className="mt-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Tag
              </Button>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            Submit for Review
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}