import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { CommunityView } from "@/components/views/CommunityView";
import { LibraryView } from "@/components/views/LibraryView";
import { HistoryView } from "@/components/views/HistoryView";
import { SettingsView } from "@/components/views/SettingsView";
import { TimerView } from "@/components/views/TimerView";
import { Compass } from "lucide-react";

type ViewType = 'community' | 'library' | 'history' | 'settings' | 'timer';

const Index = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as ViewType) || 'timer';
  const [activeView, setActiveView] = useState<ViewType>(initialTab);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Auth check with listener for session changes
  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST (synchronous - no async in callback!)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Index] Auth state changed:', event, !!session);
        
        if (!mounted) return;
        
        if (session) {
          setIsAuthenticated(true);
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          navigate("/auth", { replace: true });
        }
      }
    );

    // THEN check for existing session
    const checkSession = async () => {
      console.log('[Index] Checking session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;
      
      if (session) {
        console.log('[Index] Session found');
        setIsAuthenticated(true);
      } else {
        console.log('[Index] No session, redirecting to auth');
        setIsAuthenticated(false);
        navigate("/auth", { replace: true });
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Handle deep link tab changes
  useEffect(() => {
    const tab = searchParams.get('tab') as ViewType;
    if (tab && ['community', 'library', 'history', 'settings', 'timer'].includes(tab)) {
      setActiveView(tab);
    }
  }, [searchParams]);

  // Force views to remount when switching by using timestamp as key
  const [libraryKey, setLibraryKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  
  const handleViewChange = (view: ViewType) => {
    if (view === 'library') {
      setLibraryKey(prev => prev + 1);
    }
    if (view === 'history') {
      setHistoryKey(prev => prev + 1);
    }
    setActiveView(view);
  };

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-md animate-pulse">
          <Compass className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {activeView === 'community' && <CommunityView />}
      {activeView === 'library' && <LibraryView key={libraryKey} />}
      {activeView === 'history' && <HistoryView key={historyKey} />}
      {activeView === 'settings' && <SettingsView />}
      {activeView === 'timer' && <TimerView />}
      
      <BottomNav activeView={activeView} onViewChange={handleViewChange} />
    </>
  );
};

export default Index;
