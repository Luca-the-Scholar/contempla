import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { CommunityView } from "@/components/views/CommunityView";
import { LibraryView } from "@/components/views/LibraryView";
import { HistoryView } from "@/components/views/HistoryView";
import { SettingsView } from "@/components/views/SettingsView";
import { TimerView } from "@/components/views/TimerView";

type ViewType = 'community' | 'library' | 'history' | 'settings' | 'timer';

const Index = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as ViewType) || 'timer';
  const [activeView, setActiveView] = useState<ViewType>(initialTab);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  // Handle deep link tab changes
  useEffect(() => {
    const tab = searchParams.get('tab') as ViewType;
    if (tab && ['community', 'library', 'history', 'settings', 'timer'].includes(tab)) {
      setActiveView(tab);
    }
  }, [searchParams]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

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
