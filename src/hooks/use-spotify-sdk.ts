import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  addListener: (event: string, callback: (data: any) => void) => void;
  removeListener: (event: string, callback?: (data: any) => void) => void;
}

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export function useSpotifySDK() {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
  
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const sdkLoadedRef = useRef(false);

  // Load tokens from database
  const loadTokens = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('spotify_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;

    const tokenData: SpotifyTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    };

    setTokens(tokenData);
    setIsConnected(true);
    return tokenData;
  }, []);

  // Save tokens to database
  const saveTokens = useCallback(async (tokenData: SpotifyTokens) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('spotify_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save tokens:', error);
    } else {
      setTokens(tokenData);
      setIsConnected(true);
    }
  }, []);

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens?.refresh_token) return null;

    try {
      const { data, error } = await supabase.functions.invoke('spotify-refresh', {
        body: { refresh_token: tokens.refresh_token },
      });

      if (error || !data.access_token) {
        console.error('Token refresh failed:', error || data);
        setIsConnected(false);
        setTokens(null);
        return null;
      }

      await saveTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      });

      return data.access_token;
    } catch (err) {
      console.error('Refresh error:', err);
      return null;
    }
  }, [tokens, saveTokens]);

  // Get valid access token (refresh if needed)
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) {
      const loaded = await loadTokens();
      if (!loaded) return null;
      return getValidToken();
    }

    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const bufferMs = 60000; // 1 minute buffer

    if (expiresAt.getTime() - now.getTime() < bufferMs) {
      return refreshAccessToken();
    }

    return tokens.access_token;
  }, [tokens, loadTokens, refreshAccessToken]);

  // Initialize Spotify auth
  const connect = useCallback(async () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      // Use edge function redirect
      const redirectUri = `https://zlrgwfvqhxpfnuvxpyce.supabase.co/functions/v1/spotify-callback`;
      const state = encodeURIComponent(window.location.origin);
      
      // Fetch client ID from a simple endpoint or use hardcoded approach
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      
      // We need to get the client ID - let's create a simple edge function
      setError('Redirecting to Spotify...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in first');
        return;
      }

      // Get client ID from secrets via edge function
      console.log('Calling spotify-auth-url edge function...');
      const { data, error } = await supabase.functions.invoke('spotify-auth-url', {
        body: {},
      });
      
      console.log('Edge function response:', { data, error });
      
      if (error) {
        console.error('Edge function error:', error);
        setError(`Failed to get auth URL: ${error.message || JSON.stringify(error)}`);
        return;
      }
      
      if (!data?.url) {
        setError('Failed to get auth URL: No URL returned');
        return;
      }
      
      window.location.href = data.url;
      return;
    }

    const redirectUri = `https://zlrgwfvqhxpfnuvxpyce.supabase.co/functions/v1/spotify-callback`;
    const state = encodeURIComponent(window.location.origin);
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', SPOTIFY_SCOPES);
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  }, []);

  // Disconnect from Spotify
  const disconnect = useCallback(async () => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('spotify_tokens')
        .delete()
        .eq('user_id', user.id);
    }

    setTokens(null);
    setIsConnected(false);
    setIsReady(false);
    setDeviceId(null);
  }, []);

  // Load SDK
  const loadSDK = useCallback(() => {
    if (sdkLoadedRef.current) return;
    
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    sdkLoadedRef.current = true;
  }, []);

  // Initialize player
  const initializePlayer = useCallback(async () => {
    const token = await getValidToken();
    if (!token || !window.Spotify) return;

    const player = new window.Spotify.Player({
      name: 'Contempla Meditation',
      getOAuthToken: async (cb) => {
        const validToken = await getValidToken();
        if (validToken) cb(validToken);
      },
      volume: 0.5,
    });

    player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Spotify player ready, device ID:', device_id);
      setDeviceId(device_id);
      setIsReady(true);
    });

    player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device has gone offline:', device_id);
      setIsReady(false);
    });

    player.addListener('player_state_changed', (state: any) => {
      if (!state) return;
      setIsPlaying(!state.paused);
    });

    player.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error('Init error:', message);
      setError(message);
    });

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('Auth error:', message);
      setError(message);
      setIsConnected(false);
    });

    player.addListener('account_error', ({ message }: { message: string }) => {
      console.error('Account error:', message);
      setError('Spotify Premium required');
    });

    const connected = await player.connect();
    if (connected) {
      playerRef.current = player;
    }
  }, [getValidToken]);

  // Play a playlist
  const playPlaylist = useCallback(async (playlistUri: string) => {
    const token = await getValidToken();
    if (!token || !deviceId) {
      console.error('No token or device ID');
      return false;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: playlistUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Play failed:', response.status, errorData);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Play error:', err);
      return false;
    }
  }, [getValidToken, deviceId]);

  // Pause playback
  const pause = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  // Resume playback
  const resume = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.resume();
    }
  }, []);

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    if (playerRef.current) {
      await playerRef.current.setVolume(volume);
    }
  }, []);

  // Extract playlist URI from URL
  const getPlaylistUri = useCallback((url: string): string | null => {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match) {
      return `spotify:playlist:${match[1]}`;
    }
    if (url.startsWith('spotify:playlist:')) {
      return url;
    }
    return null;
  }, []);

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('spotify_success');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresAt = params.get('expires_at');
    const spotifyError = params.get('spotify_error');

    if (spotifyError) {
      setError(`Spotify error: ${spotifyError}`);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (success && accessToken && refreshToken && expiresAt) {
      saveTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [saveTokens]);

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Set up SDK ready callback
  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('Spotify SDK ready');
      if (tokens) {
        initializePlayer();
      }
    };

    return () => {
      window.onSpotifyWebPlaybackSDKReady = () => {};
    };
  }, [tokens, initializePlayer]);

  // Load SDK and initialize when connected
  useEffect(() => {
    if (isConnected && tokens) {
      loadSDK();
      if (window.Spotify) {
        initializePlayer();
      }
    }
  }, [isConnected, tokens, loadSDK, initializePlayer]);

  return {
    isConnected,
    isReady,
    isPlaying,
    error,
    connect,
    disconnect,
    playPlaylist,
    pause,
    resume,
    setVolume,
    getPlaylistUri,
  };
}
