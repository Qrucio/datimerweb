import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountdownTimer from './CountdownTimer';
import { supabase } from '../lib/supabase';
import { RoomsService } from '../services/roomsService';
import Avatar from './Avatar';
import { Play, Pause, LogOut } from 'lucide-react';

// FIX #7: Support video backgrounds (same check as App.jsx)
const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|mov)(\?.*)?$/i);
};

const calculateTimeLeft = (state) => {
    if (!state) return 0;
    if (state.isActive && state.serverEndTime) {
        const now = RoomsService.getSyncedTime();
        return Math.max(0, Math.ceil((state.serverEndTime - now) / 1000));
    }
    return Math.ceil((state.remainingDuration || 0) / 1000);
};

// --- SKELETON VIEW (defined OUTSIDE to avoid remount/animation reset) ---
const SkeletonContent = ({ localClockType, timerSize }) => (
    <main className="flex-1 flex flex-col items-center justify-center min-h-0 w-full px-4 pt-16 md:pb-0 relative z-10 pointer-events-none">
        <div className="flex flex-col items-center w-full max-w-full relative pointer-events-auto">
            
            {/* Skeleton Profile Header */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-max">
                <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden relative">
                    <motion.div 
                        initial={{ transform: 'translateX(-150%)', opacity: 0 }}
                        animate={{ transform: 'translateX(150%)', opacity: 0.6 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: [0.77, 0, 0.175, 1], repeatDelay: 1 }}
                        className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 pointer-events-none" 
                    />
                </div>
                <div className="w-24 h-4 rounded-full bg-white/10 overflow-hidden relative mt-1">
                    <motion.div 
                        initial={{ transform: 'translateX(-150%)', opacity: 0 }}
                        animate={{ transform: 'translateX(150%)', opacity: 0.6 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: [0.77, 0, 0.175, 1], repeatDelay: 1 }}
                        className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 pointer-events-none" 
                    />
                </div>
            </div>

            {/* Skeleton Mode Switcher */}
            <div className="flex items-center justify-center mb-2 h-10 w-full max-w-xl text-sm">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-1 h-full rounded-full border border-white/10 bg-white/5 overflow-hidden relative mx-1 md:mx-1.5">
                        <motion.div 
                            initial={{ transform: 'translateX(-150%)', opacity: 0 }}
                            animate={{ transform: 'translateX(150%)', opacity: 0.5 }}
                            transition={{ repeat: Infinity, duration: 2, ease: [0.77, 0, 0.175, 1], repeatDelay: 1 }}
                            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 pointer-events-none" 
                        />
                    </div>
                ))}
            </div>

            {/* Dummy Tally Indicator Spacer */}
            <div className="relative z-50 flex items-center justify-center gap-3 -mb-4 h-8 min-w-[100px]" />

            {/* Skeleton Timer */}
            <motion.div 
                initial={{ backgroundPosition: '200% 0' }}
                animate={{ backgroundPosition: '-200% 0' }}
                transition={{ repeat: Infinity, duration: 2.5, ease: [0.77, 0, 0.175, 1], repeatDelay: 1 }}
                style={{ backgroundSize: '200% auto' }}
                className={`
                    leading-none tracking-normal select-none tabular-nums
                    bg-clip-text text-transparent bg-[linear-gradient(102deg,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0.05)_60%)]
                    ${(localClockType || 'default') === 'default' ? 'font-timer-clock' : ''}
                    ${localClockType === 'sans' ? 'font-sans' : ''}
                    ${localClockType === 'serif' ? 'font-serif' : ''}
                    ${localClockType === 'mono' ? 'font-mono' : ''}
                    ${localClockType === 'display' ? 'font-timer-display' : ''}
                    ${localClockType === 'digital' ? 'font-timer-digital' : ''}
                    ${localClockType === 'pixel' ? 'font-timer-pixel' : ''}
                    ${localClockType === 'cyber' ? 'font-timer-cyber' : ''}
                    ${localClockType === 'hand' ? 'font-timer-hand' : ''}
                    ${localClockType === 'block' ? 'font-timer-block' : ''}
                    ${localClockType === 'elegant' ? 'font-timer-elegant' : ''}
                    ${localClockType === 'neon' ? 'font-timer-neon' : ''}
                    ${localClockType === 'round' ? 'font-timer-round' : ''}
                    
                    ${({
                        'small': 'text-[13vw] md:text-[5rem] lg:text-[6rem]',
                        'medium': 'text-[15vw] md:text-[6rem] lg:text-[8rem]',
                        'giant': 'text-[18vw] md:text-[8rem] lg:text-[10rem]',
                        'mammoth': 'text-[20vw] md:text-[10rem] lg:text-[12rem]'
                    }[timerSize || 'medium']) || 'text-[15vw] md:text-[6rem] lg:text-[8rem]'}
                `}
            >
                00:00
            </motion.div>

            {/* Dummy Controls Spacer */}
            <div className="flex items-center gap-6 mt-8 md:mt-10 w-full justify-center h-20" />
        </div>
    </main>
);

