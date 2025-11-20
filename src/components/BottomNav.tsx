import { Home, Library, BarChart3, Timer } from "lucide-react";

interface BottomNavProps {
  activeView: 'home' | 'library' | 'data' | 'timer';
  onViewChange: (view: 'home' | 'library' | 'data' | 'timer') => void;
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="flex items-end justify-around px-4 py-2 max-w-2xl mx-auto">
        <button
          onClick={() => onViewChange('library')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
            activeView === 'library'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Library className="w-6 h-6" />
          <span className="text-xs font-medium">Library</span>
        </button>

        <button
          onClick={() => onViewChange('home')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
            activeView === 'home'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Home</span>
        </button>

        <button
          onClick={() => onViewChange('data')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
            activeView === 'data'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-xs font-medium">Data</span>
        </button>

        <button
          onClick={() => onViewChange('timer')}
          className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl -mb-2 transition-all shadow-lg ${
            activeView === 'timer'
              ? 'bg-primary text-primary-foreground scale-110'
              : 'bg-primary/20 text-primary hover:bg-primary/30'
          }`}
        >
          <Timer className="w-7 h-7" />
          <span className="text-xs font-bold">Timer</span>
        </button>
      </div>
    </nav>
  );
}
