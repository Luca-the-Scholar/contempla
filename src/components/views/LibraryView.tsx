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
import { Plus, Star, Trash2, Upload, Pencil, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GlobalLibraryTab } from "@/components/library/GlobalLibraryTab";
import { UploadTechniqueDialog } from "@/components/library/UploadTechniqueDialog";

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
    instructions: "",
    tradition: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTechniques();
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
    if (!formData.name || !formData.instructions || !formData.tradition) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("techniques").insert({
        user_id: user.id,
        name: formData.name,
        instructions: formData.instructions,
        tradition: formData.tradition,
      });

      if (error) throw error;

      toast({ title: "Technique added!" });
      setAddModalOpen(false);
      setFormData({ name: "", instructions: "", tradition: "" });
      fetchTechniques();
    } catch (error: any) {
      toast({
        title: "Error adding technique",
        description: error.message,
        variant: "destructive",
      });
    }
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
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Library</h1>
          <p className="text-sm text-muted-foreground">
            Your personal collection and global techniques
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">My Library</TabsTrigger>
            <TabsTrigger value="global">Global Library</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            {techniques.length === 0 ? (
              <Card className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">No techniques yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first technique to get started
                </p>
                <Button onClick={() => setAddModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Technique
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTechniques).map(([tradition, techs]) => (
                  <div key={tradition} className="space-y-3">
                    <h2 className="text-base font-semibold px-1">{tradition}</h2>
                    {techs.map((technique) => (
                      <Card 
                        key={technique.id} 
                        className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setDetailTechnique(technique)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{technique.name}</h3>
                              {technique.is_favorite && (
                                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                              )}
                            </div>
                            {technique.original_author_name && (
                              <p className="text-xs text-primary">by {technique.original_author_name}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {technique.instructions}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
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

          <TabsContent value="global" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Contribute Technique
              </Button>
            </div>
            <GlobalLibraryTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add floating action button */}
      <button
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-24 right-6 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:scale-110 transition-transform z-40"
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

          <div className="space-y-4">
            <div>
              <Input
                placeholder="Technique Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Input
                placeholder="Teacher or Source"
                value={formData.tradition}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tradition: e.target.value }))
                }
              />
            </div>

            <div>
              <Textarea
                placeholder="Instructions"
                value={formData.instructions}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, instructions: e.target.value }))
                }
                rows={4}
              />
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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
