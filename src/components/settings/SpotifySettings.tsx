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

interface SpotifyPlaylist {
  id: string;
  name: string;
  image: string | null;
  tracks_total: number;
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

  const isConnected = !!settings?.access_token;

  const getEdgeFunctionErrorDetails = async (err: any): Promise<string | null> => {
    const ctx = err?.context as Response | undefined;
    if (!ctx || typeof ctx.status !== 'number') return null;

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
        const msg = parsed?.error || parsed?.message || bodyText;
        return `HTTP ${status}: ${msg}`;
      } catch {
        return `HTTP ${status}: ${bodyText}`;
      }
    }

    return `HTTP ${status}`;
  };

  useEffect(() => {
    loadSettings();

    const onSpotifyOauthCode = (event: Event) => {
      const codeFromEvent = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (!codeFromEvent) return;

      console.log('[Spotify] Received code from deep link event, processing...');

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
      console.log('[Spotify] Found code from deep link storage, processing...');
      // Clear the stored values
      sessionStorage.removeItem('spotify_oauth_code');
      sessionStorage.removeItem('spotify_oauth_from_deeplink');
      handleOAuthCallback(deepLinkCode, true);
    } else if (spotifyCode) {
      console.log('[Spotify] Found code in URL params, processing...');
      handleOAuthCallback(spotifyCode, false);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (isSpotifyCallback) {
      // Callback came but no code - might be an error or the code is coming
      console.log('[Spotify] Spotify callback detected but no code yet');
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

      console.log('[Spotify] OAuth callback payload:', JSON.stringify(payload));
      console.log('[Spotify] Processing OAuth callback', { isNative, isFromDeepLink, redirectUri });

      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Spotify connected!" });
      await loadSettings();
    } catch (error: any) {
      const details = await getEdgeFunctionErrorDetails(error);
      console.error('[Spotify] OAuth callback error:', error, { details });
      toast({
        title: "Failed to connect Spotify",
        description: details || error.message,
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

      console.log('[Spotify] Connect payload:', JSON.stringify(payload));
      console.log('[Spotify] Starting OAuth flow', { isNative, redirectUri });

      // Use query params for GET-style action (authorize returns a URL)
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        method: 'GET',
        body: payload,
        headers: {
          'x-spotify-action': 'authorize',
          'x-spotify-redirect-uri': redirectUri,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.log('[Spotify] Got OAuth URL:', data.url);

      if (isNative) {
        console.log('[Spotify] Opening in system browser for native platform');
        await Browser.open({ 
          url: data.url,
          presentationStyle: 'popover',
        });
      } else {
        console.log('[Spotify] Redirecting in browser');
        window.location.href = data.url;
      }
    } catch (error: any) {
      const details = await getEdgeFunctionErrorDetails(error);
      console.error('[Spotify] Connect error:', error, { details });
      toast({
        title: "Failed to connect",
        description: details || error.message,
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Standardized payload for disconnect action
      const payload = { action: 'disconnect' };
      console.log('[Spotify] Disconnect payload:', JSON.stringify(payload));

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
        await refreshToken();
      }

      // Standardized payload for playlists
      const payload = { action: 'list' };
      console.log('[Spotify] Load playlists payload:', JSON.stringify(payload));

      const { data, error } = await supabase.functions.invoke('spotify-playlists', {
        body: payload,
      });
      
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('expired')) {
          await refreshToken();
          // Retry with same standardized format
          const retryPayload = { action: 'list' };
          console.log('[Spotify] Retry playlists payload:', JSON.stringify(retryPayload));
          const retryData = await supabase.functions.invoke('spotify-playlists', {
            body: retryPayload,
          });
          if (retryData.data?.playlists) {
            setPlaylists(retryData.data.playlists);
            return;
          }
        }
        throw new Error(data.error);
      }

      setPlaylists(data.playlists || []);
    } catch (error: any) {
      console.error('Error loading playlists:', error);
      toast({
        title: "Failed to load playlists",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const refreshToken = async () => {
    // Standardized payload for refresh action
    const payload = { action: 'refresh' };
    console.log('[Spotify] Refresh token payload:', JSON.stringify(payload));

    const { data, error } = await supabase.functions.invoke('spotify-auth', {
      body: payload,
    });
    if (error || data?.error) {
      throw new Error('Failed to refresh token');
    }
    await loadSettings();
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1DB954]" />
              <span className="text-sm text-muted-foreground">Connected to Spotify</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              <X className="w-4 h-4 mr-1" />
              Disconnect
            </Button>
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
                      {playlist.name} ({playlist.tracks_total} tracks)
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

          {settings?.play_on_meditation_start && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Make sure Spotify is open on a device for playback to work
            </p>
          )}
        </>
      )}
    </div>
  );
}
