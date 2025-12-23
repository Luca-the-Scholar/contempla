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
import { Session, User } from "@supabase/supabase-js";

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
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});
  const [showHandlePrompt, setShowHandlePrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
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

    // Check if this is an OAuth callback with tokens in the URL hash
    // This handles the case where user returns from OAuth in browser
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (hash && (hash.includes('access_token') || hash.includes('error'))) {
        console.log('[Auth] OAuth callback detected in URL hash');
        
        // Parse the hash to extract tokens
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        
        if (error) {
          console.error('[Auth] OAuth error:', error, errorDescription);
          toast({
            title: "Sign in failed",
            description: errorDescription || error,
            variant: "destructive",
          });
          window.history.replaceState(null, '', window.location.pathname);
          if (mounted) setCheckingSession(false);
          return;
        }
        
        if (accessToken && refreshToken) {
          console.log('[Auth] Setting session from OAuth callback tokens...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.error('[Auth] Error setting session:', sessionError);
            toast({
              title: "Sign in failed",
              description: sessionError.message,
              variant: "destructive",
            });
          } else if (data.user && mounted) {
            console.log('[Auth] Session set successfully from tokens:', data.user.id);
            // Handle the authenticated user directly - don't rely on event
            await handleAuthenticatedUser(data.user);
          }
        }
        
        // Clean up the URL hash
        window.history.replaceState(null, '', window.location.pathname);
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

    // Handle OAuth callback first (if present in URL)
    handleOAuthCallback();

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

    checkInitialSession();

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-md animate-pulse">
          <Compass className="w-8 h-8 text-white" />
        </div>
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
          <p className="text-muted-foreground">
            Contemplative Practice with Friends
          </p>
        </div>

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
        <OAuthButtons onSessionDetected={handleOAuthSessionDetected} />

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
