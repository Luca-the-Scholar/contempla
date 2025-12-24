import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const handleSchema = z
  .string()
  .min(3, "Handle must be at least 3 characters")
  .max(30, "Handle must be 30 characters or less")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed");

interface HandlePromptDialogProps {
  open: boolean;
  userId: string;
  onComplete: () => void;
}

export function HandlePromptDialog({ open, userId, onComplete }: HandlePromptDialogProps) {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedHandle = handle.trim().toLowerCase();
    
    // Validate handle format
    const result = handleSchema.safeParse(trimmedHandle);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Check if handle is already taken
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", trimmedHandle)
        .neq("id", userId)
        .maybeSingle();

      if (existing) {
        setError("This handle is already taken");
        setLoading(false);
        return;
      }

      // Upsert the profile with the new handle (handles case where profile might not exist)
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ 
          id: userId, 
          handle: trimmedHandle,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id' 
        });

      if (upsertError) throw upsertError;

      toast({ title: "Handle set successfully!" });
      onComplete();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to set handle",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Choose your handle</DialogTitle>
          <DialogDescription>
            Pick a unique handle so friends can find you. You can change this later in settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                placeholder="yourhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="flex-1"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={loading}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={loading || !handle.trim()}
              className="flex-1"
            >
              {loading ? "Saving..." : "Set Handle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