const RemoteTimerPane = ({ roomId, isHost, remoteUserId, localBackgroundOpacity, localBackground, localClockType, onSyncClick, isDevMock, onLeaveRoom, onBackgroundMatch }) => {
    const [remoteState, setRemoteState] = useState(null);
    const [remoteProfile, setRemoteProfile] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const prevTimeLeft = useRef(0);
    const videoRef = useRef(null);

    const [assetLoaded, setAssetLoaded] = useState(false);
    const [assetError, setAssetError] = useState(false);

    const handleStateUpdate = (newState) => {
        setRemoteState(newState);
        const newTime = calculateTimeLeft(newState);
        setTimeLeft(newTime);
        prevTimeLeft.current = newTime;
    };

    // Fetch initial room state and remote user profile
    useEffect(() => {
        if (isDevMock) {
            // Simulate network fetch for dev mock
            const timer = setTimeout(() => {
                setRemoteProfile({
                    display_name: 'Dev Tester',
                    handle: 'tester',
                    avatar_url: null
                });
                handleStateUpdate({
                    isActive: true,
                    remainingDuration: 1500000,
                    totalDuration: 1500,
                    serverEndTime: RoomsService.getSyncedTime() + 1500000,
                    mode: 'focus',
                    background: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=kalen-emsley-Bkci_8qcdvQ-unsplash.jpg&w=1920',
                    backgroundOpacity: 0.5,
                    clockType: 'default'
                });
            }, 1500);
            return () => clearTimeout(timer);
        }

        if (!roomId || !remoteUserId) return;

        const init = async () => {
            // Fetch profile
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', remoteUserId).single();
            setRemoteProfile(profile);

            // Fetch room
            const { room } = await RoomsService.getRoom(roomId);
            if (room) {
                handleStateUpdate(isHost ? room.participant_timer_state : room.host_timer_state);
            }
        };
        init();

        // Subscribe to room changes
        const channel = supabase.channel(`room:${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                const updatedRoom = payload.new;
                handleStateUpdate(isHost ? updatedRoom.participant_timer_state : updatedRoom.host_timer_state);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, isHost, remoteUserId]);

    // Compute dynamic time left
    // FIX #8: Use setInterval at 250ms instead of requestAnimationFrame at 60fps.
    // Only call setTimeLeft when the displayed second actually changes.
    useEffect(() => {
        if (!remoteState) return;

        const tick = () => {
            const newTimeLeft = calculateTimeLeft(remoteState);

            // Only re-render if the displayed second changed
            if (newTimeLeft !== prevTimeLeft.current) {
                prevTimeLeft.current = newTimeLeft;
                setTimeLeft(newTimeLeft);
            }
        };
        
        tick(); // Run immediately
        const intervalId = setInterval(tick, 250); // 4x/sec is plenty for sub-second accuracy
        return () => clearInterval(intervalId);
    }, [remoteState]);

    // Use their profile background if available, else fallback
    const activeBackground = remoteState?.background || remoteProfile?.timer_state?.background || null;
    
    const isSameBackground = Boolean(localBackground && activeBackground && localBackground === activeBackground);

    useEffect(() => {
        if (onBackgroundMatch) {
            onBackgroundMatch(isSameBackground);
        }
    }, [isSameBackground, onBackgroundMatch]);

    const isDataReady = remoteState !== null && remoteProfile !== null && remoteState.mode !== undefined;
    const isFullyReady = isDataReady && (isSameBackground || !activeBackground || assetLoaded || assetError);

    // Asset preloading effect
    useEffect(() => {
        if (!isDataReady) return;
        
        // Reset state if background changes
        setAssetLoaded(false);
        setAssetError(false);

        if (!activeBackground) {
            setAssetLoaded(true);
            return;
        }

        if (isVideo(activeBackground)) {
            // Video loading is handled by DOM events on the <video> tag
            return;
        }

        // Image preloading
        const img = new Image();
        img.src = activeBackground;
        img.onload = () => setAssetLoaded(true);
        img.onerror = () => setAssetError(true);
    }, [isDataReady, activeBackground]);

    return (
        <div className={`w-full h-full relative overflow-hidden flex flex-col justify-center items-center transition-colors duration-1000 ${isSameBackground ? 'bg-transparent' : 'bg-black'}`}>
            {isDataReady && (
                <>
                    {/* FIX #7: Remote Background — supports both image and video */}
                    {!isSameBackground && activeBackground && (
                        isVideo(activeBackground) ? (
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <video
                                    ref={videoRef}
                                    src={activeBackground}
                                    autoPlay loop muted playsInline disablePictureInPicture
                                    onLoadedData={(e) => { 
                                        e.target.muted = true; 
                                        e.target.play().catch(() => {}); 
                                        setAssetLoaded(true);
                                    }}
                                    onError={() => setAssetError(true)}
                                    onCanPlay={(e) => { e.target.muted = true; e.target.play().catch(() => {}); }}
                                    style={{
                                        filter: 'brightness(1.2) contrast(1.1)',
                                        transform: 'translateZ(0)',
                                        opacity: localBackgroundOpacity !== undefined ? localBackgroundOpacity : 0.5
                                    }}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div 
                                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
                                style={{ 
                                    backgroundImage: `url(${activeBackground})`,
                                    opacity: localBackgroundOpacity !== undefined ? localBackgroundOpacity : 0.5
                                }} 
                            />
                        )
                    )}

                    {/* Remote Content (wrapped identically to App.jsx to ensure perfect horizontal alignment) */}
                    <main className="flex-1 flex flex-col items-center justify-center min-h-0 w-full px-4 pt-16 md:pb-0 relative z-10 pointer-events-none">
                        <div className="flex flex-col items-center w-full max-w-full relative pointer-events-auto">
                            {/* Profile Header — sits in the top area, outside of the centered timer flow */}
                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-max">
                                <Avatar userData={remoteProfile} size="lg" />
                                <span className="text-white/70 font-bold whitespace-nowrap">{remoteProfile?.display_name || 'Unknown'}</span>
                            </div>

                            {/* --- MODE SWITCHER (Non-interactive replica of App.jsx) --- */}
                            <div className="flex items-center justify-center mb-2 h-10 w-full max-w-xl text-sm">
                            {[{ id: 'focus', label: 'Focus' }, { id: 'shortBreak', label: 'Short Break' }, { id: 'longBreak', label: 'Long Break' }, { id: 'stopwatch', label: 'Stopwatch' }].map((m) => {
                                const isCurrent = remoteState.mode === m.id;
                                const isActive = remoteState.isActive;
                                
                                const totalSeconds = remoteState.totalDuration || (remoteState.mode === 'focus' ? 1500 : 300);
                                const progress = m.id === 'stopwatch' ? 100 : (totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0);

                                let containerClass = `relative h-full rounded-full transition-all overflow-hidden flex items-center justify-center whitespace-nowrap min-w-0 `;

                                if (isActive) {
                                    if (isCurrent) { containerClass += "flex-[100] bg-white/10 mx-0 cursor-default border border-transparent duration-1000 ease-in-out"; }
                                    else { containerClass += "flex-[0.001] px-0 mx-0 opacity-0 border border-transparent duration-1000 ease-in-out"; }
                                } else {
                                    containerClass += "flex-1 mx-1 md:mx-1.5 duration-300 ease-out ";
                                    if (isCurrent) { containerClass += "bg-white text-black font-medium border border-white cursor-default group "; }
                                    else { containerClass += "bg-transparent text-white/50 border border-transparent cursor-default "; }
                                }

                                return (
                                    <div key={m.id} className={containerClass}>
                                        {/* Progress Bar Background */}
                                        <div className={`absolute inset-y-0 left-0 bg-white transition-all duration-1000 ease-linear will-change-[width] ${isActive && isCurrent ? 'opacity-100' : 'opacity-0'}`} style={{ width: `${isActive && isCurrent ? progress : 0}%` }} />

                                        <span className={`relative z-10 font-medium flex items-center justify-center gap-1 ${isCurrent ? 'mix-blend-difference text-white' : ''}`}>
                                            <span className="whitespace-nowrap">{m.label}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* --- CYCLE TALLY INDICATOR (Read-only replica of remote user's session progress) --- */}
                        <div className={`relative z-50 flex items-center justify-center gap-3 -mb-4 h-8 cursor-default min-w-[100px] transition-opacity duration-300 ${remoteState.mode === 'stopwatch' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            {Array.from({ length: remoteState.pomosBeforeLongBreak || 4 }).map((_, i) => {
                                const isCompleted = i < (remoteState.pomoCount || 0);
                                const isCurrent = i === (remoteState.pomoCount || 0);
                                return (
                                    <div key={i} className={`rounded-full transition-all duration-500 ease-smooth ${(isCompleted || isCurrent) ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/20'}`} />
                                );
                            })}
                        </div>

                        {/* --- TIMER (Matches App.jsx classes and dynamic sizing/fonts) --- */}
                        <div
                            className={`
                                leading-none tracking-normal select-none tabular-nums transition-all duration-700 cursor-default
                                
                                ${(remoteState.clockType || 'default') === 'default' ? 'font-timer-clock' : ''}
                                ${remoteState.clockType === 'sans' ? 'font-sans' : ''}
                                ${remoteState.clockType === 'serif' ? 'font-serif' : ''}
                                ${remoteState.clockType === 'mono' ? 'font-mono' : ''}
                                ${remoteState.clockType === 'display' ? 'font-timer-display' : ''}
                                ${remoteState.clockType === 'digital' ? 'font-timer-digital' : ''}
                                ${remoteState.clockType === 'pixel' ? 'font-timer-pixel' : ''}
                                ${remoteState.clockType === 'cyber' ? 'font-timer-cyber' : ''}
                                ${remoteState.clockType === 'hand' ? 'font-timer-hand' : ''}
                                ${remoteState.clockType === 'block' ? 'font-timer-block' : ''}
                                ${remoteState.clockType === 'elegant' ? 'font-timer-elegant' : ''}
                                ${remoteState.clockType === 'neon' ? 'font-timer-neon' : ''}
                                ${remoteState.clockType === 'round' ? 'font-timer-round' : ''}
                                
                                ${({
                                    'small': 'text-[13vw] md:text-[5rem] lg:text-[6rem]',
                                    'medium': 'text-[15vw] md:text-[6rem] lg:text-[8rem]',
                                    'giant': 'text-[18vw] md:text-[8rem] lg:text-[10rem]',
                                    'mammoth': 'text-[20vw] md:text-[10rem] lg:text-[12rem]'
                                }[remoteState.timerSize || 'medium']) || 'text-[15vw] md:text-[6rem] lg:text-[8rem]'}
                                
                                ${!remoteState.isActive ? 'text-white' : 'text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'}
                            `}
                        >
                            <CountdownTimer timeLeft={timeLeft} disableAnimation={true} clockType={remoteState.clockType || 'default'} />
                        </div>
                        
                        {/* Room Controls Spacer for alignment */}
                        <div className="flex items-center gap-6 mt-8 md:mt-10 w-full justify-center h-20 pointer-events-none">
                            {/* The Leave Room button was moved to a Pull Tab on the outer pane edge in App.jsx */}
                        </div>
                        </div>
                    </main>
                </>
            )}

            {/* Asset Preload Overlay — Skeleton stays on top until background image/video is ready */}
            <AnimatePresence>
                {!isFullyReady && (
                    <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
                        className="absolute inset-0 z-50 pointer-events-none bg-black/90"
                    >
                        <div className="w-full h-full relative overflow-hidden flex flex-col justify-center items-center">
                            <SkeletonContent localClockType={localClockType} timerSize={remoteState?.timerSize} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RemoteTimerPane;
