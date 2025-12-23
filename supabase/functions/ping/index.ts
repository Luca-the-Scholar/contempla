import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.log(`[${requestId}] Ping request received at ${timestamp}`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);

  // Log all headers
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log(`[${requestId}] Headers:`, JSON.stringify(headers, null, 2));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight response`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to read body if present
    let body = null;
    try {
      const text = await req.text();
      if (text) {
        body = text;
        console.log(`[${requestId}] Body:`, body);
      }
    } catch (e) {
      console.log(`[${requestId}] No body or failed to read body`);
    }

    const response = {
      success: true,
      requestId,
      timestamp,
      message: "Ping successful - edge function is reachable",
    };

    console.log(`[${requestId}] Sending success response`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Error:`, errorMessage);

    return new Response(JSON.stringify({
      success: false,
      requestId,
      timestamp,
      error: errorMessage,
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
