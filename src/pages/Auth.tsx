import { useState, useEffect } from "react";
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
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});
  const [showHandlePrompt, setShowHandlePrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Ensure user profile exists - creates one if missing (for OAuth users where trigger may have failed)
  const ensureProfileExists = async (userId: string, userMetadata: Record<string, any> | undefined) => {
    console.log('[Auth] Ensuring profile exists for user:', userId);
    console.log('[Auth] User metadata:', userMetadata);
    
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
    // Google OAuth provides: full_name, name, email, avatar_url, etc.
    // Email/password signup provides: name (set by us)
    const displayName = userMetadata?.full_name || userMetadata?.name || userMetadata?.email?.split('@')[0] || 'User';
    
    console.log('[Auth] Creating new profile with name:', displayName);
    
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, name: displayName })
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
  };

  // Check for OAuth callback and handle missing handles
  useEffect(() => {
    const checkSession = async () => {
      console.log('[Auth] Checking session on mount...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Auth] Error getting session:', sessionError);
        return;
      }

      if (session?.user) {
        console.log('[Auth] Found existing session for user:', session.user.id);
        console.log('[Auth] User provider:', session.user.app_metadata?.provider);
        
        // Ensure profile exists
        const profile = await ensureProfileExists(session.user.id, session.user.user_metadata);

        if (!profile?.handle) {
          console.log('[Auth] User has no handle, showing prompt');
          setPendingUserId(session.user.id);
          setShowHandlePrompt(true);
        } else {
          console.log('[Auth] User has handle, navigating to home');
          navigate("/");
        }
      } else {
        console.log('[Auth] No session found');
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, session?.user?.id);
        
        if (event === "SIGNED_IN" && session?.user) {
          console.log('[Auth] User signed in:', session.user.id);
          console.log('[Auth] Provider:', session.user.app_metadata?.provider);
          console.log('[Auth] User metadata:', session.user.user_metadata);
          
          // Ensure profile exists
          const profile = await ensureProfileExists(session.user.id, session.user.user_metadata);

          if (!profile?.handle) {
            console.log('[Auth] User has no handle after sign in, showing prompt');
            setPendingUserId(session.user.id);
            setShowHandlePrompt(true);
          } else {
            console.log('[Auth] User has handle, navigating to home');
            navigate("/");
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

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
        navigate("/");
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
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
