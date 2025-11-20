import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TechniqueCard } from "@/components/TechniqueCard";
import { TutorialModal } from "@/components/TutorialModal";
import { Plus, HelpCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Technique {
  id: string;
  name: string;
  instructions: string;
  tradition: string;
  is_favorite: boolean;
  mastery?: number;
}

export default function Library() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    instructions: "",
    tradition: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchTechniques();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTechniques = async () => {
    try {
      const { data: techniquesData, error: techError } = await supabase
        .from("techniques")
        .select("*")
        .order("tradition", { ascending: true });

      if (techError) throw techError;

      const { data: masteryData } = await supabase
        .from("mastery_scores")
        .select("technique_id, mastery_score");

      const masteryMap = new Map(
        masteryData?.map((m) => [m.technique_id, m.mastery_score]) || []
      );

      const techniquesWithMastery = techniquesData?.map((t) => ({
        ...t,
        mastery: masteryMap.get(t.id) || 0,
      })) || [];

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("techniques").insert({
        user_id: user.id,
        ...formData,
      });

      if (error) throw error;

      toast({ title: "Technique added to your constellation!" });
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

  const handleToggleFavorite = async (techniqueId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("techniques")
        .update({ is_favorite: !currentFavorite })
        .eq("id", techniqueId);

      if (error) throw error;
      fetchTechniques();
    } catch (error: any) {
      toast({
        title: "Error updating favorite",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const groupedTechniques = techniques.reduce((acc, technique) => {
    if (!acc[technique.tradition]) {
      acc[technique.tradition] = [];
    }
    acc[technique.tradition].push(technique);
    return acc;
  }, {} as Record<string, Technique[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading your constellation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Your Practice</h1>
            <p className="text-muted-foreground">
              {techniques.length} {techniques.length === 1 ? "technique" : "techniques"} in your constellation
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTutorialOpen(true)}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {techniques.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Your constellation is empty. Add your first technique to begin.
            </p>
            <Button
              className="glow-button"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Technique
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTechniques).map(([tradition, techs]) => (
              <section key={tradition}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {tradition}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {techs.map((technique) => (
                    <TechniqueCard
                      key={technique.id}
                      technique={technique}
                      onToggleFavorite={() =>
                        handleToggleFavorite(technique.id, technique.is_favorite)
                      }
                      onViewDetails={() => setSelectedTechnique(technique)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Floating Add Button */}
        {techniques.length > 0 && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg glow-button flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Add Technique Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
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
            <Button type="submit" className="w-full glow-button">
              Add to Constellation
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Technique Details Modal */}
      <Dialog
        open={!!selectedTechnique}
        onOpenChange={() => setSelectedTechnique(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTechnique?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tradition</p>
              <p>{selectedTechnique?.tradition}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Instructions</p>
              <p className="text-sm whitespace-pre-wrap">
                {selectedTechnique?.instructions}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TutorialModal open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </div>
  );
}