import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Star, Trash2, Upload, Pencil, Copy, X, GripVertical, Globe, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GlobalLibraryTab } from "@/components/library/GlobalLibraryTab";
import { UploadTechniqueDialog } from "@/components/library/UploadTechniqueDialog";
import { trackEvent } from "@/hooks/use-analytics";
import { formatTechniqueName, isGlobalLibraryTechnique } from "@/lib/technique-utils";

interface Technique {
  id: string;
  name: string;
  teacher_attribution?: string | null;
  description?: string | null;
  instructions: string | null;
  tips?: string | null;
  tradition: string | null;
  is_favorite: boolean;
  source_global_technique_id?: string | null;
  original_author_name?: string | null;
  tags?: string[] | null;
  lineage_info?: string | null;
  relevant_link?: string | null;
}

// Helper function to format duration display
const formatDuration = (tags: string[] | null | undefined): string | null => {
  if (!tags || tags.length === 0) return null;

  const durationTag = tags.find(tag => tag.includes('min') || tag.includes('hour'));
  if (!durationTag) return null;

  // Parse the duration (e.g., "20 min" or "1 hour")
  const match = durationTag.match(/(\d+)\s*(min|hour)/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'min') {
    return `Suggested duration: ${value} ${value === 1 ? 'minute' : 'minutes'}`;
  } else if (unit === 'hour') {
    return `Suggested duration: ${value} ${value === 1 ? 'hour' : 'hours'}`;
  }

  return null;
};

