import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Globe, Book, MapPin, Bookmark, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GlobalTechnique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  tags: string[];
  origin_story: string | null;
  worldview_context: string | null;
  lineage_info: string | null;
  relevant_texts: string[] | null;
  external_links: string[] | null;
  home_region: string | null;
  submitted_by: string;
}

interface SubmitterProfile {
  id: string;
  name: string | null;
}

export function GlobalLibraryTab() {
  const [techniques, setTechniques] = useState<GlobalTechnique[]>([]);
  const [submitterNames, setSubmitterNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTechnique, setSelectedTechnique] = useState<GlobalTechnique | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [techniqueToDelete, setTechniqueToDelete] = useState<GlobalTechnique | null>(null);

  useEffect(() => {
    fetchGlobalTechniques();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchGlobalTechniques = async () => {
    try {
      const { data, error } = await supabase
        .from('global_techniques')
        .select('*')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTechniques(data || []);
      
      // Fetch submitter names
      const submitterIds = [...new Set((data || []).map(t => t.submitted_by))];
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', submitterIds);
        
        const namesMap: Record<string, string> = {};
        (profiles || []).forEach((p: SubmitterProfile) => {
          namesMap[p.id] = p.name || 'Anonymous';
        });
        setSubmitterNames(namesMap);
      }
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

  // Save to library (read-only, with attribution)
  const saveToPersonalLibrary = async (technique: GlobalTechnique) => {
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const authorName = submitterNames[technique.submitted_by] || 'Anonymous';

      const { error } = await supabase
        .from('techniques')
        .insert({
          user_id: user.id,
          name: technique.name,
          instructions: technique.instructions,
          tradition: technique.tradition,
          tags: technique.tags,
          source_global_technique_id: technique.id,
          original_author_name: authorName
        });

      if (error) throw error;

      toast({
        title: "Saved to library",
        description: `${technique.name} by ${authorName} has been saved to your library.`,
      });
      
      setDetailsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error saving technique",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  // Copy to library (editable duplicate)
  const copyToPersonalLibrary = async (technique: GlobalTechnique) => {
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('techniques')
        .insert({
          user_id: user.id,
          name: `${technique.name} (Copy)`,
          instructions: technique.instructions,
          tradition: technique.tradition,
          tags: technique.tags
        });

      if (error) throw error;

      toast({
        title: "Copied to library",
        description: `A copy of ${technique.name} has been added to your library. You can now edit it.`,
      });
      
      setDetailsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error copying technique",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const openDetails = (technique: GlobalTechnique) => {
    setSelectedTechnique(technique);
    setDetailsOpen(true);
  };

  const handleDeleteClick = (technique: GlobalTechnique) => {
    setTechniqueToDelete(technique);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!techniqueToDelete) return;
    
    try {
      const { error } = await supabase
        .from('global_techniques')
        .delete()
        .eq('id', techniqueToDelete.id);

      if (error) throw error;

      toast({
        title: "Technique deleted",
        description: `${techniqueToDelete.name} has been removed from the global library.`,
      });
      
      setTechniques(prev => prev.filter(t => t.id !== techniqueToDelete.id));
      setDetailsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error deleting technique",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTechniqueToDelete(null);
    }
  };

  const getAuthorName = (technique: GlobalTechnique) => {
    return submitterNames[technique.submitted_by] || 'Anonymous';
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading global library...</div>;
  }

  if (techniques.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No techniques in the global library yet.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {techniques.map((technique) => (
          <Card key={technique.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{technique.name}</h3>
                  <p className="text-xs text-muted-foreground">by {getAuthorName(technique)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{technique.tradition}</Badge>
                    {technique.home_region && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {technique.home_region}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {technique.instructions}
              </p>

              {technique.tags && technique.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {technique.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => openDetails(technique)}
                className="w-full"
              >
                <Book className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedTechnique && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedTechnique.name}</DialogTitle>
              <DialogDescription>
                by {getAuthorName(selectedTechnique)} • {selectedTechnique.tradition}
                {selectedTechnique.home_region && ` • ${selectedTechnique.home_region}`}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTechnique.instructions}
                  </p>
                </div>

                {selectedTechnique.origin_story && (
                  <div>
                    <h4 className="font-semibold mb-2">Origin</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTechnique.origin_story}
                    </p>
                  </div>
                )}

                {selectedTechnique.worldview_context && (
                  <div>
                    <h4 className="font-semibold mb-2">Cultural Context</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTechnique.worldview_context}
                    </p>
                  </div>
                )}

                {selectedTechnique.lineage_info && (
                  <div>
                    <h4 className="font-semibold mb-2">Lineage</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTechnique.lineage_info}
                    </p>
                  </div>
                )}

                {selectedTechnique.relevant_texts && selectedTechnique.relevant_texts.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Relevant Texts</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {selectedTechnique.relevant_texts.map((text, idx) => (
                        <li key={idx}>{text}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTechnique.external_links && selectedTechnique.external_links.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">External Links</h4>
                    <ul className="space-y-1">
                      {selectedTechnique.external_links.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  onClick={() => saveToPersonalLibrary(selectedTechnique)}
                  disabled={adding}
                  className="flex-1"
                  variant="default"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save to Library
                </Button>
                <Button
                  onClick={() => copyToPersonalLibrary(selectedTechnique)}
                  disabled={adding}
                  className="flex-1"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                <strong>Save</strong> keeps attribution (read-only) • <strong>Duplicate</strong> creates an editable copy
              </p>
              {isAdmin && (
                <Button
                  onClick={() => handleDeleteClick(selectedTechnique)}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete from Global Library
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technique</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{techniqueToDelete?.name}" from the global library? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
