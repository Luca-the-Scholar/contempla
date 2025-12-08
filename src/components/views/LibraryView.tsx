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
import { Plus, Star, Trash2, Upload, Pencil, Copy, X, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GlobalLibraryTab } from "@/components/library/GlobalLibraryTab";
import { UploadTechniqueDialog } from "@/components/library/UploadTechniqueDialog";
import { trackEvent } from "@/hooks/use-analytics";

interface Technique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  is_favorite: boolean;
  source_global_technique_id?: string | null;
  original_author_name?: string | null;
}

export function LibraryView() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [techniqueToDelete, setTechniqueToDelete] = useState<Technique | null>(null);
  const [detailTechnique, setDetailTechnique] = useState<Technique | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    instructions: "",
    tradition: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    instructionSteps: [""],
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
        .select("id, name, instructions, tradition, is_favorite, source_global_technique_id, original_author_name")
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
    const filledSteps = formData.instructionSteps.filter(s => s.trim());
    
    if (!formData.name || filledSteps.length === 0 || !formData.tradition) {
      toast({
        title: "Missing fields",
        description: "Please fill in technique name, tradition, and at least one instruction step.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Format instructions as numbered list
      const formattedInstructions = filledSteps
        .map((step, idx) => `${idx + 1}. ${step}`)
        .join("\n");

      const { error } = await supabase.from("techniques").insert({
        user_id: user.id,
        name: formData.name,
        instructions: formattedInstructions,
        tradition: formData.tradition,
        original_author_name: formData.relevantText.trim() || null,
      });

      if (error) throw error;

      toast({ title: "Technique added!" });
      setAddModalOpen(false);
      setFormData({ name: "", instructionSteps: [""], tradition: "", relevantText: "" });
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

  const handleDeleteTechnique = async () => {
    if (!techniqueToDelete) return;

    try {
      const { error } = await supabase
        .from("techniques")
        .delete()
        .eq("id", techniqueToDelete.id);

      if (error) throw error;

      toast({ title: "Technique deleted" });
      setDeleteDialogOpen(false);
      setTechniqueToDelete(null);
      fetchTechniques();
    } catch (error: any) {
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
      instructions: technique.instructions,
      tradition: technique.tradition,
    });
    setIsEditing(true);
  };

  const handleUpdateTechnique = async () => {
    if (!detailTechnique || !editFormData.name || !editFormData.instructions || !editFormData.tradition) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("techniques")
        .update({
          name: editFormData.name,
          instructions: editFormData.instructions,
          tradition: editFormData.tradition,
        })
        .eq("id", detailTechnique.id);

      if (error) throw error;

      toast({ title: "Technique updated!" });
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
        instructions: technique.instructions,
        tradition: technique.tradition,
      });

      if (error) throw error;

      toast({ title: "Technique duplicated!" });
      fetchTechniques();
    } catch (error: any) {
      toast({
        title: "Error duplicating technique",
        description: error.message,
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground truncate">{technique.name}</h3>
                              {technique.is_favorite && (
                                <Star className="h-4 w-4 fill-accent text-accent shrink-0" />
                              )}
                            </div>
                            {technique.original_author_name && (
                              <p className="text-xs text-accent mt-0.5">by {technique.original_author_name}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {technique.instructions}
                            </p>
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

      {/* Floating action button */}
      <button
        onClick={() => setAddModalOpen(true)}
        className="fab"
        aria-label="Add technique"
      >
        <Plus className="h-6 w-6" />
      </button>

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
              <Label htmlFor="add-tradition">Tradition/Category Name *</Label>
              <Input
                id="add-tradition"
                placeholder="e.g., Zen Buddhism, Vipassana, Breathwork, Secular Mindfulness"
                value={formData.tradition}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tradition: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Please use a name for the community, tradition, lineage, or category that you see this practice fitting within.
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
              {isEditing ? "Edit Technique" : detailTechnique?.name}
            </DialogTitle>
            {!isEditing && detailTechnique?.original_author_name && (
              <DialogDescription>by {detailTechnique.original_author_name}</DialogDescription>
            )}
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4">
              <Input
                placeholder="Technique Name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Teacher or Source"
                value={editFormData.tradition}
                onChange={(e) => setEditFormData(prev => ({ ...prev, tradition: e.target.value }))}
              />
              <Textarea
                placeholder="Instructions"
                value={editFormData.instructions}
                onChange={(e) => setEditFormData(prev => ({ ...prev, instructions: e.target.value }))}
                rows={6}
              />
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
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Instructions</h4>
                <p className="whitespace-pre-wrap">{detailTechnique?.instructions}</p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Technique Dialog */}
      <UploadTechniqueDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}
