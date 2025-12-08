import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Music, BookOpen, Bell, Heart, Download, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumModal({ open, onOpenChange }: PremiumModalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribeClick = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("subscription_interest").insert({
          user_id: user.id,
          action_type: "modal_subscribe_click",
          metadata: { price: "$5.99/month", timestamp: new Date().toISOString() }
        });
      }
      setShowConfirmation(true);
    } catch (error) {
      console.error("Error tracking subscription interest:", error);
      setShowConfirmation(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const handleConfirmationDismiss = () => {
    setShowConfirmation(false);
  };

  const features = [
    { icon: Music, text: "Spotify integration" },
    { icon: BookOpen, text: "10+ techniques in your personal library" },
    { icon: Bell, text: "15+ meditation chimes and sounds" },
    { icon: Heart, text: "Health tracking integration" },
    { icon: Download, text: "Data exporting" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-accent" />
            <span className="text-gradient">Contempla+</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {showConfirmation && (
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-accent/10 border border-accent/30 space-y-3 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-accent" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">You're on the list!</h3>
                <p className="text-sm text-muted-foreground">
                  Contempla+ is still in development. We'll notify you as soon as it's released!
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleConfirmationDismiss}>
                Dismiss
              </Button>
            </div>
          )}

          <p className="text-foreground font-medium">Contempla+ unlocks:</p>
          
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-foreground">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {!showConfirmation && (
          <Button 
            onClick={handleSubscribeClick}
            disabled={loading}
            className="w-full min-h-[52px] text-lg font-semibold bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
          >
            {loading ? "..." : "Subscribe for $5.99/month"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
