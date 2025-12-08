import { Users, Library, Calendar, Timer, Settings } from "lucide-react";

interface BottomNavProps {
  activeView: 'community' | 'library' | 'history' | 'settings' | 'timer';
  onViewChange: (view: 'community' | 'library' | 'history' | 'settings' | 'timer') => void;
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/98 to-background/95 backdrop-blur-xl border-t border-border/50 z-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-2 py-2 gap-1">
          <button
            onClick={() => onViewChange('community')}
            className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-200 min-w-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'community'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">Community</span>
          </button>

          <button
            onClick={() => onViewChange('library')}
            className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-200 min-w-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'library'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
            }`}
          >
            <Library className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">Library</span>
          </button>

          {/* Emphasized timer button with glow */}
          <button
            onClick={() => onViewChange('timer')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-2xl transition-all duration-200 min-w-[70px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeView === 'timer'
                ? 'bg-accent text-accent-foreground scale-105 shadow-glow-orange-md'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] shadow-glow-sm hover:shadow-glow-md'
            }`}
          >
            <Timer className="w-6 h-6" />
            <span className="text-[11px] font-bold leading-tight">Timer</span>
          </button>

          <button
            onClick={() => onViewChange('history')}
            className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-200 min-w-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'history'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">History</span>
          </button>

          <button
            onClick={() => onViewChange('settings')}
            className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-200 min-w-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'settings'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
