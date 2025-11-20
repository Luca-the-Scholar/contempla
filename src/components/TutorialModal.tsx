import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";

interface TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialModal({ open, onOpenChange }: TutorialModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Mastery System Guide
          </DialogTitle>
          <DialogDescription>
            Understanding how your practice evolves over time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <section>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Building Mastery
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Each technique has its own mastery bar (0-100%)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Sessions under 5 minutes don't increase mastery</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Sessions 5-39 minutes give moderate mastery gains</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Sessions 40+ minutes give maximum mastery gains</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
              Daily Decay
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Techniques decay slowly if not practiced daily</span>
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Practicing ANY technique slows decay for all techniques</span>
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>This encourages consistent practice across your repertoire</span>
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Mastery never goes below 0%</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Constellation Metaphor</h3>
            <p className="text-sm text-muted-foreground">
              Think of your techniques as stars in a constellation. As you practice,
              each star grows brighter (higher mastery). Without practice, stars
              dim over time. Your entire constellation benefits from regular
              practice, even if you focus on different stars each session.
            </p>
          </section>

          <section className="bg-card p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Pro Tip</h3>
            <p className="text-sm text-muted-foreground">
              Start with 1-3 techniques you want to master. Build consistency
              before expanding your practice. Quality over quantity leads to
              deeper mastery.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}