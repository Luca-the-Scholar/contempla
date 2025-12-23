import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

// Build redirect URLs for OAuth
// On native: Use Supabase callback with ?next= to bounce back to app via deep link
// On web: Just redirect to the auth page
const getRedirectUrl = () => {
  const isNative = Capacitor.isNativePlatform();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (isNative) {
    // After OAuth, Supabase will redirect to /auth?native_oauth=1#tokens
    // Auth.tsx will detect this and bounce to contempla://auth/callback#tokens
    return `${supabaseUrl}/auth/v1/callback?next=/auth?native_oauth=1`;
  }
  
  return `${window.location.origin}/auth`;
};

export function OAuthButtons() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // On native: Listen for app resume after OAuth and check session
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkSessionOnResume = async () => {
      if (!loading) return;
      
      console.log('[OAuth] Browser closed or app resumed, checking session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[OAuth] Session check error:', error);
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('[OAuth] Session detected after OAuth:', session.user.email);
        setLoading(false);
        // Session exists - auth state listener in Auth.tsx will handle navigation
      } else {
        console.log('[OAuth] No session found after browser closed');
        setLoading(false);
      }
    };

    // Listen for browser finished (user closed or OAuth completed)
    const browserListener = Browser.addListener('browserFinished', () => {
      console.log('[OAuth] Browser finished event');
      checkSessionOnResume();
    });

    // Also listen for app state changes as backup
    const appListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && loading) {
        console.log('[OAuth] App became active while loading');
        checkSessionOnResume();
      }
    });

    return () => {
      browserListener.then(l => l.remove());
      appListener.then(l => l.remove());
    };
  }, [loading]);

  const handleGoogleOAuth = async () => {
    setLoading(true);
    
    try {
      const isNative = Capacitor.isNativePlatform();

      console.log('[OAuth] Starting Google OAuth flow', { 
        isNative, 
        redirectTo: SUPABASE_CALLBACK_URL,
        platform: Capacitor.getPlatform()
      });

      const redirectTo = getRedirectUrl();
      
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
        console.log('[OAuth] Opening in system browser for native platform');
        await Browser.open({ 
          url: data.url,
          presentationStyle: 'popover',
        });
        // Don't set loading to false here - wait for browser close event
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
