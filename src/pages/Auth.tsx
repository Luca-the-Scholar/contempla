import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Compass } from "lucide-react";
import { z } from "zod";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { HandlePromptDialog } from "@/components/auth/HandlePromptDialog";
import { AuthDebugPanel } from "@/components/auth/AuthDebugPanel";
import { Session, User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be 50 characters or less"),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showReturnToApp, setShowReturnToApp] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});
  const [showHandlePrompt, setShowHandlePrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Visual debug overlay state (kept separate from auth logic)
  const [debugHref, setDebugHref] = useState(() => window.location.href);
  const [debugHash, setDebugHash] = useState(() => window.location.hash);
  const [debugHasAccessToken, setDebugHasAccessToken] = useState(() => window.location.hash.includes("access_token"));
  const [debugSession, setDebugSession] = useState<Session | null>(null);
  const [debugIsNative] = useState(() => Capacitor.isNativePlatform());
  const [debugLastCheckedAt, setDebugLastCheckedAt] = useState(() => new Date().toISOString());
  const [debugLastError, setDebugLastError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Ensure user profile exists - creates one if missing (for OAuth users where trigger may have failed)
  const ensureProfileExists = useCallback(async (userId: string, userMetadata: Record<string, any> | undefined) => {
    console.log('[Auth] Ensuring profile exists for user:', userId);
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, handle, name")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Auth] Error fetching profile:', fetchError);
    }

    if (existingProfile) {
      console.log('[Auth] Profile exists:', existingProfile);
      return existingProfile;
    }

    // Profile doesn't exist - create it
    const name = userMetadata?.full_name || userMetadata?.name || userMetadata?.email?.split('@')[0] || 'User';
    
    console.log('[Auth] Creating new profile with name:', name);
    
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, name })
      .select("id, handle, name")
      .single();

    if (insertError) {
      console.error('[Auth] Error creating profile:', insertError);
      // Profile might have been created by trigger in the meantime - try to fetch again
      const { data: retryProfile } = await supabase
        .from("profiles")
        .select("id, handle, name")
        .eq("id", userId)
        .maybeSingle();
      
      if (retryProfile) {
        console.log('[Auth] Profile found on retry:', retryProfile);
        return retryProfile;
      }
      return null;
    }

    console.log('[Auth] Created new profile:', newProfile);
    return newProfile;
  }, []);

  // Handle authenticated user - check profile and navigate
  const handleAuthenticatedUser = useCallback(async (user: User) => {
    console.log('[Auth] Handling authenticated user:', user.id);
    
    const profile = await ensureProfileExists(user.id, user.user_metadata);

    if (!profile?.handle) {
      console.log('[Auth] User has no handle, showing prompt');
      setPendingUserId(user.id);
      setShowHandlePrompt(true);
    } else {
      console.log('[Auth] User has handle, navigating to home');
      navigate("/", { replace: true });
    }
  }, [ensureProfileExists, navigate]);

  // Force re-check session (called by OAuthButtons when session is detected)
  const handleOAuthSessionDetected = useCallback(async () => {
    console.log('[Auth] OAuth session detected callback triggered');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[Auth] Handling OAuth session for user:', session.user.id);
        await handleAuthenticatedUser(session.user);
      }
    } catch (err) {
      console.error('[Auth] Error handling OAuth session:', err);
    }
  }, [handleAuthenticatedUser]);

  // Check for existing session and set up auth listener
  useEffect(() => {
    let mounted = true;

    // Handle OAuth callback - extract tokens from URL hash and set session manually
    // This is critical for iOS native OAuth where cookies don't transfer to the app
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;

      if (!hash || (!hash.includes("access_token") && !hash.includes("error"))) {
        console.log("[Auth][OAuth] No OAuth hash detected on load");
        return false;
      }

      console.log("[Auth][OAuth] OAuth hash detected on load", {
        hashLength: hash.length,
        hasAccessToken: hash.includes("access_token"),
        hasRefreshToken: hash.includes("refresh_token"),
        hasError: hash.includes("error"),
      });

      // Parse the hash to extract tokens
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      console.log("[Auth][OAuth] Parsed hash params", {
        keys: Array.from(params.keys()),
        accessTokenPresent: !!accessToken,
        accessTokenLength: accessToken?.length ?? 0,
        refreshTokenPresent: !!refreshToken,
        refreshTokenLength: refreshToken?.length ?? 0,
      });

      // Clean up the URL hash (don't log tokens into the URL bar/history)
      window.history.replaceState(null, "", window.location.pathname);

      if (error) {
        console.error("[Auth][OAuth] OAuth error in hash:", { error, errorDescription });
        toast({
          title: "Sign in failed",
          description: errorDescription || error,
          variant: "destructive",
        });
        if (mounted) setCheckingSession(false);
        return true;
      }

      if (!accessToken || !refreshToken) {
        console.error("[Auth][OAuth] Missing tokens in hash - cannot set session", {
          accessTokenPresent: !!accessToken,
          refreshTokenPresent: !!refreshToken,
        });
        if (mounted) setCheckingSession(false);
        return true;
      }

      console.log("[Auth][OAuth] Calling supabase.auth.setSession(...)");

      try {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        console.log("[Auth][OAuth] setSession result", {
          hasError: !!sessionError,
          userId: data?.user?.id,
          hasSession: !!data?.session,
        });

        if (sessionError) {
          console.error("[Auth][OAuth] setSession error:", sessionError);
          toast({
            title: "Sign in failed",
            description: sessionError.message,
            variant: "destructive",
          });
          if (mounted) setCheckingSession(false);
          return true;
        }

        // Confirm the session is now stored
        let confirmedSession: Session | null = data.session ?? null;
        for (let i = 0; i < 5; i++) {
          const { data: getSessionData, error: getSessionError } = await supabase.auth.getSession();
          console.log("[Auth][OAuth] getSession confirm attempt", {
            attempt: i + 1,
            hasError: !!getSessionError,
            userId: getSessionData.session?.user?.id,
          });

          if (getSessionError) {
            console.error("[Auth][OAuth] getSession confirm error:", getSessionError);
          }

          if (getSessionData.session?.user) {
            confirmedSession = getSessionData.session;
            break;
          }

          await new Promise((r) => setTimeout(r, 250));
        }

        if (!confirmedSession?.user) {
          console.error("[Auth][OAuth] Session not confirmed after setSession");
          if (mounted) setCheckingSession(false);
          return true;
        }

        console.log("[Auth][OAuth] Session confirmed for user", {
          userId: confirmedSession.user.id,
          email: confirmedSession.user.email,
        });

        // Try to close the native in-app browser (SFSafariViewController)
        const isNative = Capacitor.isNativePlatform();
        console.log("[Auth][OAuth] Attempting Browser.close()", {
          isNative,
          platform: Capacitor.getPlatform?.(),
        });

        if (isNative) {
          // If close doesn't happen (or isn't supported), reveal a deep-link fallback.
          const fallbackTimer = window.setTimeout(() => {
            console.log("[Auth][OAuth] Browser may not have closed - showing Return to App fallback");
            if (mounted) setShowReturnToApp(true);
          }, 3000);

          try {
            await Browser.close();
            console.log("[Auth][OAuth] Browser.close() succeeded");
          } catch (e) {
            console.warn("[Auth][OAuth] Browser.close() failed", e);
            if (mounted) setShowReturnToApp(true);
          } finally {
            // If the page remains open, the fallback will still be shown after 3s.
            // If it did close, none of this matters.
            window.clearTimeout(fallbackTimer);
          }
        }

        // Navigate to the main app
        if (mounted) {
          await handleAuthenticatedUser(confirmedSession.user);
        }

        return true;
      } catch (err) {
        console.error("[Auth][OAuth] Exception during setSession:", err);
        if (mounted) setCheckingSession(false);
        return true;
      }
    };

    // Set up auth state listener (synchronous callback - no async!)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] Auth state changed:', event, 'user:', session?.user?.id);
        
        // Handle sign in events - defer async work with setTimeout to avoid deadlock
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user && mounted) {
          console.log('[Auth] Auth event with session, handling user...');
          setTimeout(() => {
            if (mounted) {
              handleAuthenticatedUser(session.user);
            }
          }, 0);
        }
        
        // Also handle INITIAL_SESSION for OAuth redirects
        if (event === "INITIAL_SESSION" && session?.user && mounted) {
          console.log('[Auth] INITIAL_SESSION with user detected');
          setTimeout(() => {
            if (mounted) {
              handleAuthenticatedUser(session.user);
            }
          }, 0);
        }
      }
    );

    // Check for existing session
    const checkInitialSession = async () => {
      console.log('[Auth] Checking initial session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
          if (mounted) setCheckingSession(false);
          return;
        }

        if (session?.user && mounted) {
          console.log('[Auth] Found existing session for user:', session.user.id);
          await handleAuthenticatedUser(session.user);
        } else {
          console.log('[Auth] No existing session found');
        }
      } catch (err) {
        console.error('[Auth] Exception checking session:', err);
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    // Handle OAuth callback first (if present in URL) - this returns early if handled
    const initAuth = async () => {
      const wasOAuthCallback = await handleOAuthCallback();
      if (wasOAuthCallback) {
        // OAuth was handled, don't check for existing session
        return;
      }
      await checkInitialSession();
    };
    
    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthenticatedUser, toast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate inputs
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: typeof errors = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as keyof typeof errors] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }
      } else {
        const result = signupSchema.safeParse({ email, password, displayName: displayName.trim() });
        if (!result.success) {
          const fieldErrors: typeof errors = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as keyof typeof errors] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        // Navigation handled by onAuthStateChange
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: displayName.trim(),
            },
          },
        });
        if (error) throw error;
        toast({ title: "Account created! Welcome to your practice." });
        // Navigation handled by onAuthStateChange
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen pt-28 flex flex-col items-center justify-center gap-6">
        <AuthDebugPanel
          href={debugHref}
          hash={debugHash}
          hasAccessToken={debugHasAccessToken}
          isLoggedIn={!!debugSession?.user}
          userEmail={debugSession?.user?.email ?? null}
          isNative={debugIsNative}
          lastCheckedAt={debugLastCheckedAt}
          lastError={debugLastError}
        />

        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-md animate-pulse">
          <Compass className="w-8 h-8 text-white" />
        </div>

        {showReturnToApp && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              If this screen didn’t close, tap below to return to the app.
            </p>
            <Button asChild variant="accent">
              <a href="contempla://">Return to App</a>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              background: i % 5 === 0 ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
              opacity: Math.random() * 0.5 + 0.3,
              animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: Math.random() * 2 + "s",
            }}
          />
        ))}
      </div>

      <Card className="w-full max-w-md p-8 space-y-6 backdrop-blur-sm border-primary/20">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-md">
              <Compass className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Contempla
          </h1>
          <p className="text-muted-foreground">Contemplative Practice with Friends</p>
        </div>

        {showReturnToApp && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              If you’re stuck in the browser, tap below to return to the app.
            </p>
            <Button asChild variant="accent" className="w-full">
              <a href="contempla://">Return to App</a>
            </Button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <Input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-background/50"
                aria-invalid={!!errors.displayName}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName}</p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-1">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/50"
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
          <Button
            type="submit"
            variant="accent"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* OAuth buttons */}
        <OAuthButtons />

        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>

      {/* Handle prompt for new OAuth users */}
      {pendingUserId && (
        <HandlePromptDialog
          open={showHandlePrompt}
          userId={pendingUserId}
          onComplete={() => {
            setShowHandlePrompt(false);
            setPendingUserId(null);
            navigate("/", { replace: true });
          }}
        />
      )}
    </div>
  );
}
