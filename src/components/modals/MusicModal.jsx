import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Music, Radio, Sparkles, Lock, Pause, Play, Volume2, VolumeX, LayoutGrid, LogOut, Shuffle, Repeat, Repeat1, Search, X, AlertTriangle } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import Slider from '../ui/Slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useSpotify } from '../../hooks/useSpotify';
import { AMBIENT_SOUNDS, MUSIC_TRACKS } from '../../utils/data'; // Import data

// --- CONFIGURATION ---
// Add your Spotify Playlist IDs here to pin them to the top of the music tab
const FOCUS_PLAYLIST_IDS = [
    '5JNz6vmoaNrIjdgtNXcZNJ',
    '14qUK2pgz40kU5YBI7KkVw',
    '1HbgLz4wk5kjqBwMTY2zuA',
    '0se7CCquOtDE2q6FfNSDn1',
];
// ---------------------

// Custom Spotify Icon Component
const SpotifyIcon = ({ size = 24, className, innerFillClassName }) => (
    <svg width={size} height={size} viewBox="0 0 496 512" className={className} xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z" />
        <path fill={innerFillClassName ? undefined : "black"} className={innerFillClassName} d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" />
    </svg>
);

const MusicModal = ({ isOpen, onClose, currentTrack, isPlaying, onPlay, onPause, isLoading, progress, duration, onSeek, ambienceState, onToggleAmbience, onAmbienceVolume, onStopAllAmbience, volume, onVolumeChange, isLofiPlaying, onToggleLofi, isPro, unlockedAmbiences = [], ambienceSetupDone = false, onSaveAmbienceSelection, onOpenPro }) => {
    const [activeTab, setActiveTab] = useState('ambience');
    const [simulateFree, setSimulateFree] = useState(false);
    const [focusPlaylists, setFocusPlaylists] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [modals, setModals] = useState({ showProfileMenu: false });

    // Spotify Hook - includes Web Playback SDK
    const {
        token, login, logout, playlists, fetchPlaylists, userProfile, playPlaylist,
        isLoading: isSpotifyLoading,
        isValidatingToken,
        // Playback state
        isPlayerReady,
        currentTrack: spotifyTrack,
        isPlaying: isSpotifyPlaying,
        progress: spotifyProgress,
        duration: spotifyDuration,
        // Controls
        togglePlay: spotifyTogglePlay,
        seek: spotifySeek,
        setVolume: spotifySetVolume,
        nextTrack: spotifyNextTrack,
        previousTrack: spotifyPreviousTrack,
        isShuffle, toggleShuffle,
        repeatMode, cycleRepeatMode,
        searchTracks
    } = useSpotify();

    useEffect(() => { if (isOpen && isLofiPlaying) setActiveTab('lofi'); }, [isOpen, isLofiPlaying]);

    // Fetch Spotify playlists when tab is active and token exists
    useEffect(() => {
        if (activeTab === 'spotify' && token && playlists.length === 0) {
            fetchPlaylists();
        }
    }, [activeTab, token]);

    // Helper: Extract ID from potential URL or raw ID
    const extractSpotifyId = (input) => {
        if (!input) return null;
        const clean = input.trim();
        // Check if it's a URL
        const match = clean.match(/playlist\/([a-zA-Z0-9]+)/);
        return match ? match[1] : clean;
    };

    // Fetch Pinned "Focus Essentials" Playlists
    useEffect(() => {
        const fetchFocusPlaylists = async () => {
            // Need user profile for country code fallback, but from_token should usually work
            if (!token || focusPlaylists.length > 0) return;

            // Helper to try fetching with different market strategies
            const fetchWithRetry = async (id) => {
                const strategies = [
                    `?market=from_token`,  // 1. Precise match for user
                    `?market=US`,          // 2. Fallback to US (most content exists here)
                    ``                     // 3. Raw (no market)
                ];

                for (const query of strategies) {
                    try {
                        const res = await fetch(`https://api.spotify.com/v1/playlists/${id}${query}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.ok) return await res.json();
                        // If 404/403, continue to next strategy
                    } catch (e) {
                        // Network error, ignore and try next
                    }
                }
                console.error(`Failed to load playlist ${id} after all strategies.`);
                return null;
            };

            try {
                const promises = FOCUS_PLAYLIST_IDS.map(async (rawId) => {
                    const id = extractSpotifyId(rawId);
                    if (!id) return null;

                    const data = await fetchWithRetry(id);
                    if (!data) return null;

                    return data;
                });

                const results = await Promise.all(promises);
                const validPlaylists = results.filter(p => p && !p.error).map(p => ({
                    id: p.id,
                    name: p.name,
                    img: p.images?.[0]?.url,
                    uri: p.uri
                }));

                if (validPlaylists.length > 0) {
                    setFocusPlaylists(validPlaylists);
                }
            } catch (error) {
                console.error("Failed to fetch focus playlists:", error);
            }
        };

        if (activeTab === 'spotify' && token) {
            fetchFocusPlaylists();
        }
    }, [activeTab, token]);

    const isSelectionMode = !isPro && !ambienceSetupDone;
    const isSpotifyPremium = !simulateFree && userProfile?.product === 'premium';
    useEffect(() => { if (!isOpen && isSelectionMode) { onStopAllAmbience(); } }, [isOpen, isSelectionMode, onStopAllAmbience]);
    const toggleMute = () => onVolumeChange(volume > 0 ? 0 : 0.5);
    const formatTime = (time) => { if (isNaN(time)) return "0:00"; const totalSeconds = Math.floor(time); const m = Math.floor(totalSeconds / 60); const s = totalSeconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };
    const handleConfirmSelection = () => { const selectedIds = Object.keys(ambienceState); if (onSaveAmbienceSelection) onSaveAmbienceSelection(selectedIds); };
    const showMasterVolume = activeTab !== 'ambience' || (activeTab === 'ambience' && (isPlaying || isLofiPlaying));
    const selectedCount = isSelectionMode ? Object.keys(ambienceState).length : 0;
    const tabTransition = { enter: { duration: 0.25, ease: "easeOut" }, exit: { duration: 0.08, ease: "linear" } };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md md:p-4" onClick={onClose}>
                    <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full h-full md:h-[650px] md:max-w-4xl md:max-h-[90vh] bg-[#0F0F0F] md:border border-white/10 md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative will-change-transform" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" /> <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                        <div className="flex items-center justify-between p-6 md:p-8 pb-4 z-20 shrink-0 mt-8 md:mt-0"> <div> <h2 className="text-2xl md:text-3xl font-serif-display text-white tracking-tight">Soundscapes</h2> <p className="text-white/40 text-xs md:text-sm mt-1 font-medium">Design your sonic environment.</p> </div> <CloseButton onClick={onClose} /> </div>
                        <div className="px-6 md:px-8 mb-2 z-20 shrink-0 overflow-x-auto no-scrollbar flex justify-center items-center">
                            <div className="inline-flex p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-xl whitespace-nowrap">
                                {[{ id: 'ambience', label: 'Ambience', icon: CloudRain }, { id: 'library', label: 'Music', icon: Music }, { id: 'lofi', label: 'Lofi', icon: Radio } /*, { id: 'spotify', label: 'Spotify', icon: SpotifyIcon } */].map((tab) => {
                                    const isActive = activeTab === tab.id; const Icon = tab.icon;
                                    const isSpotify = tab.id === 'spotify';
                                    const activeClass = isSpotify
                                        ? "text-black"
                                        : "text-black";
                                    const inactiveClass = "text-white/60 hover:text-white";
                                    const bgClass = isSpotify ? "bg-[#1DB954]" : "bg-white";

                                    const iconProps = isSpotify && isActive ? { innerFillClassName: "fill-white" } : {};

                                    return (
                                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-3 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-2 z-0 ${isActive ? activeClass : inactiveClass}`}>
                                            {isActive && <motion.div layoutId="activeTabBg" className={`absolute inset-0 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] z-[-1] ${bgClass}`} transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
                                            <Icon size={14} className={isActive ? (isSpotify ? "text-black" : "text-black") : ""} strokeWidth={2} {...iconProps} />
                                            <span>{tab.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <AnimatePresence>
                            {isSelectionMode && activeTab === 'ambience' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 md:px-8 pb-2 z-20">
                                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3"> <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Sparkles size={16} /></div> <div> <h4 className="text-white font-bold text-sm">Play to Select (Free Plan)</h4> <p className="text-white/50 text-xs">Chosen sounds will be yours forever. Others will lock.</p> </div> </div> <div className="flex items-center gap-3"> <span className="text-cyan-400 font-mono font-bold text-sm">{selectedCount} / 3</span> {selectedCount > 0 && (<button onClick={handleConfirmSelection} className="px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:from-cyan-300 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20">Confirm</button>)} </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="flex-1 overflow-hidden relative z-10">
                            <AnimatePresence mode="wait">
                                {activeTab === 'ambience' && (
                                    <motion.div key="ambience" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0, transition: tabTransition.enter }} exit={{ opacity: 0, x: -10, transition: tabTransition.exit }} className="h-full overflow-y-auto custom-scrollbar px-6 md:px-10 pt-4 pb-32">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                                            {AMBIENT_SOUNDS.map((track) => {
                                                const trackState = ambienceState[track.id]; const isActive = !!trackState; const Icon = track.icon; const isUnlocked = isPro || unlockedAmbiences.includes(track.id);
                                                return (
                                                    <motion.div key={track.id} onClick={() => { if (isSelectionMode) { if (isActive) onToggleAmbience(track); else if (selectedCount < 3) onToggleAmbience(track, true); } else { if (isUnlocked) onToggleAmbience(track, false); else onOpenPro('ambience'); } }} className={`relative aspect-[4/3] rounded-2xl md:rounded-3xl p-4 flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 border group ${isActive ? 'bg-white border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'} ${(isSelectionMode && isActive) ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black' : ''} ${(isSelectionMode && !isActive && selectedCount >= 3) ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
                                                        {!isSelectionMode && !isUnlocked && <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center backdrop-blur-[2px]"><Lock size={24} className="text-white/50" /></div>}
                                                        <div className="flex justify-between items-start pointer-events-none"> <span className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-colors duration-300 ${isActive ? 'bg-black/5 text-black' : 'bg-white/10 text-white'}`}> <Icon size={20} strokeWidth={1.5} className={isActive ? "animate-pulse" : ""} /> </span> {isActive && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]" />} </div>
                                                        <div className="relative z-20">
                                                            <h4 className={`font-medium text-xs md:text-sm transition-colors duration-300 truncate ${isActive ? 'text-black mb-1' : 'text-white mb-0'}`}>{track.title}</h4>
                                                            <AnimatePresence initial={false}>
                                                                {isActive && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 28, opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.25, ease: "easeOut" }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="pt-2">
                                                                            <Slider value={trackState?.volume || 0.5} onChange={(e) => onAmbienceVolume(track.id, parseFloat(e.target.value))} color={isActive ? "black" : "white"} className="py-1" />
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                                {activeTab === 'library' && (
                                    <motion.div key="library" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0, transition: tabTransition.enter }} exit={{ opacity: 0, x: -10, transition: tabTransition.exit }} className="h-full overflow-y-auto custom-scrollbar px-6 md:px-10 pt-4 pb-32">
                                        <div className="flex flex-col gap-3">
                                            {MUSIC_TRACKS.map((track, i) => {
                                                const isCurrent = currentTrack?.id === track.id && !isLofiPlaying; const isPlayingState = isCurrent && isPlaying;
                                                return (
                                                    <motion.div key={track.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => { if (isPro) { isCurrent && isPlaying ? onPause() : onPlay(track); } else { onOpenPro('music'); } }} className={`flex items-center gap-4 p-3 md:p-4 rounded-2xl md:rounded-3xl cursor-pointer border group relative overflow-hidden ${isCurrent ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}`}>
                                                        {!isPro && <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"> <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-cyan-500/30 text-cyan-400"> <Lock size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">Flow</span> </div> </div>}
                                                        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden bg-black/20 flex-shrink-0 shadow-lg"> {track.cover ? <img src={track.cover} alt="art" className={`w-full h-full object-cover transition-opacity ${!isPro ? 'grayscale opacity-50' : 'opacity-80 group-hover:opacity-100'}`} /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black"><Music size={20} className="text-white/20" /></div>} {isPro && <div className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isCurrent || 'opacity-0 group-hover:opacity-100'}`}> {isPlayingState ? <Pause size={20} className="text-white fill-white" /> : <Play size={20} className="text-white fill-white ml-1" />} </div>} </div>
                                                        <div className="flex-1 min-w-0"> <h4 className={`text-sm md:text-lg font-medium truncate ${isCurrent ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{track.title}</h4> <p className="text-xs md:text-sm text-white/30 uppercase tracking-widest font-medium mt-0.5 md:mt-1">{isCurrent && isPlaying ? 'Now Playing' : 'Focus Track'}</p> </div>
                                                        {isCurrent && (<div className="flex gap-1 h-3 md:h-4 items-end px-2 md:px-4">{[1, 2, 3, 4].map(n => (<motion.div key={n} animate={isPlaying ? { height: [4, 16, 8, 12, 4] } : { height: 4 }} transition={{ repeat: Infinity, duration: 1, delay: n * 0.1 }} className="w-1 bg-green-400 rounded-full" />))}</div>)}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                                {activeTab === 'spotify' && (
                                    <motion.div key="spotify" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0, transition: tabTransition.enter }} exit={{ opacity: 0, x: -10, transition: tabTransition.exit }} className="h-full overflow-y-auto custom-scrollbar px-6 md:px-10 pt-4 pb-32">
                                        {isValidatingToken ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 bg-[#1DB954]/20 rounded-full flex items-center justify-center mb-6">
                                                    <SpotifyIcon size={40} className="text-[#1DB954] animate-pulse" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Validating Session...</h3>
                                                <p className="text-white/40 max-w-sm">Please wait while we restore your Spotify connection.</p>
                                            </div>
                                        ) : !token ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 bg-[#1DB954]/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                                    <SpotifyIcon size={40} className="text-[#1DB954]" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-white mb-2">Connect Spotify</h3>
                                                <p className="text-white/40 max-w-sm mb-8">Access your personal playlists and control playback directly from Altimer.</p>
                                                <button onClick={() => { console.log("[UI] Connect Spotify Clicked"); login(); }} className="px-8 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-all shadow-[0_0_20px_rgba(29,185,84,0.3)] hover:shadow-[0_0_30px_rgba(29,185,84,0.5)] transform hover:scale-105 active:scale-95">
                                                    Connect Account
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                {/* Combined Header: Search + Profile */}
                                                <div className="flex items-center gap-4 mb-6 relative z-50">
                                                    {/* Search Bar */}
                                                    <div className="relative flex-1">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                                                            <Search size={16} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Search songs..."
                                                            value={searchQuery}
                                                            onChange={(e) => {
                                                                setSearchQuery(e.target.value);
                                                                if (e.target.value.length > 2) {
                                                                    setIsSearching(true);
                                                                    searchTracks(e.target.value).then(res => {
                                                                        setSearchResults(res);
                                                                        setIsSearching(false);
                                                                    });
                                                                } else {
                                                                    setSearchResults([]);
                                                                }
                                                            }}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-[#1DB954]/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                                                        />
                                                        {searchQuery && (
                                                            <button
                                                                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Profile Icon with Dropdown */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setModals(prev => ({ ...prev, showProfileMenu: !prev.showProfileMenu }))}
                                                            className="relative group transition-transform active:scale-95"
                                                        >
                                                            {userProfile?.images?.[0]?.url ? (
                                                                <img src={userProfile.images[0].url} alt="Profile" className={`w-10 h-10 rounded-full border border-white/10 ${!isSpotifyPremium ? 'ring-2 ring-amber-500/50' : ''}`} />
                                                            ) : (
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-black font-bold text-xs ${!isSpotifyPremium ? 'bg-amber-500 text-black' : 'bg-[#1DB954]'}`}>
                                                                    {userProfile?.display_name?.[0] || 'U'}
                                                                </div>
                                                            )}

                                                            {/* Premium Warning Badge */}
                                                            {!isSpotifyPremium && (
                                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border border-black shadow-lg">
                                                                    <span className="text-[10px] font-bold text-black">!</span>
                                                                </div>
                                                            )}
                                                        </button>

                                                        {/* Profile Dropdown Menu */}
                                                        <AnimatePresence>
                                                            {modals.showProfileMenu && (
                                                                <>
                                                                    <div className="fixed inset-0 z-40" onClick={() => setModals(prev => ({ ...prev, showProfileMenu: false }))} />
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        className="absolute right-0 top-full mt-2 w-64 bg-[#181818] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 overflow-hidden"
                                                                    >
                                                                        <div className="flex flex-col gap-4">
                                                                            {/* Header Info */}
                                                                            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <h4 className="text-white font-medium text-sm truncate">{userProfile?.display_name || 'Spotify User'}</h4>
                                                                                    <p className="text-white/40 text-xs truncate">{userProfile?.email || 'Connected'}</p>
                                                                                </div>
                                                                            </div>

                                                                            {/* Warning Context */}
                                                                            {!isSpotifyPremium && (
                                                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <AlertTriangle size={12} className="text-amber-500" />
                                                                                        <span className="text-amber-500 text-xs font-bold uppercase">Premium Required</span>
                                                                                    </div>
                                                                                    <p className="text-amber-200/70 text-[10px] leading-relaxed">
                                                                                        Playback controls require Spotify Premium. Start music on your device first.
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {/* Actions */}
                                                                            <div className="flex flex-col gap-2">
                                                                                <button
                                                                                    onClick={() => setSimulateFree(!simulateFree)}
                                                                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${simulateFree ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                                                                                >
                                                                                    <span>Simulate Free Plan</span>
                                                                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${simulateFree ? 'bg-amber-500' : 'bg-white/20'}`}>
                                                                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${simulateFree ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                                    </div>
                                                                                </button>

                                                                                <button
                                                                                    onClick={logout}
                                                                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                                                >
                                                                                    <LogOut size={14} />
                                                                                    Disconnect Account
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                </>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>

                                                {/* Search Results */}
                                                {searchResults.length > 0 && searchQuery.length > 2 ? (
                                                    <div className="mb-8">
                                                        <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">Search Results</h3>
                                                        <div className="flex flex-col gap-2">
                                                            {searchResults.map(track => (
                                                                <div
                                                                    key={track.id}
                                                                    onClick={() => playPlaylist(track.uri, true)}
                                                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
                                                                >
                                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 relative shrink-0">
                                                                        {track.albumArt && <img src={track.albumArt} className="w-full h-full object-cover" />}
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                            <Play size={12} fill="white" className="text-white" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-medium text-white truncate">{track.name}</div>
                                                                        <div className="text-xs text-white/40 truncate">{track.artist}</div>
                                                                    </div>
                                                                    <div className="text-xs text-white/20 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        Play
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Only show Dashboard if NOT searching/viewing results
                                                    <>
                                                        {/* Curated Focus Playlists Section */}
                                                        <div className="mb-8">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <Sparkles size={14} className="text-purple-400" />
                                                                <h3 className="text-white/80 text-sm font-bold uppercase tracking-widest">Focus Essentials</h3>
                                                            </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                {focusPlaylists.length > 0 ? focusPlaylists.map((p) => (
                                                                    <div key={p.id} onClick={() => playPlaylist(p.uri)} className="group cursor-pointer">
                                                                        <div className="aspect-square bg-white/5 rounded-xl overflow-hidden mb-2 relative border border-white/5 group-hover:border-purple-500/30 transition-colors">
                                                                            {p.img ? (
                                                                                <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Music className="text-white/20" /></div>
                                                                            )}
                                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                                                                    <Play size={16} fill="black" className="text-black ml-0.5" />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <h4 className="text-white/70 text-xs font-medium truncate group-hover:text-purple-300 transition-colors">{p.name}</h4>
                                                                    </div>
                                                                )) : (
                                                                    /* Loading Skeletons or Fallback if fetch fails */
                                                                    [1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-white/5 rounded-xl animate-pulse" />)
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* User's Library Section */}
                                                        <div>
                                                            <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">Your Library</h3>
                                                            {isSpotifyLoading ? (
                                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                                                        <div key={i} className="aspect-square bg-white/5 rounded-2xl animate-pulse" />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                    {playlists.map((playlist) => (
                                                                        <div key={playlist.id} onClick={() => playPlaylist(playlist.uri)} className="group cursor-pointer">
                                                                            <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden mb-3 relative">
                                                                                {playlist.images?.[0]?.url ? (
                                                                                    <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center bg-white/10">
                                                                                        <Music size={32} className="text-white/20" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                                    <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                                                                        <Play size={20} fill="black" className="text-black ml-1" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <h4 className="text-white text-sm font-medium truncate group-hover:text-[#1DB954] transition-colors">{playlist.name}</h4>
                                                                            <p className="text-white/40 text-xs truncate mt-0.5">{playlist.tracks?.total} tracks</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                                {activeTab === 'lofi' && (
                                    <motion.div key="lofi" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, transition: tabTransition.enter }} exit={{ opacity: 0, scale: 1.05, transition: tabTransition.exit }} className="h-full flex flex-col items-center justify-center pb-32 px-6 md:px-8">
                                        <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[32px] md:rounded-[40px] flex flex-col items-center text-center max-w-sm w-full shadow-2xl backdrop-blur-sm">
                                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden mb-4 md:mb-6 border-4 border-white/10 shadow-2xl relative"> <img src="https://i.pinimg.com/originals/4a/65/ab/4a65abeead3a8d113bccfee5d5d239f4.gif" className="w-full h-full object-cover" /> {isLofiPlaying && <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>} </div>
                                            <h3 className="text-xl md:text-2xl font-serif-display text-white mb-2">Lofi Girl Radio</h3> <p className="text-white/40 text-xs md:text-sm mb-6 md:mb-8">beats to relax/study to. All hail Lofi Girl!</p>
                                            <button onClick={onToggleLofi} className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${isLofiPlaying ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' : 'bg-white text-black hover:bg-gray-200 shadow-white/10'}`}> {isLofiPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />} {isLofiPlaying ? 'Pause Radio' : 'Start Radio'} </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {/* Footer Player Bar - Floating Glass Pill */}
                        <div className="absolute bottom-4 left-4 right-4 z-50">
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex items-center justify-between px-6 py-3 h-[90px] gap-6"
                            >
                                {/* Spotify Now Playing */}
                                {activeTab === 'spotify' && spotifyTrack ? (
                                    <div className="flex items-center justify-between w-full h-full gap-4">
                                        {/* Left: Album Art & Info */}
                                        <div className="flex items-center gap-4 w-[30%] min-w-0">
                                            <div className="relative group shrink-0">
                                                {spotifyTrack.albumArt && (
                                                    <img src={spotifyTrack.albumArt} alt="Album" className="w-14 h-14 rounded-xl shadow-lg" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0 justify-center">
                                                <span className="text-sm font-bold text-white truncate pr-2">{spotifyTrack.name}</span>
                                                <span className="text-xs text-white/50 truncate pr-2">{spotifyTrack.artist}</span>
                                            </div>
                                        </div>

                                        {/* Center: Controls & Seekbar */}
                                        <div className="flex flex-col items-center justify-center w-[40%] gap-2">
                                            {/* Seek Bar Row (Top) */}
                                            <div className="w-full flex items-center gap-3">
                                                <span className="text-[10px] font-mono text-white/40 shrink-0 w-8 text-right">{formatTime(spotifyProgress / 1000)}</span>
                                                <Slider value={spotifyProgress} max={spotifyDuration || 1} onChange={(e) => spotifySeek(Number(e.target.value))} color="white" className="flex-1" />
                                                <span className="text-[10px] font-mono text-white/40 shrink-0 w-8">{formatTime(spotifyDuration / 1000)}</span>
                                            </div>

                                            {/* Controls Row (Bottom) */}
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={toggleShuffle}
                                                    className={`transition-colors hover:scale-110 active:scale-95 ${isShuffle ? 'text-[#1DB954]' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    <Shuffle size={16} />
                                                </button>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button onClick={spotifyPreviousTrack} className="text-white/60 hover:text-white transition-colors hover:scale-110 active:scale-95">
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                                                            </button>
                                                        </TooltipTrigger>
                                                        {!isSpotifyPremium && <TooltipContent><p>Premium needed to skip</p></TooltipContent>}
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button onClick={spotifyTogglePlay} className="w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-[#1ed760]">
                                                                {isSpotifyPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-0.5" />}
                                                            </button>
                                                        </TooltipTrigger>
                                                        {!isSpotifyPremium && <TooltipContent><p>Premium needed to play</p></TooltipContent>}
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button onClick={spotifyNextTrack} className="text-white/60 hover:text-white transition-colors hover:scale-110 active:scale-95">
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                                                            </button>
                                                        </TooltipTrigger>
                                                        {!isSpotifyPremium && <TooltipContent><p>Premium needed to skip</p></TooltipContent>}
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <button
                                                    onClick={cycleRepeatMode}
                                                    className={`transition-colors hover:scale-110 active:scale-95 ${repeatMode > 0 ? 'text-[#1DB954]' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    {repeatMode === 2 ? <Repeat1 size={16} /> : <Repeat size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right: Volume */}
                                        <div className="flex items-center justify-end w-[30%] gap-3">
                                            <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">{volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                                            <div className="w-24">
                                                <Slider value={volume} max={1} onChange={(e) => { onVolumeChange(parseFloat(e.target.value)); spotifySetVolume(parseFloat(e.target.value)); }} color="white" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Default Player (Lofi / Local ) */
                                    <div className="flex items-center w-full gap-4">
                                        <button onClick={() => { if (isLofiPlaying || activeTab === 'lofi') { onToggleLofi(); } else if (currentTrack) { isPlaying ? onPause() : onPlay(currentTrack); } }} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0">
                                            {(isLofiPlaying || (currentTrack && isPlaying)) ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-0.5" />}
                                        </button>

                                        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs md:text-sm font-bold text-white truncate max-w-[200px]">{isLofiPlaying ? "Lofi Girl Radio" : (currentTrack ? currentTrack.title : "Select Music")}</span>
                                                {!isLofiPlaying && currentTrack && <span className="text-[10px] font-mono text-white/40 shrink-0">{formatTime(progress)} / {formatTime(duration)}</span>}
                                            </div>
                                            <div className="w-full">
                                                {!isLofiPlaying && currentTrack ? (
                                                    <Slider value={progress} max={duration || 100} onChange={(e) => onSeek(Number(e.target.value))} color="white" />
                                                ) : (isLofiPlaying && <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 animate-[pulse_2s_infinite]" style={{ width: '100%' }} /></div>)}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {showMasterVolume && (
                                                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="hidden md:flex items-center gap-2 pl-2">
                                                    <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">{volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
                                                    <div className="w-20"><Slider value={volume} max={1} onChange={(e) => onVolumeChange(parseFloat(e.target.value))} color="white" /></div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
export default MusicModal;