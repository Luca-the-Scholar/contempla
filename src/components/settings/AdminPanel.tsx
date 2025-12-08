import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Crown, Loader2, Search, Clock, Check, X, FileText } from "lucide-react";
import { trackEvent } from "@/hooks/use-analytics";

interface UserWithRole {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
}

interface PendingTechnique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  tags: string[];
  origin_story: string | null;
  lineage_info: string | null;
  submitted_by: string;
  submitter_name: string | null;
  created_at: string;
}

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  
  // Technique approval state
  const [pendingTechniques, setPendingTechniques] = useState<PendingTechnique[]>([]);
  const [loadingTechniques, setLoadingTechniques] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<PendingTechnique | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAdminUsers();
      fetchPendingTechniques();
    }
  }, [open]);

  const fetchAdminUsers = async () => {
    setLoading(true);
    try {
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminIds = adminRoles?.map(r => r.user_id) || [];

      if (adminIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", adminIds);

        if (profilesError) throw profilesError;

        const { data: { user } } = await supabase.auth.getUser();
        
        const adminUsers: UserWithRole[] = (profiles || []).map(profile => ({
          id: profile.id,
          email: profile.id === user?.id ? (user?.email || "Unknown") : "Hidden",
          name: profile.name,
          isAdmin: true
        }));

        setUsers(adminUsers);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error("Error fetching admin users:", error);
      toast({
        title: "Error loading admins",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTechniques = async () => {
    setLoadingTechniques(true);
    try {
      const { data, error } = await supabase
        .from('global_techniques')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch submitter names
      const submitterIds = [...new Set((data || []).map(t => t.submitted_by))];
      let submitterNames: Record<string, string> = {};
      
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', submitterIds);
        
        (profiles || []).forEach(p => {
          submitterNames[p.id] = p.name || 'Unknown';
        });
      }

      const techniquesWithNames = (data || []).map(t => ({
        ...t,
        submitter_name: submitterNames[t.submitted_by] || 'Unknown'
      }));

      setPendingTechniques(techniquesWithNames);
    } catch (error: any) {
      toast({
        title: "Error loading submissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingTechniques(false);
    }
  };

  const handlePromoteUser = async () => {
    if (!promoteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setPromoting(promoteEmail);
    try {
      const { data, error } = await supabase.rpc("promote_user_to_admin", {
        user_email: promoteEmail.trim()
      });

      if (error) throw error;

      toast({
        title: "User promoted!",
        description: `${promoteEmail} is now an admin`
      });
      
      setPromoteEmail("");
      fetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error promoting user",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPromoting(null);
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

      // Track technique approval
      if (approve) {
        trackEvent('technique_approved', {
          technique_id: techniqueId,
          admin_user_id: user.id
        });
      }

      toast({
        title: approve ? "Technique approved" : "Technique rejected",
        description: approve
          ? "The technique is now visible in the global library."
          : "The submission has been rejected.",
      });

      setSelectedTechnique(null);
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

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Admin Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              User Roles
            </TabsTrigger>
            <TabsTrigger value="techniques" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Techniques
              {pendingTechniques.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingTechniques.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* User Roles Tab */}
          <TabsContent value="roles" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Promote User to Admin
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="promote-email">User Email</Label>
                  <Input
                    id="promote-email"
                    type="email"
                    placeholder="user@example.com"
                    value={promoteEmail}
                    onChange={(e) => setPromoteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePromoteUser()}
                  />
                </div>
                <Button 
                  onClick={handlePromoteUser} 
                  disabled={!!promoting}
                  className="w-full"
                >
                  {promoting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Make Admin
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Current Admins ({users.length})
              </h3>
              
              {users.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search admins..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              <ScrollArea className="h-[150px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {users.length === 0 ? "No admins found" : "No matching admins"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} className="p-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {user.name || "Unnamed"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Techniques Tab */}
          <TabsContent value="techniques" className="mt-4">
            <ScrollArea className="h-[400px]">
              {loadingTechniques ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedTechnique ? (
                // Detail View
                <div className="space-y-4 pr-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTechnique(null)}
                    className="mb-2"
                  >
                    ← Back to list
                  </Button>
                  
                  <div>
                    <h4 className="font-semibold text-lg">{selectedTechnique.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{selectedTechnique.tradition}</Badge>
                      <span className="text-sm text-muted-foreground">
                        by {selectedTechnique.submitter_name}
                      </span>
                    </div>
                  </div>

                  {selectedTechnique.origin_story && (
                    <div>
                      <h4 className="font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedTechnique.origin_story}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-1">Instructions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedTechnique.instructions}
                    </p>
                  </div>

                  {selectedTechnique.lineage_info && (
                    <div>
                      <h4 className="font-medium mb-1">Source/Lineage</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedTechnique.lineage_info}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={() => handleApproval(selectedTechnique.id, false)}
                      disabled={processing}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApproval(selectedTechnique.id, true)}
                      disabled={processing}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              ) : pendingTechniques.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending submissions</p>
                </div>
              ) : (
                // List View
                <div className="space-y-2 pr-2">
                  {pendingTechniques.map((technique) => (
                    <Card key={technique.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-medium truncate">{technique.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">
                                {technique.tradition}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {technique.submitter_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {technique.origin_story || technique.instructions}
                        </p>

                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleApproval(technique.id, false)}
                            disabled={processing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTechnique(technique)}
                            className="flex-1"
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproval(technique.id, true)}
                            disabled={processing}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
