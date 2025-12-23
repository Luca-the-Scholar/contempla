import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

// For iOS: Use the Lovable preview URL which actually exists and can handle the redirect
// The Auth page will detect OAuth tokens and redirect back to the app via deep link
const getRedirectUrl = () => {
  if (Capacitor.isNativePlatform()) {
    // Use the Lovable preview URL - it exists and will handle the OAuth callback
    // The Auth page there will redirect to the app via deep link
    return `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback`;
  }
  // For web, use current origin
  return `${window.location.origin}/auth`;
};

export function OAuthButtons() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Listen for app returning from browser OAuth on native
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let checkingSession = false;

    // Check session and trigger auth state update
    const checkSessionOnResume = async () => {
      if (checkingSession) return;
      checkingSession = true;
      
      console.log('[OAuth] Checking session on app resume...');
      try {
        // Force refresh session from server to pick up OAuth tokens
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[OAuth] Error getting session:', error);
        } else if (session) {
          console.log('[OAuth] Session found after OAuth:', session.user?.id);
          setLoading(false);
          // Session exists - the Auth page's onAuthStateChange will handle navigation
          // But we also need to trigger a refresh to ensure the state updates
          await supabase.auth.refreshSession();
        } else {
          console.log('[OAuth] No session found after resume');
        }
      } catch (err) {
        console.error('[OAuth] Exception checking session:', err);
      } finally {
        checkingSession = false;
        setLoading(false);
      }
    };

    // Listen for browser closed event (iOS returns control to app)
    const handleBrowserFinished = () => {
      console.log('[OAuth] Browser finished event');
      // Delay slightly to allow any pending auth to complete
      setTimeout(checkSessionOnResume, 500);
    };

    // Also listen for app resume (covers more cases)
    const handleAppStateChange = (state: { isActive: boolean }) => {
      console.log('[OAuth] App state changed:', state);
      if (state.isActive && loading) {
        // App became active while we were waiting for OAuth
        setTimeout(checkSessionOnResume, 500);
      }
    };

    // Listen for deep link OAuth callback
    const handleUrlOpen = async (event: { url: string }) => {
      console.log('[OAuth] URL opened:', event.url);
      if (event.url.includes('auth/callback') || event.url.includes('access_token')) {
        console.log('[OAuth] OAuth callback detected, checking session...');
        setTimeout(checkSessionOnResume, 100);
      }
    };

    Browser.addListener('browserFinished', handleBrowserFinished);
    App.addListener('appStateChange', handleAppStateChange);
    App.addListener('appUrlOpen', handleUrlOpen);

    return () => {
      Browser.removeAllListeners();
      App.removeAllListeners();
    };
  }, [loading]);

  const handleGoogleOAuth = async () => {
    setLoading(true);
    
    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = getRedirectUrl();

      console.log('[OAuth] Starting Google OAuth flow', { 
        isNative, 
        redirectTo,
        platform: Capacitor.getPlatform()
      });

      // Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[OAuth] signInWithOAuth error:', error);
        throw error;
      }

      if (!data?.url) {
        console.error('[OAuth] No OAuth URL returned');
        throw new Error('Failed to get OAuth URL');
      }

      console.log('[OAuth] Got OAuth URL:', data.url);

      if (isNative) {
        // On iOS/Android, open in system browser
        // After OAuth completes, Supabase will redirect back
        // We'll detect session on app resume
        console.log('[OAuth] Opening in system browser for native platform');
        await Browser.open({ 
          url: data.url,
          presentationStyle: 'popover',
        });
      } else {
        // On web, just redirect normally
        console.log('[OAuth] Redirecting in browser');
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('[OAuth] Exception during OAuth:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 bg-background/50"
      onClick={handleGoogleOAuth}
      disabled={loading}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {loading ? "Connecting..." : "Continue with Google"}
    </Button>
  );
}
