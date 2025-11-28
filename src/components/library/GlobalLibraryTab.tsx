import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Globe, Book, MapPin } from "lucide-react";
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
}

export function GlobalLibraryTab() {
  const [techniques, setTechniques] = useState<GlobalTechnique[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechnique, setSelectedTechnique] = useState<GlobalTechnique | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchGlobalTechniques();
  }, []);

  const fetchGlobalTechniques = async () => {
    try {
      const { data, error } = await supabase
        .from('global_techniques')
        .select('*')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTechniques(data || []);
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

  const addToPersonalLibrary = async (technique: GlobalTechnique) => {
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('techniques')
        .insert({
          user_id: user.id,
          name: technique.name,
          instructions: technique.instructions,
          tradition: technique.tradition,
          tags: technique.tags
        });

      if (error) throw error;

      toast({
        title: "Added to library",
        description: `${technique.name} has been added to your personal library.`,
      });
      
      setDetailsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error adding technique",
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
                {selectedTechnique.tradition}
                {selectedTechnique.home_region && ` • ${selectedTechnique.home_region}`}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
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

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => addToPersonalLibrary(selectedTechnique)}
                disabled={adding}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to My Library
              </Button>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Copying creates an editable version in your personal library
            </p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}