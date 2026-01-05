import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Timer, Library, Calendar, Users, Settings } from "lucide-react";

const WELCOME_STEPS = [
  {
    icon: Timer,
    title: "Meditation Timer",
    description: "Select a technique, set your duration, and meditate. Play music from Spotify for ambient sound.",
  },
  {
    icon: Library,
    title: "Technique Library",
    description: "Create custom meditation techniques or browse the global community library for inspiration.",
  },
  {
    icon: Calendar,
    title: "Track Progress",
    description: "Build streaks, view your practice calendar, and see your meditation journey unfold.",
  },
  {
    icon: Users,
    title: "Practice Together",
    description: "Connect with friends, share sessions, and support each other's meditation practice.",
  },
  {
    icon: Settings,
    title: "Customize Everything",
    description: "Set daily reminders, connect Spotify, adjust privacy, and personalize your experience.",
  },
];

export function WelcomeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState(0);
  const current = WELCOME_STEPS[step];
  const Icon = current.icon;

  const handleClose = () => {
    setStep(0); // Reset to first step for next time
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center">{current.title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 py-4">
          {WELCOME_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2 flex-1 justify-end">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-muted-foreground"
            >
              Skip
            </Button>

            {step < WELCOME_STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button onClick={handleClose}>
                Get Started
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
