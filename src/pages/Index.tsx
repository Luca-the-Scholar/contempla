import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { ProfileView } from "@/components/views/ProfileView";
import { LibraryView } from "@/components/views/LibraryView";
import { StatsView } from "@/components/views/StatsView";
import { SettingsView } from "@/components/views/SettingsView";
import { TimerView } from "@/components/views/TimerView";

type ViewType = 'profile' | 'library' | 'stats' | 'settings' | 'timer';

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>('timer');
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  return (
    <>
      {activeView === 'profile' && <ProfileView />}
      {activeView === 'library' && <LibraryView />}
      {activeView === 'stats' && <StatsView />}
      {activeView === 'settings' && <SettingsView />}
      {activeView === 'timer' && <TimerView />}
      
      <BottomNav activeView={activeView} onViewChange={setActiveView} />
    </>
  );
};

export default Index;