import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Technique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  tags: string[];
  is_favorite: boolean;
  mastery?: number;
  lastPracticed?: string;
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
          // Sort by most recently practiced
          if (!a.lastPracticed && !b.lastPracticed) return 0;
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

  const handleAddTechnique = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("techniques").insert({
        user_id: user.id,
        ...formData,
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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleDeleteTechnique = async (techniqueId: string) => {
    try {
      const { error } = await supabase
        .from("techniques")
        .delete()
        .eq("id", techniqueId);

      if (error) throw error;

      toast({ title: "Technique deleted" });
      fetchTechniques();
    } catch (error: any) {
      toast({
        title: "Error deleting technique",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatLastPracticed = (lastPracticed?: string) => {
    if (!lastPracticed) return "Never practiced";
    const date = new Date(lastPracticed);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Less than an hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading techniques...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-sm text-muted-foreground">
            {techniques.length} {techniques.length === 1 ? "technique" : "techniques"}
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {techniques.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Your library is empty. Add your first technique.
            </p>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Technique
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {techniques.map((technique) => (
              <Card key={technique.id} className="p-4 hover:bg-accent/50 transition-colors relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteTechnique(technique.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{technique.name}</h3>
                    {technique.is_favorite && (
                      <Star className="w-4 h-4 fill-primary text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {technique.tradition}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatLastPracticed(technique.lastPracticed)}
                  </p>
                  {technique.tags && technique.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {technique.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-center pt-2 border-t border-border mt-3">
                    <div className="text-xl font-bold text-primary">
                      {technique.mastery?.toFixed(0) || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">mastery</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Technique</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTechnique} className="space-y-4">
            <Input
              placeholder="Technique Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <Textarea
              placeholder="How to practice this technique..."
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
              required
              rows={4}
            />
            <Input
              placeholder="Tradition or Community (e.g., Vipassana, Zen)"
              value={formData.tradition}
              onChange={(e) =>
                setFormData({ ...formData, tradition: e.target.value })
              }
              required
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">
              Add Technique
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
