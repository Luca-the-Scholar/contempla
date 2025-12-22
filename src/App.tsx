import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import { initDeepLinking, DEEP_LINK_ROUTES } from "./lib/deep-linking";
import { requestNotificationPermission } from "./lib/notifications";
import { Capacitor } from "@capacitor/core";
import { AppContainer } from "./components/layout/AppContainer";

const queryClient = new QueryClient();

// Component to handle deep linking with router context
function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize deep linking
    initDeepLinking((path, params) => {
      console.log('[DeepLinkHandler] Received path:', path, 'params:', params?.toString());
      
      // Map deep link paths to app routes
      const routeMap: Record<string, string> = {
        [DEEP_LINK_ROUTES.TIMER]: '/?tab=timer',
        [DEEP_LINK_ROUTES.HISTORY]: '/?tab=history',
        [DEEP_LINK_ROUTES.LIBRARY]: '/?tab=library',
        [DEEP_LINK_ROUTES.COMMUNITY]: '/?tab=community',
        [DEEP_LINK_ROUTES.SETTINGS]: '/?tab=settings',
        '/': '/',
        '/auth/callback': '/auth', // Google OAuth callback goes to auth page
        '/spotify/callback': '/?tab=settings', // Spotify OAuth callback goes to settings
      };

      let route = routeMap[path] || '/auth'; // Default to auth for unknown paths
      
      // Preserve query params for callbacks
      if (params && params.toString()) {
        route += (route.includes('?') ? '&' : '?') + params.toString();
      }
      
      console.log('[DeepLinkHandler] Navigating to:', route);
      navigate(route);
    });

    // Request notification permission on native platforms
    if (Capacitor.isNativePlatform()) {
      requestNotificationPermission();
    }
  }, [navigate]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DeepLinkHandler />
        <AppContainer>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="*" element={<Auth />} />
          </Routes>
        </AppContainer>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
