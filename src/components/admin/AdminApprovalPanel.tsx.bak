import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PendingTechnique {
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
  created_at: string;
}

export function AdminApprovalPanel() {
  const [pendingTechniques, setPendingTechniques] = useState<PendingTechnique[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<PendingTechnique | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
        if (data === true) {
          fetchPendingTechniques();
          return;
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  const fetchPendingTechniques = async () => {
    try {
      const { data, error } = await supabase
        .from('global_techniques')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingTechniques(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading submissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (techniqueId: string, approve: boolean) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('global_techniques')
        .update({
          approval_status: approve ? 'approved' : 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', techniqueId);

      if (error) throw error;

      toast({
        title: approve ? "Technique approved" : "Technique rejected",
        description: approve
          ? "The technique is now visible in the global library."
          : "The submission has been rejected.",
      });

      setDetailsOpen(false);
      fetchPendingTechniques();
    } catch (error: any) {
      toast({
        title: "Error processing submission",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDetails = (technique: PendingTechnique) => {
    setSelectedTechnique(technique);
    setDetailsOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  // Show access denied if not an admin
  if (isAdmin === false) {
    return (
      <Card className="p-8 text-center">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-destructive" />
        <h3 className="font-semibold text-lg mb-2">Access Denied</h3>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </Card>
    );
  }

  if (pendingTechniques.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No pending technique submissions.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {pendingTechniques.map((technique) => (
          <Card key={technique.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{technique.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{technique.tradition}</Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(technique.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {technique.instructions}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetails(technique)}
                  className="flex-1"
                >
                  Review
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApproval(technique.id, true)}
                  disabled={processing}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleApproval(technique.id, false)}
                  disabled={processing}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedTechnique && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Review Submission</DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="font-semibold mb-1">Technique Name</h4>
                  <p className="text-sm">{selectedTechnique.name}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Tradition</h4>
                  <p className="text-sm">{selectedTechnique.tradition}</p>
                </div>

                {selectedTechnique.home_region && (
                  <div>
                    <h4 className="font-semibold mb-1">Home Region</h4>
                    <p className="text-sm">{selectedTechnique.home_region}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTechnique.instructions}
                  </p>
                </div>

                {selectedTechnique.origin_story && (
                  <div>
                    <h4 className="font-semibold mb-2">Origin Story</h4>
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

                {selectedTechnique.tags && selectedTechnique.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedTechnique.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => handleApproval(selectedTechnique.id, true)}
                disabled={processing}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleApproval(selectedTechnique.id, false)}
                disabled={processing}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
