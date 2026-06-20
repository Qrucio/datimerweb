import { useState, useEffect, useRef, useCallback } from 'react';
import { SecureStorage } from '../utils/security';
import { logger } from '../utils/logger';

// !IMPORTANT: Add VITE_SPOTIFY_CLIENT_ID to your .env file
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

const SCOPES = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
    "streaming",
    "user-modify-playback-state",
    "user-read-playback-state",
    "user-read-currently-playing"
];

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const REDIRECT_URI = "https://datimer.netlify.app/";

// --- PKCE Helpers ---
const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

// Load Spotify SDK script
const loadSpotifySDK = () => {
    return new Promise((resolve) => {
        if (window.Spotify) {
            resolve(window.Spotify);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            resolve(window.Spotify);
        };
    });
};

export const useSpotify = () => {
    // DEBUG: Check Client ID status
    useEffect(() => {
        const hasId = !!CLIENT_ID;
        console.log(`[Spotify] Client ID loaded: ${hasId}`);
        if (!hasId) console.warn("[Spotify] Missing VITE_SPOTIFY_CLIENT_ID environment variable");
    }, []);

    const [token, setToken] = useState("");
    const [playlists, setPlaylists] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidatingToken, setIsValidatingToken] = useState(true); // Add validation state

    // Playback state
    const [player, setPlayer] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    const playerRef = useRef(null);
    const progressInterval = useRef(null);

    // --- Helper: Clear all Spotify storage ---
    const clearSpotifyStorage = useCallback(() => {
        window.localStorage.removeItem("spotify_token");
        window.localStorage.removeItem("spotify_token_expiry");
        window.localStorage.removeItem("spotify_code_verifier");
        window.localStorage.removeItem("spotify_refresh_token");
    }, []);

    // --- Helper: Validate token by making API call ---
    const validateToken = useCallback(async (accessToken) => {
        try {
            const response = await fetch("https://api.spotify.com/v1/me", {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return response.ok; // Returns true if token is valid
        } catch (error) {
            logger.debug("[Spotify] Token validation failed", error);
            return false;
        }
    }, []);

    // --- Refresh Token Logic (stable reference with useCallback) ---
    const refreshAccessToken = useCallback(async () => {
        const refreshTokenEnc = window.localStorage.getItem("spotify_refresh_token");
        
        if (!refreshTokenEnc) {
            logger.debug("[Spotify] No refresh token available");
            return false;
        }

        const refreshToken = await SecureStorage.decrypt(refreshTokenEnc);
        
        if (!refreshToken || !CLIENT_ID) {
            logger.debug("[Spotify] Refresh token decrypt failed or no CLIENT_ID");
            return false;
        }

        try {
            logger.debug("[Spotify] Refreshing token...");
            const response = await fetch(TOKEN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            });

            const data = await response.json();
            
            if (data.access_token) {
                logger.debug("[Spotify] Token refreshed successfully");
                
                // Validate the new token before storing
                const isValid = await validateToken(data.access_token);
                if (!isValid) {
                    logger.debug("[Spotify] Newly refreshed token is invalid");
                    clearSpotifyStorage();
                    return false;
                }

                const encToken = await SecureStorage.encrypt(data.access_token);
                if (encToken) window.localStorage.setItem("spotify_token", encToken);
                
                if (data.refresh_token) {
                    const encRefresh = await SecureStorage.encrypt(data.refresh_token);
                    if (encRefresh) window.localStorage.setItem("spotify_refresh_token", encRefresh);
                }
                
                // Update expiry time (conservative: 55 minutes instead of 60)
                const expiryTime = Date.now() + (55 * 60 * 1000);
                window.localStorage.setItem("spotify_token_expiry", expiryTime.toString());
                
                setToken(data.access_token);
                return true;
            } else {
                logger.debug("[Spotify] Refresh failed - invalid response", data);
                
                // If refresh token is expired or invalid, clear everything
                if (data.error === 'invalid_grant') {
                    logger.debug("[Spotify] Refresh token expired or revoked");
                    clearSpotifyStorage();
                }
                return false;
            }
        } catch (error) {
            logger.debug("[Spotify] Refresh error", error);
            return false;
        }
    }, [validateToken, clearSpotifyStorage]);

    // --- Token Exchange and Restoration (runs on redirect back from Spotify and on page load) ---
    useEffect(() => {
        return; // SPOTIFY INTEGRATION TEMPORARILY DISABLED
        const initializeAuth = async () => {
            setIsValidatingToken(true);
            
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const storedVerifierEnc = window.localStorage.getItem('spotify_code_verifier');
            const storedVerifier = storedVerifierEnc ? await SecureStorage.decrypt(storedVerifierEnc) : null;

            // CASE 1: OAuth code present - exchange it for tokens (initial login)
            if (code && storedVerifier) {
                try {
                    logger.debug("[Spotify] Exchanging OAuth code for tokens");
                    const response = await fetch(TOKEN_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: CLIENT_ID,
                            grant_type: 'authorization_code',
                            code: code,
                            redirect_uri: REDIRECT_URI,
                            code_verifier: storedVerifier,
                        }),
                    });

                    const data = await response.json();

                    if (data.access_token) {
                        logger.debug("[Spotify] Token exchange successful");
                        
                        // Encrypt and store tokens
                        const encToken = await SecureStorage.encrypt(data.access_token);
                        if (encToken) window.localStorage.setItem("spotify_token", encToken);
                        
                        if (data.refresh_token) {
                            const encRefresh = await SecureStorage.encrypt(data.refresh_token);
                            if (encRefresh) window.localStorage.setItem("spotify_refresh_token", encRefresh);
                        }
                        
                        // Store token expiry time (conservative: 55 minutes instead of 60)
                        const expiryTime = Date.now() + (55 * 60 * 1000);
                        window.localStorage.setItem("spotify_token_expiry", expiryTime.toString());
                        
                        window.localStorage.removeItem('spotify_code_verifier');
                        setToken(data.access_token);
                        window.history.replaceState({}, document.title, "/");
                    } else {
                        console.error("[Spotify] Token exchange error:", data);
                        alert(`Spotify Login Failed: ${data.error_description || "Unknown Error"}`);
                    }
                } catch (error) {
                    console.error("[Spotify] Token exchange failed:", error);
                } finally {
                    setIsValidatingToken(false);
                }
                return;
            }

            // CASE 2: No OAuth code - try to restore existing session
            const existingTokenEnc = window.localStorage.getItem("spotify_token");
            const tokenExpiry = window.localStorage.getItem("spotify_token_expiry");
            
            if (!existingTokenEnc) {
                logger.debug("[Spotify] No stored token found");
                setIsValidatingToken(false);
                return;
            }

            const existingToken = await SecureStorage.decrypt(existingTokenEnc);
            
            if (!existingToken) {
                logger.debug("[Spotify] Token decryption failed");
                clearSpotifyStorage();
                setIsValidatingToken(false);
                return;
            }

            // Check expiry time
            const now = Date.now();
            const expiry = tokenExpiry ? parseInt(tokenExpiry) : 0;
            const isExpiringSoon = expiry && now >= (expiry - 10 * 60 * 1000); // 10 minutes buffer
            
            // STEP 1: Validate the token with Spotify API
            logger.debug("[Spotify] Validating stored token");
            const isValid = await validateToken(existingToken);
            
            if (isValid && !isExpiringSoon) {
                // Token is valid and not expiring soon - use it
                logger.debug("[Spotify] Token is valid, restoring session");
                setToken(existingToken);
                setIsValidatingToken(false);
                return;
            }
            
            if (isValid && isExpiringSoon) {
                // Token is valid but expiring soon - refresh proactively
                logger.debug("[Spotify] Token expiring soon, refreshing proactively");
                const refreshed = await refreshAccessToken();
                
                if (!refreshed) {
                    // Refresh failed, but current token still works
                    logger.debug("[Spotify] Refresh failed, but using current valid token");
                    setToken(existingToken);
                }
                setIsValidatingToken(false);
                return;
            }
            
            // STEP 2: Token is invalid - try to refresh
            logger.debug("[Spotify] Token invalid, attempting refresh");
            const refreshed = await refreshAccessToken();
            
            if (!refreshed) {
                // Refresh failed - clear everything
                logger.debug("[Spotify] Refresh failed, clearing session");
                clearSpotifyStorage();
            }
            
            setIsValidatingToken(false);
        };

        initializeAuth();
    }, [refreshAccessToken, validateToken, clearSpotifyStorage]);

    // --- Initialize Web Playback SDK ---
    useEffect(() => {
        return; // SPOTIFY INTEGRATION TEMPORARILY DISABLED
        if (!token) return;

        const initPlayer = async () => {
            await loadSpotifySDK();

            const spotifyPlayer = new window.Spotify.Player({
                name: 'altimer web player',
                getOAuthToken: cb => cb(token),
                volume: 0.5
            });

            // Error handling
            spotifyPlayer.addListener('initialization_error', ({ message }) => console.error('Init Error:', message));
            spotifyPlayer.addListener('authentication_error', ({ message }) => {
                console.error('Auth Error:', message);
                logout(); // Token might be expired
            });
            spotifyPlayer.addListener('account_error', ({ message }) => console.error('Account Error (Premium Required):', message));
            spotifyPlayer.addListener('playback_error', ({ message }) => console.error('Playback Error:', message));

            // Ready
            spotifyPlayer.addListener('ready', ({ device_id }) => {
                console.log('Spotify Player Ready with Device ID:', device_id);
                setDeviceId(device_id);
                setIsPlayerReady(true);
            });

            // Not Ready
            spotifyPlayer.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline:', device_id);
                setIsPlayerReady(false);
            });

            // Player state changed
            spotifyPlayer.addListener('player_state_changed', (state) => {
                if (!state) return;

                const track = state.track_window.current_track;
                setCurrentTrack({
                    name: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    albumArt: track.album.images[0]?.url,
                    uri: track.uri
                });
                setIsPlaying(!state.paused);
                setDuration(state.duration);
                setProgress(state.position);

                // Update Shuffle/Repeat state from SDK
                setIsShuffle(state.shuffle);
                // state.repeat_mode: 0 = off, 1 = context, 2 = track
                setRepeatMode(state.repeat_mode);
            });

            await spotifyPlayer.connect();
            playerRef.current = spotifyPlayer;
            setPlayer(spotifyPlayer);
        };

        initPlayer();

        return () => {
            if (playerRef.current) {
                playerRef.current.disconnect();
            }
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [token]);

    // --- Progress tracking ---
    useEffect(() => {
        return; // SPOTIFY INTEGRATION TEMPORARILY DISABLED
        if (isPlaying) {
            progressInterval.current = setInterval(() => {
                setProgress(prev => Math.min(prev + 1000, duration));
            }, 1000);
        } else {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        }

        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [isPlaying, duration]);

    // --- Login with PKCE ---
    const login = async () => {
        console.log("[Spotify] Login initiated");
        if (!CLIENT_ID) {
            console.error("[Spotify] Client ID is missing");
            alert("ERROR: VITE_SPOTIFY_CLIENT_ID is not set in your .env file!");
            return;
        }

        const codeVerifier = generateRandomString(64);
        const hashed = await sha256(codeVerifier);
        const codeChallenge = base64encode(hashed);

        const encVerifier = await SecureStorage.encrypt(codeVerifier);
        if (encVerifier) window.localStorage.setItem('spotify_code_verifier', encVerifier);

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            response_type: 'code',
            redirect_uri: REDIRECT_URI,
            scope: SCOPES.join(' '),
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            show_dialog: 'true'
        });

        window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
    };

    const logout = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.disconnect();
        }
        setToken("");
        setUserProfile(null);
        setPlaylists([]);
        setPlayer(null);
        setDeviceId(null);
        setCurrentTrack(null);
        setIsPlayerReady(false);
        clearSpotifyStorage();
    }, [clearSpotifyStorage]);

    const fetchPlaylists = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const profileRes = await fetch("https://api.spotify.com/v1/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const profile = await profileRes.json();
            setUserProfile(profile);

            // Increased limit to 50 to ensure more playlists load
            const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setPlaylists(data.items || []);
        } catch (error) {
            console.error("Spotify Fetch Error:", error);
            if (error.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed) fetchPlaylists(); // Retry once
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- Additional Controls ---
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: context, 2: track

    const toggleShuffle = async () => {
        if (!token) return;
        const newState = !isShuffle;
        try {
            await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newState}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsShuffle(newState);
        } catch (e) {
            console.error("Shuffle Error:", e);
        }
    };

    const cycleRepeatMode = async () => {
        if (!token) return;
        // Cycle: off (0) -> context (1) -> track (2) -> off (0)
        let nextModeString = 'off';
        let nextModeInt = 0;

        if (repeatMode === 0) {
            nextModeString = 'context';
            nextModeInt = 1;
        } else if (repeatMode === 1) {
            nextModeString = 'track';
            nextModeInt = 2;
        } else {
            nextModeString = 'off';
            nextModeInt = 0;
        }

        try {
            await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${nextModeString}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            setRepeatMode(nextModeInt);
        } catch (e) {
            console.error("Repeat Error:", e);
        }
    };

    const searchTracks = async (query) => {
        if (!token || !query) return [];
        try {
            const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            return data.tracks?.items?.map(t => ({
                id: t.id,
                name: t.name,
                artist: t.artists.map(a => a.name).join(', '),
                albumArt: t.album.images[0]?.url,
                uri: t.uri
            })) || [];
        } catch (e) {
            console.error("Search Error:", e);
            return [];
        }
    };


    // --- Polling for "Passive Mode" (Sync with external devices) ---
    useEffect(() => {
        return; // SPOTIFY INTEGRATION TEMPORARILY DISABLED
        if (!token) return;

        // Poll every 5 seconds (slightly slower to be safe) to get state from other devices
        const pollInterval = setInterval(async () => {
            if (!token) return;

            try {
                const res = await fetch("https://api.spotify.com/v1/me/player", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.status === 204) {
                    // Nothing playing. 
                    // Safe to ignore, don't clear local state if we think we have something.
                    return;
                }

                const data = await res.json();

                // CRITICAL SAFETY: Only update from polling if:
                // 1. We don't have a local device ID (SDK not ready/supported), OR
                // 2. The active device reported by API is NOT our local device.
                if (!deviceId || (data.device && data.device.id !== deviceId)) {
                    // We are in "Passive Mode" - following another device
                    setCurrentTrack({
                        name: data.item.name,
                        artist: data.item.artists.map(a => a.name).join(', '),
                        albumArt: data.item.album.images[0]?.url,
                        uri: data.item.uri
                    });
                    setIsPlaying(data.is_playing);
                    setDuration(data.item.duration_ms);
                    setProgress(data.progress_ms);
                }

                // Sync shuffle/repeat from polling too
                setIsShuffle(data.shuffle_state);
                const repeatState = data.repeat_state; // 'off', 'track', 'context'
                setRepeatMode(repeatState === 'track' ? 2 : (repeatState === 'context' ? 1 : 0));

            } catch (error) {
                // Silent catch to prevent console spam
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [token, deviceId]);


    // Play a playlist or track
    const playPlaylist = async (uri, isTrack = false) => {
        if (!token) return;

        // 1. Native Playback (Preferred)
        if (deviceId) {
            try {
                const body = isTrack ? { uris: [uri] } : { context_uri: uri };

                await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
                return; // Success
            } catch (error) {
                console.error("Spotify Play Error:", error);
                // Fallthrough to fallback if play fails?
                // No, let's assume if deviceId exists, we stick to native errors.
            }
        } else {
            // 2. Fallback: Deep Link (Free Users or SDK Error)
            // SDK is not ready or not supported. Open in App.
            console.log("SDK not ready. Opening in App:", uri);
            window.open(uri, '_blank');
        }
    };

    // Play/Resume
    const play = async () => {
        if (playerRef.current) {
            await playerRef.current.resume();
        }
    };

    // Pause
    const pause = async () => {
        if (playerRef.current) {
            await playerRef.current.pause();
        }
    };

    // Toggle play/pause
    const togglePlay = async () => {
        if (playerRef.current) {
            await playerRef.current.togglePlay();
        }
    };

    // Skip to next track
    const nextTrack = async () => {
        if (playerRef.current) {
            await playerRef.current.nextTrack();
        }
    };

    // Skip to previous track
    const previousTrack = async () => {
        if (playerRef.current) {
            await playerRef.current.previousTrack();
        }
    };

    // Seek to position (in ms)
    const seek = async (positionMs) => {
        if (playerRef.current) {
            await playerRef.current.seek(positionMs);
            setProgress(positionMs);
        }
    };

    // Set volume (0-1)
    const setVolume = async (volume) => {
        if (playerRef.current) {
            await playerRef.current.setVolume(volume);
        }
    };

    return {
        // Auth
        token,
        login,
        logout,
        userProfile,
        isValidatingToken,

        // Library
        playlists,
        fetchPlaylists,
        isLoading,

        // Player
        isPlayerReady,
        deviceId,

        // Playback State
        currentTrack,
        isPlaying,
        progress,
        duration,
        isShuffle,
        repeatMode,

        // Controls
        playPlaylist,
        play,
        pause,
        togglePlay,
        nextTrack,
        previousTrack,
        seek,
        setVolume,
        toggleShuffle,
        cycleRepeatMode,
        searchTracks
    };
};
