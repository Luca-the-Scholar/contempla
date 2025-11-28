import { useState, useEffect } from 'react';

const SPOTIFY_ENABLED_KEY = 'spotifyEnabled';
const SPOTIFY_PLAYLIST_KEY = 'spotifyPlaylistUrl';

export function useSpotify() {
  const [enabled, setEnabled] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');

  useEffect(() => {
    const storedEnabled = localStorage.getItem(SPOTIFY_ENABLED_KEY);
    if (storedEnabled !== null) setEnabled(storedEnabled === 'true');
    
    const storedPlaylist = localStorage.getItem(SPOTIFY_PLAYLIST_KEY);
    if (storedPlaylist) setPlaylistUrl(storedPlaylist);
  }, []);

  const setSpotifyEnabled = (value: boolean) => {
    setEnabled(value);
    localStorage.setItem(SPOTIFY_ENABLED_KEY, String(value));
  };

  const setSpotifyPlaylistUrl = (url: string) => {
    setPlaylistUrl(url);
    localStorage.setItem(SPOTIFY_PLAYLIST_KEY, url);
  };

  const extractPlaylistId = (url: string): string | null => {
    // Handle various Spotify URL formats
    // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
    // spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
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
      // Try opening the URL directly if it's a valid Spotify URL
      if (playlistUrl.includes('spotify.com') || playlistUrl.startsWith('spotify:')) {
        window.open(playlistUrl, '_blank');
        return true;
      }
      return false;
    }

    // Open Spotify playlist - this works across devices
    // On mobile, it will open the Spotify app if installed
    // On desktop, it will open in browser
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
    setSpotifyEnabled,
    setSpotifyPlaylistUrl,
    openPlaylist,
    isValidPlaylistUrl,
  };
}
