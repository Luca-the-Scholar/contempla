import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export function EdgeFunctionTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const testEdgeFunction = async () => {
    setLoading(true);
    setResult(null);

    // Log environment info
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log("=== Edge Function Test ===");
    console.log("Supabase URL:", supabaseUrl);
    
    // Log current auth session
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("Auth session state:", {
      hasSession: !!sessionData.session,
      userId: sessionData.session?.user?.id,
      expiresAt: sessionData.session?.expires_at,
    });

    try {
      console.log("Invoking ping edge function...");
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('ping', {
        body: { test: true, clientTimestamp: new Date().toISOString() },
      });
      
      const duration = Date.now() - startTime;
      console.log(`Response received in ${duration}ms`);

      if (error) {
        console.error("Edge function error:", error);
        const errorResult: TestResult = {
          success: false,
          error: `${error.message || 'Unknown error'}${error.context ? ` - ${JSON.stringify(error.context)}` : ''}`,
          timestamp: new Date().toISOString(),
        };
        setResult(errorResult);
        toast({
          title: "Edge function failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("Edge function success:", data);
        const successResult: TestResult = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
        setResult(successResult);
        toast({
          title: "Edge function reachable!",
          description: `Response received in ${duration}ms`,
        });
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      const errorResult: TestResult = {
        success: false,
        error: err.message || String(err),
        timestamp: new Date().toISOString(),
      };
      setResult(errorResult);
      toast({
        title: "Connection failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={testEdgeFunction} 
        disabled={loading}
        className="w-full"
        variant="outline"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 mr-2" />
            Test Edge Function Connection
          </>
        )}
      </Button>

      {result && (
        <Card className={`p-4 ${result.success ? 'border-green-500/50 bg-green-500/10' : 'border-destructive/50 bg-destructive/10'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <Wifi className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <WifiOff className="w-5 h-5 text-destructive mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${result.success ? 'text-green-500' : 'text-destructive'}`}>
                {result.success ? 'Connection Successful' : 'Connection Failed'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.timestamp}
              </p>
              
              {result.success && result.data && (
                <div className="mt-3 p-2 bg-background/50 rounded text-xs font-mono overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {!result.success && result.error && (
                <div className="mt-3 p-2 bg-background/50 rounded text-xs">
                  <p className="font-medium text-destructive">Error Details:</p>
                  <p className="text-muted-foreground mt-1 break-all">{result.error}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
