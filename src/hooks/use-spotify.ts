import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SPOTIFY_ENABLED_KEY = 'spotifyEnabled';
const MAX_RECENT_PLAYLISTS = 5;

export function useSpotify() {
  const [enabled, setEnabled] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [recentPlaylists, setRecentPlaylists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load playlist URL and recent playlists from database
  const loadPlaylistData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_preferences')
        .eq('id', user.id)
        .single();

      if (profile?.profile_preferences) {
        const prefs = profile.profile_preferences as any;
        if (prefs.spotifyPlaylistUrl) {
          setPlaylistUrl(prefs.spotifyPlaylistUrl);
        }
        if (prefs.recentSpotifyPlaylists) {
          setRecentPlaylists(prefs.recentSpotifyPlaylists);
        }
      }
    } catch (error) {
      console.error('Error loading playlist data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedEnabled = localStorage.getItem(SPOTIFY_ENABLED_KEY);
    if (storedEnabled !== null) setEnabled(storedEnabled === 'true');
    
    loadPlaylistData();
  }, [loadPlaylistData]);

  const setSpotifyEnabled = (value: boolean) => {
    setEnabled(value);
    localStorage.setItem(SPOTIFY_ENABLED_KEY, String(value));
  };

  const setSpotifyPlaylistUrl = async (url: string) => {
    setPlaylistUrl(url);
    
    if (!url) return;
    
    // Update recent playlists (add to front, remove duplicates, keep max 5)
    const updatedRecent = [url, ...recentPlaylists.filter(p => p !== url)].slice(0, MAX_RECENT_PLAYLISTS);
    setRecentPlaylists(updatedRecent);
    
    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_preferences')
        .eq('id', user.id)
        .single();

      const currentPrefs = (profile?.profile_preferences as any) || {};
      const updatedPrefs = { 
        ...currentPrefs, 
        spotifyPlaylistUrl: url,
        recentSpotifyPlaylists: updatedRecent,
      };

      await supabase
        .from('profiles')
        .update({ profile_preferences: updatedPrefs })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error saving playlist URL:', error);
    }
  };

  const extractPlaylistId = (url: string): string | null => {
    const webMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (webMatch) return webMatch[1];
    
    const uriMatch = url.match(/playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) return uriMatch[1];
    
    return null;
  };

  const openPlaylist = () => {
    if (!playlistUrl) return false;
    
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      if (playlistUrl.includes('spotify.com') || playlistUrl.startsWith('spotify:')) {
        window.open(playlistUrl, '_blank');
        return true;
      }
      return false;
    }

    const spotifyWebUrl = `https://open.spotify.com/playlist/${playlistId}`;
    window.open(spotifyWebUrl, '_blank');
    return true;
  };

  const isValidPlaylistUrl = (url: string): boolean => {
    if (!url) return false;
    return url.includes('spotify.com/playlist/') || url.includes('spotify:playlist:');
  };

  return {
    enabled,
    playlistUrl,
    recentPlaylists,
    loading,
    setSpotifyEnabled,
    setSpotifyPlaylistUrl,
    openPlaylist,
    isValidPlaylistUrl,
  };
}
