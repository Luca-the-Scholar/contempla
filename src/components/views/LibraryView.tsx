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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Star, Trash2, Upload, Pencil, Copy, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { GlobalLibraryTab } from "@/components/library/GlobalLibraryTab";
import { UploadTechniqueDialog } from "@/components/library/UploadTechniqueDialog";
import { PresetManager } from "@/components/presets/PresetManager";
import { MasteryHistoryDialog } from "@/components/library/MasteryHistoryDialog";

interface Technique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  tags: string[];
  is_favorite: boolean;
  mastery?: number;
  lastPracticed?: string;
  source_global_technique_id?: string | null;
  original_author_name?: string | null;
}

const AVAILABLE_TAGS = [
  "Breathing",
  "Body Scan",
  "Visualization",
  "Concentration",
  "Loving-Kindness",
  "Open Awareness",
  "Movement",
  "Mantra",
];

export function LibraryView() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [techniqueToDelete, setTechniqueToDelete] = useState<Technique | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [detailTechnique, setDetailTechnique] = useState<Technique | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    instructions: "",
    tradition: "",
    tags: [] as string[],
  });
  const [formData, setFormData] = useState({
    name: "",
    instructions: "",
    tradition: "",
  });
  const [masteryHistoryOpen, setMasteryHistoryOpen] = useState(false);
  const [masteryHistoryTechnique, setMasteryHistoryTechnique] = useState<Technique | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTechniques();
  }, []);

  const fetchTechniques = async () => {
    try {
      const { data: techniquesData, error: techError } = await supabase
        .from("techniques")
        .select("*")
        .order("name", { ascending: true });

      if (techError) throw techError;

      const { data: masteryData } = await supabase
        .from("mastery_scores")
        .select("technique_id, mastery_score, last_practiced_at")
        .order("last_practiced_at", { ascending: false });

      const masteryMap = new Map(
        masteryData?.map((m) => [
          m.technique_id,
          {
            mastery: m.mastery_score,
            lastPracticed: m.last_practiced_at,
          },
        ]) || []
      );

      const techniquesWithMastery = (techniquesData || [])
        .map((t) => {
          const masteryInfo = masteryMap.get(t.id);
          return {
            ...t,
            mastery: masteryInfo?.mastery || 0,
            lastPracticed: masteryInfo?.lastPracticed,
          };
        })
        .sort((a, b) => {
          if (!a.lastPracticed) return 1;
          if (!b.lastPracticed) return -1;
          return new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime();
        });

      setTechniques(techniquesWithMastery);
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
        tags: selectedTags,
      });

      if (error) throw error;

      toast({ title: "Technique added!" });
      setAddModalOpen(false);
      setFormData({ name: "", instructions: "", tradition: "" });
      setSelectedTags([]);
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
      tags: technique.tags || [],
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
          tags: editFormData.tags,
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
        tags: technique.tags,
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

  const formatLastPracticed = (dateString?: string) => {
    if (!dateString) return "Never practiced";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
                        <div className="space-y-3">
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
                              <p className="text-sm text-muted-foreground mt-1">
                                {formatLastPracticed(technique.lastPracticed)}
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

                          {technique.tags && technique.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {technique.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 border-t">
                            <button
                              className="w-full flex items-center justify-between text-sm hover:bg-accent/50 rounded p-1 -m-1 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMasteryHistoryTechnique(technique);
                                setMasteryHistoryOpen(true);
                              }}
                            >
                              <span className="text-muted-foreground flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Mastery
                              </span>
                              <span className="font-semibold">
                                {technique.mastery?.toFixed(1) || 0}%
                              </span>
                            </button>
                          </div>
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

      {/* Add floating action button for personal library */}
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
                placeholder="Tradition/Community"
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

            <div>
              <Select
                value={selectedTags[0] || ""}
                onValueChange={(value) => {
                  if (!selectedTags.includes(value)) {
                    setSelectedTags([...selectedTags, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add tags (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedTags(selectedTags.filter((t) => t !== tag))
                      }
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddTechnique} className="flex-1">
                Add Technique
              </Button>
              <Button
                variant="outline"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Technique Dialog */}
      <UploadTechniqueDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technique</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{techniqueToDelete?.name}"? This
              action cannot be undone.
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

      {/* Technique Detail Dialog with Preset Manager */}
      <Dialog open={!!detailTechnique} onOpenChange={(open) => {
        if (!open) {
          setDetailTechnique(null);
          setIsEditing(false);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? "Edit Technique" : detailTechnique?.name}
              {!isEditing && detailTechnique?.is_favorite && (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Update your technique details" : detailTechnique?.tradition}
            </DialogDescription>
          </DialogHeader>
          
          {detailTechnique && (
            <div className="space-y-6 pt-4">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Technique Name"
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Input
                      placeholder="Tradition/Community"
                      value={editFormData.tradition}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, tradition: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Textarea
                      placeholder="Instructions"
                      value={editFormData.instructions}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, instructions: e.target.value }))
                      }
                      rows={6}
                    />
                  </div>

                  <div>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!editFormData.tags.includes(value)) {
                          setEditFormData((prev) => ({ ...prev, tags: [...prev.tags, value] }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add tags (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_TAGS.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {editFormData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {editFormData.tags.map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                              setEditFormData((prev) => ({
                                ...prev,
                                tags: prev.tags.filter((t) => t !== tag),
                              }))
                            }
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                    )}
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
                /* View Mode */
                <>
                  {/* Attribution for saved global techniques */}
                  {detailTechnique.original_author_name && (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                      <span className="text-sm text-primary">by {detailTechnique.original_author_name}</span>
                      {detailTechnique.source_global_technique_id && (
                        <Badge variant="secondary" className="text-xs">Read-only</Badge>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!detailTechnique.source_global_technique_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditMode(detailTechnique)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateTechnique(detailTechnique)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {detailTechnique.source_global_technique_id ? 'Duplicate to Edit' : 'Duplicate'}
                    </Button>
                  </div>

                  {/* Tags */}
                  {detailTechnique.tags && detailTechnique.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {detailTechnique.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold mb-2">Instructions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailTechnique.instructions}
                    </p>
                  </div>

                  {/* Mastery */}
                  <button
                    className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => {
                      setMasteryHistoryTechnique(detailTechnique);
                      setMasteryHistoryOpen(true);
                    }}
                  >
                    <span className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Mastery Progress
                    </span>
                    <span className="font-semibold">{detailTechnique.mastery?.toFixed(1) || 0}%</span>
                  </button>

                  {/* Preset Manager */}
                  <div className="border-t pt-4">
                    <PresetManager 
                      techniqueId={detailTechnique.id} 
                      techniqueName={detailTechnique.name} 
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mastery History Dialog */}
      {masteryHistoryTechnique && (
        <MasteryHistoryDialog
          open={masteryHistoryOpen}
          onOpenChange={setMasteryHistoryOpen}
          techniqueId={masteryHistoryTechnique.id}
          techniqueName={masteryHistoryTechnique.name}
          currentMastery={masteryHistoryTechnique.mastery || 0}
        />
      )}
    </div>
  );
}