import { User, Library, BarChart3, Timer, Settings, Users } from "lucide-react";

interface BottomNavProps {
  activeView: 'community' | 'library' | 'stats' | 'settings' | 'timer';
  onViewChange: (view: 'community' | 'library' | 'stats' | 'settings' | 'timer') => void;
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-50">
      <div className="relative max-w-2xl mx-auto">
        {/* Centered prominent timer button */}
        <button
          onClick={() => onViewChange('timer')}
          className={`absolute left-1/2 -translate-x-1/2 -top-8 flex flex-col items-center gap-1 px-6 py-4 rounded-2xl transition-all shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeView === 'timer'
              ? 'bg-primary text-primary-foreground scale-110'
              : 'bg-primary/90 text-primary-foreground hover:bg-primary hover:scale-105'
          }`}
        >
          <Timer className="w-7 h-7" />
          <span className="text-xs font-bold">Timer</span>
        </button>

        {/* Four horizontal nav items */}
        <div className="flex items-center justify-around px-4 py-3">
          <button
            onClick={() => onViewChange('community')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'community'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-6 h-6" />
            <span className="text-xs font-medium">Community</span>
          </button>

          <button
            onClick={() => onViewChange('library')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'library'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="w-6 h-6" />
            <span className="text-xs font-medium">Library</span>
          </button>

          {/* Spacer for centered timer */}
          <div className="w-16" />

          <button
            onClick={() => onViewChange('stats')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'stats'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Stats</span>
          </button>

          <button
            onClick={() => onViewChange('settings')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeView === 'settings'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
