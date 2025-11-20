import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { LibraryView } from "@/components/views/LibraryView";
import { HomeView } from "@/components/views/HomeView";
import { DataView } from "@/components/views/DataView";
import { TimerView } from "@/components/views/TimerView";

type ViewType = 'home' | 'library' | 'data' | 'timer';

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>('home');
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
      {activeView === 'library' && <LibraryView onClose={() => setActiveView('home')} />}
      {activeView === 'home' && <HomeView />}
      {activeView === 'data' && <DataView />}
      {activeView === 'timer' && <TimerView />}
      
      <BottomNav activeView={activeView} onViewChange={setActiveView} />
    </>
  );
};

export default Index;