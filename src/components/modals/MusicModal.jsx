import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Music, Radio, Sparkles, Lock, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import Slider from '../ui/Slider';
import { AMBIENT_SOUNDS, MUSIC_TRACKS } from '../../utils/data'; // Import data

const MusicModal = ({ isOpen, onClose, currentTrack, isPlaying, onPlay, onPause, isLoading, progress, duration, onSeek, ambienceState, onToggleAmbience, onAmbienceVolume, onStopAllAmbience, volume, onVolumeChange, isLofiPlaying, onToggleLofi, isPro, unlockedAmbiences = [], ambienceSetupDone = false, onSaveAmbienceSelection, onOpenPro }) => {
    const [activeTab, setActiveTab] = useState('ambience');
    useEffect(() => { if (isOpen && isLofiPlaying) setActiveTab('lofi'); }, [isOpen, isLofiPlaying]);
    const isSelectionMode = !isPro && !ambienceSetupDone;
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
                        <div className="px-6 md:px-8 mb-2 z-20 shrink-0 overflow-x-auto no-scrollbar flex justify-between items-center">
                            <div className="inline-flex p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-xl whitespace-nowrap">
                                {[{ id: 'ambience', label: 'Ambience', icon: CloudRain }, { id: 'library', label: 'Music', icon: Music }, { id: 'lofi', label: 'Lofi Radio', icon: Radio }].map((tab) => {
                                    const isActive = activeTab === tab.id; const Icon = tab.icon;
                                    return (
                                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-2 z-0 ${isActive ? 'text-black' : 'text-white/60 hover:text-white'}`}> {isActive && <motion.div layoutId="activeTabBg" className="absolute inset-0 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] z-[-1]" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />} <Icon size={14} className={isActive ? "text-black" : ""} strokeWidth={2} /> <span>{tab.label}</span> </button>
                                    )
                                })}
                            </div>
                        </div>
                        <AnimatePresence>
                            {isSelectionMode && activeTab === 'ambience' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 md:px-8 pb-2 z-20">
                                    <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3"> <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><Sparkles size={16} /></div> <div> <h4 className="text-white font-bold text-sm">Play to Select (Free Plan)</h4> <p className="text-white/50 text-xs">Chosen sounds will be yours forever. Others will lock.</p> </div> </div> <div className="flex items-center gap-3"> <span className="text-yellow-400 font-mono font-bold text-sm">{selectedCount} / 3</span> {selectedCount > 0 && (<button onClick={handleConfirmSelection} className="px-4 py-1.5 bg-yellow-400 text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-yellow-300 transition-colors shadow-lg">Confirm</button>)} </div>
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
                                                    <motion.div key={track.id} onClick={() => { if (isSelectionMode) { if (isActive) onToggleAmbience(track); else if (selectedCount < 3) onToggleAmbience(track, true); } else { if (isUnlocked) onToggleAmbience(track, false); else onOpenPro('ambience'); } }} className={`relative aspect-[4/3] rounded-2xl md:rounded-3xl p-4 flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 border group ${isActive ? 'bg-white border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'} ${(isSelectionMode && isActive) ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''} ${(isSelectionMode && !isActive && selectedCount >= 3) ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
                                                        {!isSelectionMode && !isUnlocked && <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center backdrop-blur-[2px]"><Lock size={24} className="text-white/50" /></div>}
                                                        <div className="flex justify-between items-start pointer-events-none"> <span className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-colors duration-300 ${isActive ? 'bg-black/5 text-black' : 'bg-white/10 text-white'}`}> <Icon size={20} strokeWidth={1.5} className={isActive ? "animate-pulse" : ""} /> </span> {isActive && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]" />} </div>
                                                        <div className="relative z-20"> <h4 className={`font-medium text-xs md:text-sm transition-colors duration-300 truncate ${isActive ? 'text-black mb-1' : 'text-white mb-0'}`}>{track.title}</h4> <div className={`transition-all duration-300 ease-out overflow-hidden ${isActive ? 'h-5 opacity-100 mt-2' : 'h-0 opacity-0'}`} onClick={(e) => e.stopPropagation()}> <Slider value={trackState?.volume || 0.5} onChange={(e) => onAmbienceVolume(track.id, parseFloat(e.target.value))} color={isActive ? "black" : "white"} className="py-1" /> </div> </div>
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
                                                        {!isPro && <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"> <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-yellow-500/30 text-yellow-400"> <Lock size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">Pro</span> </div> </div>}
                                                        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden bg-black/20 flex-shrink-0 shadow-lg"> {track.cover ? <img src={track.cover} alt="art" className={`w-full h-full object-cover transition-opacity ${!isPro ? 'grayscale opacity-50' : 'opacity-80 group-hover:opacity-100'}`} /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black"><Music size={20} className="text-white/20" /></div>} {isPro && <div className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isCurrent || 'opacity-0 group-hover:opacity-100'}`}> {isPlayingState ? <Pause size={20} className="text-white fill-white" /> : <Play size={20} className="text-white fill-white ml-1" />} </div>} </div>
                                                        <div className="flex-1 min-w-0"> <h4 className={`text-sm md:text-lg font-medium truncate ${isCurrent ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{track.title}</h4> <p className="text-xs md:text-sm text-white/30 uppercase tracking-widest font-medium mt-0.5 md:mt-1">{isCurrent && isPlaying ? 'Now Playing' : 'Focus Track'}</p> </div>
                                                        {isCurrent && (<div className="flex gap-1 h-3 md:h-4 items-end px-2 md:px-4">{[1, 2, 3, 4].map(n => (<motion.div key={n} animate={isPlaying ? { height: [4, 16, 8, 12, 4] } : { height: 4 }} transition={{ repeat: Infinity, duration: 1, delay: n * 0.1 }} className="w-1 bg-green-400 rounded-full" />))}</div>)}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
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
                        <div className="h-auto md:h-24 bg-gradient-to-t from-black via-[#0a0a0a]/95 to-transparent flex flex-col md:flex-row items-center px-6 md:px-8 py-4 md:py-0 gap-4 md:gap-6 z-30 shrink-0 absolute bottom-0 left-0 right-0 border-t border-white/5 md:border-t-0">
                            <div className="flex items-center w-full md:w-auto gap-4">
                                <button onClick={() => { if (isLofiPlaying) { onToggleLofi(); } else if (activeTab === 'lofi') { onToggleLofi(); } else if (currentTrack) { isPlaying ? onPause() : onPlay(currentTrack); } }} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] shrink-0"> {(isLofiPlaying || (currentTrack && isPlaying)) ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-0.5" />} </button>
                                <div className="flex-1 flex flex-col justify-center gap-1 min-w-0"> <div className="flex justify-between items-end"> <span className="text-sm font-bold text-white truncate pr-2">{isLofiPlaying ? "Lofi Girl Radio" : (currentTrack ? currentTrack.title : "No Track Selected")}</span> {!isLofiPlaying && currentTrack && <span className="text-[10px] font-mono text-white/40 shrink-0">{formatTime(progress)} / {formatTime(duration)}</span>} </div> <div className="w-full"> {!isLofiPlaying && currentTrack ? (<Slider value={progress} max={duration || 100} onChange={(e) => onSeek(Number(e.target.value))} color="white" />) : (isLofiPlaying && <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 animate-[pulse_2s_infinite]" style={{ width: '100%' }} /></div>)} </div> </div>
                            </div>
                            <AnimatePresence> {showMasterVolume && (<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="flex items-center gap-3 w-full md:w-40 group pl-2 md:pl-0"> <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors shrink-0">{volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button> <div className="flex-1"><Slider value={volume} max={1} onChange={(e) => onVolumeChange(parseFloat(e.target.value))} color="white" /></div> </motion.div>)} </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
export default MusicModal;