import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Globe, Bookmark, Trash2, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sanitizeUserContent } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

interface GlobalTechnique {
  id: string;
  name: string;
  teacher_attribution: string | null;
  instructions: string;
  tips: string | null;
  tradition: string;
  tags: string[];
  origin_story: string | null;
  worldview_context: string | null;
  lineage_info: string | null;
  relevant_link: string | null;
  relevant_texts: string[] | null;
  external_links: string[] | null;
  home_region: string | null;
  submitted_by: string;
}

interface SubmitterProfile {
  id: string;
  name: string | null;
  handle: string | null;
}

// Helper to extract duration from tags
function extractDurationFromTags(tags: string[] | null): string | null {
  if (!tags || tags.length === 0) return null;
  
  const durationRegex = /(\d+)\s*(min|minute|minutes|hour|hours)/i;
  
  for (const tag of tags) {
    const match = tag.match(durationRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      
      if (unit.startsWith('hour')) {
        return `${num * 60} minutes`;
      }
      return `${num} minutes`;
    }
  }
  
  return null;
}

// Helper to format instructions with proper spacing for numbered lists
function formatInstructionText(text: string): React.ReactNode {
  // Split by numbered patterns like "1.", "2.", etc.
  const parts = text.split(/(?=\d+\.\s)/);
  
  if (parts.length > 1) {
    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          const trimmed = part.trim();
          if (!trimmed) return null;
          return (
            <p key={index} className="text-sm text-foreground">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  }
  
  // If no numbered list, just preserve whitespace
  return <p className="text-sm text-foreground whitespace-pre-wrap">{text}</p>;
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="my-3">
      <CollapsibleTrigger
        className="flex items-center gap-2 font-medium cursor-pointer hover:text-foreground w-full text-left py-2"
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "rotate-90" : "rotate-0"
          )}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pb-2 pl-6">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function GlobalLibraryTab() {
  const [techniques, setTechniques] = useState<GlobalTechnique[]>([]);
  const [submitterProfiles, setSubmitterProfiles] = useState<Record<string, SubmitterProfile>>({});
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

      // Fetch submitter profiles (name and handle)
      const submitterIds = [...new Set((data || []).map(t => t.submitted_by))];
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, handle')
          .in('id', submitterIds);

        const profilesMap: Record<string, SubmitterProfile> = {};
        (profiles || []).forEach((p: SubmitterProfile) => {
          profilesMap[p.id] = p;
        });
        setSubmitterProfiles(profilesMap);
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

  const saveToPersonalLibrary = async (technique: GlobalTechnique) => {
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profile = submitterProfiles[technique.submitted_by];
      const authorName = profile?.name || 'Anonymous';

      const { error } = await supabase
        .from('techniques')
        .insert({
          user_id: user.id,
          name: technique.name,
          instructions: technique.instructions,
          tips: technique.tips,
          tradition: technique.tradition,
          tags: technique.tags,
          source_global_technique_id: technique.id,
          original_author_name: authorName
        });

      if (error) throw error;

      toast({
        title: "Saved to library",
        description: `${technique.name} has been saved to your library.`,
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

  const getSubmitterHandle = (technique: GlobalTechnique) => {
    const profile = submitterProfiles[technique.submitted_by];
    return profile?.handle || profile?.name || 'anonymous';
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
          <Card
            key={technique.id}
            className="p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md"
            onClick={() => openDetails(technique)}
          >
            <div className="space-y-2">
              {/* Technique name and attribution as flowing sentence */}
              <p className="text-base font-medium leading-relaxed">
                {sanitizeUserContent(technique.name)}
                {technique.teacher_attribution && (
                  <span className="text-muted-foreground font-normal">
                    {" "}as practiced by {sanitizeUserContent(technique.teacher_attribution)}
                  </span>
                )}
              </p>

              {/* Tradition badge */}
              <div>
                <Badge variant="secondary">{sanitizeUserContent(technique.tradition)}</Badge>
              </div>

              {/* Submitted by handle */}
              <p className="text-xs text-muted-foreground mt-2">
                Submitted by @{getSubmitterHandle(technique)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {selectedTechnique && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
            {/* Scrollable Content Area - everything scrolls together */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 pb-4">
              {/* Header section - scrolls with content */}
              <DialogHeader className="space-y-0 mb-6">
                {/* Title */}
                <DialogTitle className="text-xl font-semibold mb-1">
                  {sanitizeUserContent(selectedTechnique.name)}
                </DialogTitle>
                
                {/* Subtitle: as practiced by */}
                {selectedTechnique.teacher_attribution && (
                  <p className="text-base text-muted-foreground italic mb-1">
                    as practiced by {sanitizeUserContent(selectedTechnique.teacher_attribution)}
                  </p>
                )}
                
                {/* Metadata line */}
                <p className="text-sm text-muted-foreground">
                  {sanitizeUserContent(selectedTechnique.tradition)} • Submitted by @{getSubmitterHandle(selectedTechnique)}
                </p>
              </DialogHeader>

              <div className="space-y-4">
                {/* Description section - always visible */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {sanitizeUserContent(selectedTechnique.origin_story) || "No description provided."}
                  </p>
                  
                  {/* Duration from tags */}
                  {extractDurationFromTags(selectedTechnique.tags) && (
                    <p className="text-sm text-muted-foreground italic mt-3">
                      Suggested duration: {extractDurationFromTags(selectedTechnique.tags)}
                    </p>
                  )}
                </div>

                {/* Divider after description */}
                <div className="border-t my-6" />

                {/* Instructions - collapsible, default open */}
                <CollapsibleSection title="Instructions" defaultOpen={true}>
                  {formatInstructionText(sanitizeUserContent(selectedTechnique.instructions))}
                </CollapsibleSection>

                {/* Tips for Practice - conditional */}
                {selectedTechnique.tips && selectedTechnique.tips.trim() && (
                  <>
                    <div className="border-t my-4" />
                    <CollapsibleSection title="Tips for Practice" defaultOpen={false}>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {sanitizeUserContent(selectedTechnique.tips)}
                      </p>
                    </CollapsibleSection>
                  </>
                )}

                {/* Relevant Texts or Sources - conditional */}
                {(selectedTechnique.lineage_info || selectedTechnique.relevant_link) && (
                  <>
                    <div className="border-t my-4" />
                    <CollapsibleSection title="Relevant Texts or Sources" defaultOpen={false}>
                      <div className="space-y-4">
                        {selectedTechnique.lineage_info && (
                          <div>
                            <p className="text-sm font-medium text-foreground mb-1">Books:</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {sanitizeUserContent(selectedTechnique.lineage_info)}
                            </p>
                          </div>
                        )}
                        {selectedTechnique.relevant_link && (
                          <div>
                            <p className="text-sm font-medium text-foreground mb-1">Online Resources:</p>
                            <a
                              href={selectedTechnique.relevant_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
                            >
                              {sanitizeUserContent(selectedTechnique.relevant_link)}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  </>
                )}

                {/* Submitter's Relationship to the Practice - conditional */}
                {selectedTechnique.worldview_context && selectedTechnique.worldview_context.trim() && (
                  <>
                    <div className="border-t my-4" />
                    <CollapsibleSection title="Submitter's Relationship to the Practice" defaultOpen={false}>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {sanitizeUserContent(selectedTechnique.worldview_context)}
                      </p>
                    </CollapsibleSection>
                  </>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-6 pt-4 border-t bg-card">
              <div className="space-y-3">
              <Button
                  onClick={() => saveToPersonalLibrary(selectedTechnique)}
                  disabled={adding}
                  className="w-full"
                  variant="default"
                  size="sm"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save to My Library
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => handleDeleteClick(selectedTechnique)}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete from Global Library
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technique</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sanitizeUserContent(techniqueToDelete?.name)}" from the global library? This action cannot be undone.
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