export function LibraryView() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [techniqueToDelete, setTechniqueToDelete] = useState<Technique | null>(null);
  const [detailTechnique, setDetailTechnique] = useState<Technique | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    teacherAttribution: "",
    description: "",
    instructionSteps: [""],
    tipSteps: [] as string[],
    tradition: "",
    relevantText: "",
    relevantLink: "",
    tags: [] as string[],
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructionSteps: [""],
    tipSteps: [] as string[],
    tradition: "",
    relevantText: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTechniques();
    // Track library opened
    trackEvent('library_opened');
  }, []);

  const fetchTechniques = async () => {
    try {
      const { data: techniquesData, error: techError } = await supabase
        .from("techniques")
        .select("id, name, teacher_attribution, description, instructions, tips, tradition, is_favorite, source_global_technique_id, original_author_name, tags")
        .order("name", { ascending: true });

      if (techError) throw techError;
      setTechniques(techniquesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading techniques",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTechnique = async () => {
    // Only name is required
    if (!formData.name.trim()) {
      toast({
        title: "Missing field",
        description: "Please provide a technique name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Format instructions as numbered list (only if there are filled steps)
      const filledSteps = formData.instructionSteps.filter(s => s.trim());
      const formattedInstructions = filledSteps.length > 0
        ? filledSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n")
        : null;

      // Format tips as bullet points (only if there are filled tips)
      const filledTips = formData.tipSteps.filter(t => t.trim());
      const formattedTips = filledTips.length > 0
        ? filledTips.map(tip => `• ${tip}`).join("\n")
        : null;

      const { error } = await supabase.from("techniques").insert({
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        instructions: formattedInstructions,
        tips: formattedTips,
        tradition: formData.tradition.trim() || null,
        original_author_name: formData.relevantText.trim() || null,
      });

      if (error) throw error;

      toast({ description: "Technique added", duration: 1500 });
      setAddModalOpen(false);
      setFormData({ name: "", description: "", instructionSteps: [""], tipSteps: [], tradition: "", relevantText: "" });
      fetchTechniques();
    } catch (error: any) {
      toast({
        title: "Error adding technique",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addInstructionStep = () => {
    setFormData(prev => ({
      ...prev,
      instructionSteps: [...prev.instructionSteps, ""]
    }));
  };

  const removeInstructionStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructionSteps: prev.instructionSteps.filter((_, i) => i !== index)
    }));
  };

  const updateInstructionStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructionSteps: prev.instructionSteps.map((step, i) => i === index ? value : step)
    }));
  };

  // Tip step helpers (for add form)
  const addTipStep = () => {
    if (formData.tipSteps.length < 10) {
      setFormData(prev => ({
        ...prev,
        tipSteps: [...prev.tipSteps, ""]
      }));
    }
  };

  const removeTipStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tipSteps: prev.tipSteps.filter((_, i) => i !== index)
    }));
  };

  const updateTipStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      tipSteps: prev.tipSteps.map((tip, i) => i === index ? value : tip)
    }));
  };

  // Edit form instruction step helpers
  const addEditInstructionStep = () => {
    setEditFormData(prev => ({
      ...prev,
      instructionSteps: [...prev.instructionSteps, ""]
    }));
  };

  const removeEditInstructionStep = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      instructionSteps: prev.instructionSteps.filter((_, i) => i !== index)
    }));
  };

  const updateEditInstructionStep = (index: number, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      instructionSteps: prev.instructionSteps.map((step, i) => i === index ? value : step)
    }));
  };

  // Edit form tip step helpers
  const addEditTipStep = () => {
    if (editFormData.tipSteps.length < 10) {
      setEditFormData(prev => ({
        ...prev,
        tipSteps: [...prev.tipSteps, ""]
      }));
    }
  };

  const removeEditTipStep = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      tipSteps: prev.tipSteps.filter((_, i) => i !== index)
    }));
  };

  const updateEditTipStep = (index: number, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      tipSteps: prev.tipSteps.map((tip, i) => i === index ? value : tip)
    }));
  };

  // Parse numbered instructions into steps
  const parseInstructionsToSteps = (instructions: string | null | undefined): string[] => {
    if (!instructions) return [""];

    // Try to parse numbered steps like "1. Step one\n2. Step two"
    const lines = instructions.split('\n').filter(line => line.trim());
    const steps = lines.map(line => {
      // Remove leading number and period/dot (e.g., "1. ", "2) ", "1: ")
      return line.replace(/^\d+[\.\)\:]\s*/, '').trim();
    }).filter(step => step);

    return steps.length > 0 ? steps : [""];
  };

  // Parse bullet tips into array
  const parseTipsToSteps = (tips: string | null | undefined): string[] => {
    if (!tips) return [];

    // Parse bullet points like "• Tip one\n• Tip two"
    const lines = tips.split('\n').filter(line => line.trim());
    const tipSteps = lines.map(line => {
      // Remove leading bullet (e.g., "• ", "* ", "- ")
      return line.replace(/^[•\*\-]\s*/, '').trim();
    }).filter(tip => tip);

    return tipSteps;
  };

  const handleDeleteTechnique = async () => {
    if (!techniqueToDelete) return;

    try {
      console.log('[Delete Technique] Starting deletion process');
      console.log('[Delete Technique] Technique to delete:', {
        id: techniqueToDelete.id,
        name: techniqueToDelete.name,
        source_global_technique_id: techniqueToDelete.source_global_technique_id,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Delete Technique] User not authenticated');
        throw new Error("Not authenticated");
      }

      console.log('[Delete Technique] Current user ID:', user.id);

      // Step 1: Verify technique exists and belongs to user
      const { data: verifyData, error: verifyError } = await supabase
        .from("techniques")
        .select("*")
        .eq("id", techniqueToDelete.id)
        .single();

      console.log('[Delete Technique] Verification query result:', {
        data: verifyData,
        error: verifyError,
      });

      if (verifyError) {
        console.error('[Delete Technique] Verification error:', verifyError);
        throw new Error(`Cannot verify technique: ${verifyError.message}`);
      }

      if (!verifyData) {
        console.error('[Delete Technique] Technique not found');
        throw new Error("Technique not found");
      }

      if (verifyData.user_id !== user.id) {
        console.error('[Delete Technique] Technique belongs to different user:', {
          technique_user_id: verifyData.user_id,
          current_user_id: user.id,
        });
        throw new Error("You don't own this technique");
      }

      console.log('[Delete Technique] Verification passed, proceeding with deletion');

      // Step 2: Check for sessions using this technique
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id")
        .eq("technique_id", techniqueToDelete.id)
        .limit(5);

      console.log('[Delete Technique] Sessions using this technique:', {
        count: sessionsData?.length || 0,
        sessions: sessionsData,
        error: sessionsError,
      });

      // Step 3: Attempt deletion
      console.log('[Delete Technique] Executing delete query');
      const { data: deleteData, error: deleteError } = await supabase
        .from("techniques")
        .delete()
        .eq("id", techniqueToDelete.id)
        .eq("user_id", user.id)
        .select();

      console.log('[Delete Technique] Delete query result:', {
        data: deleteData,
        error: deleteError,
      });

      if (deleteError) {
        console.error('[Delete Technique] Delete error:', {
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          code: deleteError.code,
        });
        throw deleteError;
      }

      console.log('[Delete Technique] Deletion successful!');
      toast({ description: "Technique deleted", duration: 1500 });
      setDeleteDialogOpen(false);
      setTechniqueToDelete(null);
      fetchTechniques();
    } catch (error: any) {
      console.error('[Delete Technique] Exception caught:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        stack: error.stack,
      });
      toast({
        title: "Error deleting technique",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (technique: Technique) => {
    setTechniqueToDelete(technique);
    setDeleteDialogOpen(true);
  };

  const openEditMode = (technique: Technique) => {
    setEditFormData({
      name: technique.name,
      teacherAttribution: technique.teacher_attribution || "",
      description: technique.description || "",
      instructionSteps: parseInstructionsToSteps(technique.instructions),
      tipSteps: parseTipsToSteps(technique.tips),
      tradition: technique.tradition || "",
      relevantText: technique.lineage_info || "",
      relevantLink: technique.relevant_link || "",
      tags: technique.tags || [],
    });
    setIsEditing(true);
  };

  const handleUpdateTechnique = async () => {
    // Only name is required
    if (!detailTechnique || !editFormData.name.trim()) {
      toast({
        title: "Missing field",
        description: "Please provide a technique name.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Format instructions as numbered list (only if there are filled steps)
      const filledSteps = editFormData.instructionSteps.filter(s => s.trim());
      const formattedInstructions = filledSteps.length > 0
        ? filledSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n")
        : null;

      // Format tips as bullet points (only if there are filled tips)
      const filledTips = editFormData.tipSteps.filter(t => t.trim());
      const formattedTips = filledTips.length > 0
        ? filledTips.map(tip => `• ${tip}`).join("\n")
        : null;

      const { error } = await supabase
        .from("techniques")
        .update({
          name: editFormData.name.trim(),
          teacher_attribution: editFormData.teacherAttribution.trim() || null,
          description: editFormData.description.trim() || null,
          instructions: formattedInstructions,
          tips: formattedTips,
          tradition: editFormData.tradition.trim() || null,
          lineage_info: editFormData.relevantText.trim() || null,
          relevant_link: editFormData.relevantLink.trim() || null,
          tags: editFormData.tags,
        })
        .eq("id", detailTechnique.id);

      if (error) throw error;

      toast({ description: "Technique updated", duration: 1500 });
      setIsEditing(false);
      setDetailTechnique(null);
      fetchTechniques();
    } catch (error: any) {
      toast({
        title: "Error updating technique",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTechnique = async (technique: Technique) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("techniques").insert({
        user_id: user.id,
        name: `${technique.name} (Copy)`,
        teacher_attribution: technique.teacher_attribution,
        description: technique.description,
        instructions: technique.instructions,
        tips: technique.tips,
        tradition: technique.tradition,
        tags: technique.tags,
        // IMPORTANT: Remove source reference to make it editable
        source_global_technique_id: null,
      });

      if (error) throw error;

      toast({ description: "Technique duplicated", duration: 1500 });
      fetchTechniques();
    } catch (error: any) {
      toast({
        title: "Error duplicating technique",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitToGlobalLibrary = async () => {
    if (!detailTechnique) return;

    // Validate required fields
    if (!detailTechnique.name || !detailTechnique.name.trim()) {
      toast({
        title: "Missing required field",
        description: "Technique name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!detailTechnique.teacher_attribution || !detailTechnique.teacher_attribution.trim()) {
      toast({
        title: "Missing required field",
        description: "Please add Teacher Attribution before submitting. Edit your technique to add this required field.",
        variant: "destructive",
      });
      return;
    }

    if (!detailTechnique.instructions || !detailTechnique.instructions.trim()) {
      toast({
        title: "Missing required field",
        description: "Instructions are required.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setSubmitDialogOpen(true);
  };

  const confirmSubmitToGlobalLibrary = async () => {
    if (!detailTechnique) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement actual submission to global_techniques table
      // For now, just show success message
      toast({
        title: "Submitted for review!",
        description: "You'll be notified when it's approved.",
        duration: 3000,
      });
      setSubmitDialogOpen(false);
      setDetailTechnique(null);
    } catch (error: any) {
      toast({
        title: "Failed to submit",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedTechniques = techniques.reduce((acc, technique) => {
    const tradition = technique.tradition || "Other";
    if (!acc[tradition]) acc[tradition] = [];
    acc[tradition].push(technique);
    return acc;
  }, {} as Record<string, Technique[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32">
        <p className="text-muted-foreground">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-32 safe-top">
      <div className="max-w-2xl mx-auto px-[12px] pb-[25px]">
        <Tabs defaultValue="personal" className="space-y-5">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="personal" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm font-semibold">
              My Library
            </TabsTrigger>
            <TabsTrigger value="global" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm font-semibold">
              Global Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-5">
            {techniques.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No techniques yet</h3>
                <p className="text-muted-foreground mb-6">
                  Add your first technique to get started
                </p>
                <Button variant="accent" onClick={() => setAddModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Technique
                </Button>
              </Card>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button variant="accent" onClick={() => setAddModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Technique
                  </Button>
                </div>
                <div className="space-y-6">
                  {Object.entries(groupedTechniques).map(([tradition, techs]) => (
                    <div key={tradition} className="space-y-3">
                      <h2 className="text-sm font-semibold text-primary uppercase tracking-wide px-1">{tradition}</h2>
                      {techs.map((technique) => (
                        <Card
                          key={technique.id}
                          className="p-4 cursor-pointer card-interactive"
                          onClick={() => {
                            trackEvent('technique_viewed', { technique_id: technique.id });
                            setDetailTechnique(technique);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-foreground">
                                  {formatTechniqueName(technique)}
                                </h3>
                                {technique.is_favorite && (
                                  <Star className="h-4 w-4 fill-accent text-accent shrink-0" />
                                )}
                                {isGlobalLibraryTechnique(technique) && (
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    <Globe className="h-3 w-3 mr-1" />
                                    From Global Library
                                  </Badge>
                                )}
                              </div>
                              {technique.original_author_name && (
                                <p className="text-xs text-accent mt-0.5">Submitted by {technique.original_author_name}</p>
                              )}
                              {(technique.description || technique.instructions) && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {technique.description || technique.instructions}
                                </p>
                              )}
                              {formatDuration(technique.tags) && (
                                <p className="text-sm text-muted-foreground italic mt-1">
                                  {formatDuration(technique.tags)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(technique);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="global" className="space-y-5">
            <div className="flex justify-end">
              <Button variant="accent" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Contribute Technique
              </Button>
            </div>
            <GlobalLibraryTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Technique Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Technique</DialogTitle>
            <DialogDescription>
              Add a meditation technique to your personal library
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="add-name">Technique Name *</Label>
              <Input
                id="add-name"
                placeholder='e.g., "Four-Part Breath" or "Body Scan"'
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                placeholder="A brief summary of what this technique is about..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-tradition">Tradition/Category</Label>
              <Input
                id="add-tradition"
                placeholder="e.g., Zen Buddhism, Vipassana, Breathwork, Secular Mindfulness"
                value={formData.tradition}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tradition: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                The community, tradition, lineage, or category this practice fits within.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-text">Relevant Text</Label>
              <Input
                id="add-text"
                placeholder='"The Miracle of Mindfulness" by Thich Nhat Hanh'
                value={formData.relevantText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, relevantText: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Name and author of a book or text relevant for understanding this technique or its broader approach.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Instructions (Step by Step)</Label>
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
                      onChange={(e) => updateInstructionStep(idx, e.target.value)}
                      placeholder={idx === 0 ? "e.g., Sit comfortably with eyes closed." : "Next step..."}
                      rows={2}
                      className="flex-1"
                    />
                    {formData.instructionSteps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInstructionStep(idx)}
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
                onClick={addInstructionStep}
                className="mt-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Step
              </Button>
            </div>

            {/* Tips for Practice (Optional) */}
            <div className="space-y-2">
              <Label>💡 Tips for Practice (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Add helpful tips or advice for practitioners (maximum 10 tips).
              </p>

              {formData.tipSteps.length > 0 && (
                <div className="space-y-2">
                  {formData.tipSteps.map((tip, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex items-center gap-1 pt-2.5 text-muted-foreground">
                        <span className="text-sm font-medium">•</span>
                      </div>
                      <Textarea
                        value={tip}
                        onChange={(e) => updateTipStep(idx, e.target.value)}
                        placeholder="Tip for practice..."
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTipStep(idx)}
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
                onClick={addTipStep}
                className="mt-2"
                disabled={formData.tipSteps.length >= 10}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Tip {formData.tipSteps.length >= 10 && "(Max 10)"}
              </Button>
            </div>

            <Button onClick={handleAddTechnique} className="w-full">
              Add Technique
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technique?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{techniqueToDelete?.name}" and all associated practice sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTechnique}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Technique Detail Dialog */}
      <Dialog open={!!detailTechnique} onOpenChange={() => { setDetailTechnique(null); setIsEditing(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Technique" : detailTechnique && formatTechniqueName(detailTechnique)}
            </DialogTitle>
            {!isEditing && detailTechnique?.original_author_name && (
              <DialogDescription>Submitted by {detailTechnique.original_author_name}</DialogDescription>
            )}
            {!isEditing && detailTechnique && isGlobalLibraryTechnique(detailTechnique) && (
              <Badge variant="outline" className="w-fit mt-2">
                <Globe className="h-3 w-3 mr-1" />
                From Global Library
              </Badge>
            )}
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4">
              {/* Basic Info Section */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Technique Name *</Label>
                <Input
                  placeholder="Technique Name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={150}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Teacher Attribution (Optional)</Label>
                <Input
                  placeholder="e.g., Sharon Salzberg, Jon Kabat-Zinn"
                  value={editFormData.teacherAttribution}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, teacherAttribution: e.target.value }))}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Who created or teaches this technique?
                </p>
              </div>

              {/* Details Section */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
                <Textarea
                  placeholder="A brief summary of what this technique is about..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tradition/Category (Optional)</Label>
                <Input
                  placeholder="e.g., Zen Buddhism, Vipassana, Breathwork"
                  value={editFormData.tradition}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, tradition: e.target.value }))}
                  maxLength={100}
                />
              </div>

              {/* Instructions Section */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Instructions (Step by Step) *</Label>
                <div className="space-y-2">
                  {editFormData.instructionSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex items-center gap-1 pt-2.5 text-muted-foreground">
                        <GripVertical className="h-4 w-4 opacity-50" />
                        <span className="text-sm font-medium w-5">{idx + 1}.</span>
                      </div>
                      <Textarea
                        value={step}
                        onChange={(e) => updateEditInstructionStep(idx, e.target.value)}
                        placeholder={idx === 0 ? "e.g., Sit comfortably with eyes closed." : "Next step..."}
                        rows={2}
                        className="flex-1"
                      />
                      {editFormData.instructionSteps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEditInstructionStep(idx)}
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
                  onClick={addEditInstructionStep}
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Step
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">💡 Tips for Practice (Optional)</Label>
                {editFormData.tipSteps.length > 0 && (
                  <div className="space-y-2">
                    {editFormData.tipSteps.map((tip, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex items-center gap-1 pt-2.5 text-muted-foreground">
                          <span className="text-sm font-medium">•</span>
                        </div>
                        <Textarea
                          value={tip}
                          onChange={(e) => updateEditTipStep(idx, e.target.value)}
                          placeholder="Tip for practice..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEditTipStep(idx)}
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
                  onClick={addEditTipStep}
                  className="mt-2"
                  disabled={editFormData.tipSteps.length >= 10}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Tip {editFormData.tipSteps.length >= 10 && "(Max 10)"}
                </Button>
              </div>

              {/* References Section */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Relevant Text/Source (Optional)</Label>
                <Input
                  placeholder='e.g., "The Miracle of Mindfulness" by Thich Nhat Hanh'
                  value={editFormData.relevantText}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, relevantText: e.target.value }))}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">
                  Book, article, or text reference
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Relevant Link (Optional)</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/article"
                  value={editFormData.relevantLink}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, relevantLink: e.target.value }))}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  URL to source material or further reading
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateTechnique} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Description */}
              {detailTechnique?.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p>{detailTechnique.description}</p>
                </div>
              )}

              {/* Tradition */}
              {detailTechnique?.tradition && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tradition/Category</h4>
                  <p>{detailTechnique.tradition}</p>
                </div>
              )}

              {/* Instructions */}
              {detailTechnique?.instructions && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Instructions</h4>
                  <p className="whitespace-pre-wrap">{detailTechnique.instructions}</p>
                </div>
              )}

              {/* Tips for Practice */}
              {detailTechnique?.tips && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">💡 Tips for Practice</h4>
                  <p className="whitespace-pre-wrap text-muted-foreground">{detailTechnique.tips}</p>
                </div>
              )}

              {/* Tags */}
              {detailTechnique?.tags && detailTechnique.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {detailTechnique.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-muted rounded-md text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                {detailTechnique && isGlobalLibraryTechnique(detailTechnique) ? (
                  // Read-only Global Library technique - show "Duplicate to Edit" as primary action
                  <Button
                    onClick={() => {
                      handleDuplicateTechnique(detailTechnique);
                      setDetailTechnique(null);
                    }}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate to Edit
                  </Button>
                ) : (
                  // Editable technique - show Edit, Duplicate, and Submit to Global Library
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openEditMode(detailTechnique!)}
                        className="flex-1"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleDuplicateTechnique(detailTechnique!);
                          setDetailTechnique(null);
                        }}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSubmitToGlobalLibrary}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Submit to Global Library
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Technique Dialog */}
      <UploadTechniqueDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {/* Submit to Global Library Confirmation Dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit to Global Library?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will submit your technique for review. If approved, it will be visible to all Contempla users.</p>

              <div className="space-y-1">
                <p className="font-semibold text-foreground">Required fields:</p>
                <ul className="list-none space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Name
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Teacher Attribution
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Instructions
                  </li>
                </ul>
              </div>

              <p className="text-sm italic">Your technique will be reviewed before appearing in the Global Library.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmitToGlobalLibrary} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
