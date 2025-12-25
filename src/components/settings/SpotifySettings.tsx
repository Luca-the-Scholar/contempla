import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, Loader2, ExternalLink, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { openSpotifyApp, startSpotifyPlayback } from "@/hooks/use-spotify";

interface SpotifyPlaylist {
  id: string;
  name: string;
  image: string | null;
  tracks_total: number;
  owner_name: string | null;
}

interface SpotifySettingsData {
  access_token: string | null;
  selected_playlist_id: string | null;
  selected_playlist_name: string | null;
  play_on_meditation_start: boolean;
  token_expires_at: string | null;
}

export function SpotifySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [settings, setSettings] = useState<SpotifySettingsData | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [testingAutoplay, setTestingAutoplay] = useState(false);
  const [testResult, setTestResult] = useState<{code?: string; devices?: any[]; reqId?: string} | null>(null);

  const isConnected = !!settings?.access_token;

  const getEdgeFunctionErrorDetails = async (err: any): Promise<{ message: string; reqId?: string }> => {
    const ctx = err?.context as Response | undefined;
    let reqId: string | undefined;
    
    if (!ctx || typeof ctx.status !== 'number') {
      return { message: err?.message || 'Unknown error' };
    }

    const status = ctx.status;
    let bodyText = '';

    try {
      bodyText = await ctx.text();
    } catch {
      // ignore
    }

    if (bodyText) {
      try {
        const parsed = JSON.parse(bodyText);
        reqId = parsed?.reqId;
        const msg = parsed?.error || parsed?.message || bodyText;
        return { message: `HTTP ${status}: ${msg}`, reqId };
      } catch {
        return { message: `HTTP ${status}: ${bodyText}`, reqId };
      }
    }

    return { message: `HTTP ${status}`, reqId };
  };

  useEffect(() => {
    loadSettings();

    const onSpotifyOauthCode = (event: Event) => {
      const codeFromEvent = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (!codeFromEvent) return;

      sessionStorage.removeItem('spotify_oauth_code');
      sessionStorage.removeItem('spotify_oauth_from_deeplink');

      handleOAuthCallback(codeFromEvent, true);
    };

    window.addEventListener('spotify-oauth-code', onSpotifyOauthCode as EventListener);

    // Handle OAuth callback from web (query param) or native deep link (sessionStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyCode = urlParams.get('spotify_code') || urlParams.get('code');
    const isSpotifyCallback = urlParams.get('spotify_callback') === 'true';

    // Check for code in sessionStorage (set by deep link handler on native)
    const deepLinkCode = sessionStorage.getItem('spotify_oauth_code');
    const isFromDeepLink = sessionStorage.getItem('spotify_oauth_from_deeplink') === 'true';

    if (deepLinkCode && isFromDeepLink) {
      // Clear the stored values
      sessionStorage.removeItem('spotify_oauth_code');
      sessionStorage.removeItem('spotify_oauth_from_deeplink');
      handleOAuthCallback(deepLinkCode, true);
    } else if (spotifyCode) {
      handleOAuthCallback(spotifyCode, false);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('spotify-oauth-code', onSpotifyOauthCode as EventListener);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadPlaylists();
    }
  }, [isConnected]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('spotify_settings')
        .select('access_token, selected_playlist_id, selected_playlist_name, play_on_meditation_start, token_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setSettings(data as SpotifySettingsData | null);
    } catch (error: any) {
      console.error('Error loading Spotify settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, isFromDeepLink: boolean = false) => {
    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Must match the redirect_uri used in the initial authorize request
      const isNative = Capacitor.isNativePlatform();
      const redirectUri = isNative || isFromDeepLink
        ? "contempla://spotify/callback"
        : `${window.location.origin}/settings`;

      // Standardized payload - explicit JSON object
      const payload = {
        code,
        redirect_uri: redirectUri,
        user_id: user.id,
      };

      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Spotify connected!" });
      await loadSettings();
    } catch (error: any) {
      const { message: details, reqId } = await getEdgeFunctionErrorDetails(error);
      toast({
        title: "Failed to connect Spotify",
        description: reqId ? `${details} (ref: ${reqId.slice(0, 8)})` : details,
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const isNative = Capacitor.isNativePlatform();
      
      // For native, use deep link callback; for web, use origin URL
      const redirectUri = isNative 
        ? "contempla://spotify/callback"
        : `${window.location.origin}/settings`;

      // Standardized payload for authorize action
      const payload = {
        action: 'authorize',
        redirect_uri: redirectUri,
      };

      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (isNative) {
        await Browser.open({
          url: data.url,
          presentationStyle: 'popover',
        });
      } else {
        window.location.href = data.url;
      }
    } catch (error: any) {
      const { message: details, reqId } = await getEdgeFunctionErrorDetails(error);
      toast({
        title: "Failed to connect",
        description: reqId ? `${details} (ref: ${reqId.slice(0, 8)})` : details,
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const payload = { action: 'disconnect' };

      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: payload,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSettings(null);
      setPlaylists([]);
      toast({ title: "Spotify disconnected" });
    } catch (error: any) {
      toast({
        title: "Failed to disconnect",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      // Check if token needs refresh
      if (settings?.token_expires_at && new Date(settings.token_expires_at) < new Date()) {
        console.log('[SpotifySettings] Token expired, refreshing...');
        await refreshToken();
      }

      const payload = { action: 'list' };

      const { data, error } = await supabase.functions.invoke('spotify-playlists', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) {
        throw new Error(data.error);
      }

      setPlaylists(data.playlists || []);
    } catch (error: any) {
      console.error('[SpotifySettings] Error loading playlists:', error);
      const { message: details, reqId } = await getEdgeFunctionErrorDetails(error);
      toast({
        title: "Failed to load playlists",
        description: reqId ? `${details} (ref: ${reqId.slice(0, 8)})` : details,
        variant: "destructive",
      });
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const refreshToken = async () => {
    const payload = { action: 'refresh' };

    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: payload,
    });
    if (error) {
      console.error('[SpotifySettings] Token refresh edge function error:', error);
      throw error;
    }
    if (data?.error) {
      console.error('[SpotifySettings] Token refresh failed:', data);
      throw new Error(data.error);
    }
    await loadSettings();
  };

  const handleTestTokenRefresh = async () => {
    try {
      toast({
        title: "Testing token refresh...",
        description: "This may take a moment",
      });
      await refreshToken();
      toast({
        title: "Token refresh successful!",
        description: "Your Spotify connection is working correctly",
      });
    } catch (error: any) {
      const { message: details, reqId } = await getEdgeFunctionErrorDetails(error);
      toast({
        title: "Token refresh failed",
        description: reqId ? `${details} (ref: ${reqId.slice(0, 8)})` : details,
        variant: "destructive",
      });
    }
  };

  const handlePlaylistChange = async (playlistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const playlist = playlists.find(p => p.id === playlistId);
      
      const { error } = await supabase
        .from('spotify_settings')
        .update({
          selected_playlist_id: playlistId,
          selected_playlist_name: playlist?.name || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? {
        ...prev,
        selected_playlist_id: playlistId,
        selected_playlist_name: playlist?.name || null,
      } : null);

      toast({ title: "Playlist selected" });
    } catch (error: any) {
      toast({
        title: "Failed to save playlist",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTogglePlayOnStart = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('spotify_settings')
        .update({ play_on_meditation_start: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, play_on_meditation_start: enabled } : null);
      toast({ title: enabled ? "Spotify will play when meditation starts" : "Spotify autoplay disabled" });
    } catch (error: any) {
      toast({
        title: "Failed to update setting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTestAutoplay = async () => {
    setTestingAutoplay(true);
    setTestResult(null);

    try {
      const result = await startSpotifyPlayback();

      if (result.success) {
        setTestResult({ code: 'SUCCESS' });
        toast({
          title: "Autoplay test successful!",
          description: "Spotify playback started. You should hear music playing now.",
          variant: "default",
        });
      } else {
        setTestResult({
          code: result.code,
          reqId: result.reqId,
        });

        // Show specific error message
        let title = "Autoplay test failed";
        let description = result.error || "Could not start playback";

        if (result.code === 'NO_ACTIVE_DEVICE') {
          title = "No Spotify device detected";
          description = "Open Spotify on any device and ensure you're signed into the same account.";
        } else if (result.code === 'PREMIUM_REQUIRED') {
          title = "Spotify Premium required";
          description = "Remote playback control requires Spotify Premium.";
        } else if (result.code === 'TOKEN_EXPIRED') {
          title = "Connection expired";
          description = "Please disconnect and reconnect your Spotify account.";
        }

        toast({
          title,
          description,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setTestingAutoplay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Connect your Spotify account to play music during meditation.
          </p>
          <Button 
            onClick={handleConnect} 
            disabled={connecting}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Music className="w-4 h-4 mr-2" />
            )}
            Connect Spotify
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1DB954] shrink-0" />
              <span className="text-sm text-muted-foreground">Connected to Spotify</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="text-xs px-2" onClick={handleTestTokenRefresh}>
                Test Connection
              </Button>
              <Button variant="ghost" size="sm" className="text-xs px-2" onClick={handleDisconnect}>
                <X className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Playlist</Label>
            <p className="text-sm text-muted-foreground">
              Select a playlist to play during meditation
            </p>
            {loadingPlaylists ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading playlists...
              </div>
            ) : (
              <Select 
                value={settings?.selected_playlist_id || ""} 
                onValueChange={handlePlaylistChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      <div className="flex flex-col items-start">
                        <span>{playlist.name}</span>
                        {playlist.owner_name && (
                          <span className="text-xs text-muted-foreground">
                            by {playlist.owner_name} • {playlist.tracks_total} tracks
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label htmlFor="play-on-start">Play when meditation starts</Label>
              <p className="text-sm text-muted-foreground">
                Automatically start Spotify when you begin a session
              </p>
            </div>
            <Switch
              id="play-on-start"
              checked={settings?.play_on_meditation_start || false}
              onCheckedChange={handleTogglePlayOnStart}
              disabled={!settings?.selected_playlist_id}
            />
          </div>

          {settings?.play_on_meditation_start && settings?.selected_playlist_id && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                ✨ Spotify will start automatically when you begin meditation. If Spotify isn't already active, Contempla will open it briefly to activate playback (you'll need to swipe back). Requires Spotify Premium.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleTestAutoplay}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  disabled={testingAutoplay}
                >
                  {testingAutoplay ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Autoplay'
                  )}
                </Button>

                <Button
                  onClick={() => openSpotifyApp()}
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs bg-[#1DB954] hover:bg-[#1ed760] text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Spotify
                </Button>
              </div>

              {testResult && (
                <div className="rounded-md bg-muted p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="text-xs space-y-1">
                      <div className="font-medium">Test Result:</div>
                      <div className="text-muted-foreground">
                        Code: <span className="font-mono">{testResult.code || 'SUCCESS'}</span>
                      </div>
                      {testResult.devices && testResult.devices.length > 0 && (
                        <div className="text-muted-foreground">
                          Devices: {testResult.devices.map((d: any) => d.name).join(', ')}
                        </div>
                      )}
                      {testResult.reqId && (
                        <div className="text-muted-foreground">
                          Request ID: <span className="font-mono text-xs">{testResult.reqId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
