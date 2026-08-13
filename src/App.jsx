import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useUnreadMessages } from './hooks/useUnreadMessages';

import { Play, Pause, RotateCcw, Settings, X, Plus, Music, SkipForward, SkipBack, Check, Trash2, BarChart2, Zap, Coffee, Flame, CheckSquare, Clock, Sparkles, Loader2, RotateCw, GripVertical, ArrowRight, ArrowDown, Pencil, LogIn, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, UserPlus, Circle, Pin, UserMinus, Maximize, Minimize, AlertTriangle, ShieldAlert, Lock, Unlock, Volume2, Bold, Italic, List, StickyNote as StickyNoteIcon, VolumeX, LogOut, GripHorizontal, ChevronUp, ChevronDown, Ban, Bell, Download, Brain, Video, CheckCircle2, Crown, TrendingUp, Gamepad2, CloudRain, Keyboard } from 'lucide-react';
import { supabase } from './lib/supabase';
import { SocialService } from './services/socialService';
import { UserService } from './services/userService';
import { usePiP } from './hooks/usePiP';
import { PictureInPicture2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import CloseButton from './components/ui/CloseButton';
import { RoomsService } from './services/roomsService';
import { useRoomSync } from './hooks/useRoomSync';
import RoomInviteToast from './components/social/RoomInviteToast';
import RemoteTimerPane from './components/RemoteTimerPane';
import { Storage } from './utils/storage';
const UnifiedSettingsModal = lazy(() => import('./components/modals/UnifiedSettingsModal'));
const CommandMenu = lazy(() => import('./components/CommandMenu').then(module => ({ default: module.CommandMenu })));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'));
import IntentionWizard from './components/IntentionWizard';
import HoloNote from './components/HoloNote';
import HoloGrainBackground from './components/HoloGrainBackground';
import SmartIntervention from './components/SmartIntervention';
import BreakCheckIn from './components/BreakCheckIn'; // NEW
const MusicModal = lazy(() => import('./components/modals/MusicModal'));
const SocialProfileModal = lazy(() => import('./components/modals/SocialProfileModal'));
const SocialModal = lazy(() => import('./components/modals/SocialModal'));
import Avatar from './components/Avatar';
import { BACKGROUND_OPTIONS, AMBIENT_SOUNDS, MUSIC_TRACKS, ALARM_SOUNDS } from './utils/data';
const SnakeIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M21 7H17V11H13V15H9V19H3V15H7V11H11V7H15V3H21V7Z" fill="currentColor" />
    <circle cx="18.5" cy="5.5" r="1.5" fill="black" fillOpacity="0.5" />
  </svg>
);
const SnakeGame = lazy(() => import('./components/games/SnakeGame'));
const TypingGame = lazy(() => import('./components/games/TypingGame'));
import TaskReminderSystem from './components/TaskReminderSystem';
import CountdownTimer from './components/CountdownTimer';
import { PiPOverlay } from './components/PiPOverlay';
// import { VideoManager } from './components/video/VideoManager';
// import VideoPipWindow from './components/video/VideoPipWindow';
import FriendsDock from './components/social/FriendsDock';
import './components/video/video-styles.css';
import { FlowTag } from './components/ui/FlowTag';
const ReleaseNotesPage = lazy(() => import('./pages/ReleaseNotesPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'));
const WindowsPromoModal = lazy(() => import('./components/modals/WindowsPromoModal'));








import AppLoader from './components/ui/AppLoader';
import RevealLogo from './components/ui/RevealLogo';
import SmartMessage from './components/timer/SmartMessage';
import GetProModal from './components/modals/GetProModal';
import { StrictConfirmationModal, StrictWarningModal, StrictDisableModal } from './components/modals/StrictModals';
import { LiquidDeleteBtn, LiquidResetBtn, LiquidStrictBtn } from './components/ui/LiquidButtons';
import TimerModeSelector from './components/timer/TimerModeSelector';
import { StickyNote, StickyNoteWidget, NOTE_COLORS } from './components/notes/StickyNoteWidget';
import { Toggle, SegmentedToggle, StatCard, SpotifyIcon, BendingDivider, ExtraTimePopup, CalendarView, PersonalityCard } from './components/timer/TimerWidgets';
import NoteSystemModals from './components/notes/NoteSystemModals';

const isVideo = (url) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|mov)(\?.*)?$/i);
};

const formatDateId = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


// Update the props to include 'background'
const GameCenter = ({ mode, timeLeft, background, isPro, onOpenPro }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState(null);

  if (mode === 'focus') return null;

  const handleGameClick = (gameId) => {
    if (gameId === 'snake') {
      setActiveGame('snake');
    } else {
      if (isPro) {
        setActiveGame(gameId);
      } else {
        onOpenPro();
      }
    }
  };

  return (
    <>
      {/* TRIGGER PILL - No longer unmounts when open, no layoutId */}
      <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isOpen && (
            <motion.div
              key="game-pill"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              <motion.button
                // layoutId="game-container" <--- REMOVED to stop portal effect
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group flex items-center gap-3 px-6 py-3 bg-[#111] border border-white/10 hover:border-white/30 rounded-full shadow-2xl backdrop-blur-md overflow-hidden transition-colors"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0%,rgba(59,130,246,0.15)_50%,rgba(34,197,94,0.15)_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Gamepad2 size={18} className="text-white/80 group-hover:text-white relative z-10 transition-colors" />
                <span className="text-xs font-bold text-white/80 group-hover:text-white relative z-10 tracking-widest uppercase transition-colors whitespace-nowrap">Play Arcade</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL - Standard Fade In/Out */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="arcade-modal"
              key="arcade-modal"
              // layoutId="game-container" <--- REMOVED
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-md" // Standard backdrop
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => !activeGame && setIsOpen(false)}
            >
              {activeGame === 'snake' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} // Optimized transition
                  className="w-full h-full max-w-5xl max-h-[90vh] bg-[#111] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Suspense fallback={null}>
                    <SnakeGame onExit={() => setActiveGame(null)} timeLeft={timeLeft} />
                  </Suspense>
                </motion.div>
              ) : activeGame === 'typing' ? (
                <Suspense fallback={null}>
                  <TypingGame onExit={() => setActiveGame(null)} timeLeft={timeLeft} />
                </Suspense>
              ) : (
                // --- GAME MENU ---
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} // Optimized transition
                  className="w-full max-w-5xl flex flex-col items-center max-h-full overflow-y-auto custom-scrollbar"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* ... (Existing Menu Content - No changes needed inside) ... */}
                  <div className="w-full flex justify-between items-center mb-12 px-4 shrink-0">
                    <div className="flex flex-col">
                      <h2 className="text-4xl md:text-5xl font-serif text-white mb-2">Arcade</h2>
                      <p className="text-white/40 text-sm">Non-distracting games that help you recharge without getting bored.</p>
                    </div>
                    <CloseButton onClick={() => setIsOpen(false)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-4 pb-10">
                    {/* ... (Keep your existing Cards code here) ... */}
                    <motion.button onClick={() => handleGameClick('snake')} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} className="aspect-[4/3] bg-[#0a0a0a] border border-white/10 hover:border-green-500/50 rounded-[32px] p-8 flex flex-col justify-between group relative overflow-hidden transition-colors">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="w-16 h-16 bg-green-900/20 border border-green-500/20 rounded-2xl flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 group-hover:bg-green-500 group-hover:text-black transition-all duration-300 shadow-[0_0_30px_rgba(34,197,94,0.1)] group-hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"><SnakeIcon size={32} /></div>
                      <div className="text-left relative z-10"><h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">Snake</h3><p className="text-white/40 text-sm leading-relaxed">The classic retro challenge.</p></div>
                    </motion.button>

                    <motion.button onClick={() => handleGameClick('typing')} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} className="aspect-[4/3] bg-[#0a0a0a] border border-white/10 hover:border-cyan-500/50 rounded-[32px] p-8 flex flex-col justify-between group relative overflow-hidden transition-colors">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {!isPro && (<div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md"><Lock size={14} className="text-white/70" /></div>)}
                      <div className="w-16 h-16 bg-cyan-900/20 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300 shadow-[0_0_30px_rgba(34,211,238,0.1)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"><Keyboard size={32} /></div>
                      <div className="text-left relative z-10"><h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Typeshit</h3><p className="text-white/40 text-sm leading-relaxed">Find flow through words.</p></div>
                    </motion.button>

                    <motion.button onClick={() => handleGameClick('coming-soon')} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} className="aspect-[4/3] bg-white/5 border border-dashed border-white/10 hover:border-white/30 rounded-[32px] p-8 flex flex-col justify-between group relative overflow-hidden transition-colors">
                      {!isPro && (<div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md"><Lock size={14} className="text-white/70" /></div>)}
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 mb-6 group-hover:scale-110 group-hover:bg-white/10 group-hover:text-white transition-all duration-300"><Sparkles size={32} /></div>
                      <div className="text-left relative z-10"><h3 className="text-2xl font-bold text-white/50 mb-2 group-hover:text-white transition-colors">Multiplayer</h3><p className="text-white/20 text-sm leading-relaxed">Coming Soon.</p></div>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
// A visible, compliant mini-player for Desktop
// A visible, compliant mini-player for Desktop
const MiniLofiPlayer = ({ isPlaying, onToggle, volume }) => {
  const iframeRef = useRef(null);

  // Sync Volume to YouTube Embed
  useEffect(() => {
    if (iframeRef.current && isPlaying) {
      // YouTube expects an integer 0-100
      const vol = Math.floor(volume * 100);
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'setVolume',
          args: [vol]
        }),
        '*'
      );
    }
  }, [volume, isPlaying]);

  return (
    <AnimatePresence>
      {isPlaying && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-24 z-50 hidden md:block"
        >
          <div className="relative w-80 aspect-video shadow-2xl group">
            <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20 bg-black">
              <iframe
                ref={iframeRef}
                className="w-full h-full"
                // Added enablejsapi=1 to allow volume control
                src="https://www.youtube.com/embed/X4VbdwhkE10?enablejsapi=1&autoplay=1&controls=0&mute=0&loop=1&playlist=X4VbdwhkE10"
                title="Lofi Girl Mini"
                frameBorder="0"
                allow="autoplay; encrypted-media;"
              />
            </div>
            <CloseButton onClick={onToggle} className="absolute -top-3 -right-3 shadow-lg bg-black border border-white/20" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DEFAULT_STATS = {
  dailyFocusTime: 0,
  dailyBreakTime: 0,
  dailySessions: 0,
  dailyStopwatchTime: 0,
  currentStreak: 0,
  lastActiveDate: null
};

function MainApp() {


  const { isActive: isPiPActive, togglePiP, PiPPortal } = usePiP();
  /* --- PIP VIDEO PAUSE LOGIC --- */
  const mainVideoRef = useRef(null);

  useEffect(() => {
    if (mainVideoRef.current) {
      if (isPiPActive) {
        mainVideoRef.current.pause();
      } else {
        mainVideoRef.current.play().catch(e => console.log("Video autoplay prevented:", e));
      }
    }
  }, [isPiPActive]);

  /* --- EXISTING STATE --- */

  const [user, setUser] = useState(null);
  const { totalUnread: unreadCount, markAsRead, getLastReadTime, unreadCounts, mentionCounts, totalMentions } = useUnreadMessages(user);
  const [onboardingStep, setOnboardingStep] = useState(() => {
    const hasHandle = localStorage.getItem('zen_user_handle'); // <--- CHECK THIS
    return hasHandle ? 3 : (localStorage.getItem('pomodoro_user_name') ? 3 : 0);
  });
  const [onboardingInnerStep, setOnboardingInnerStep] = useState(0);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const DEFAULT_SETTINGS = { focus: 25, shortBreak: 5, longBreak: 15, autoStartBreaks: false, autoStartWork: false, pomosBeforeLongBreak: 4, background: 'https://mdqrytgnmhdieszgtznf.supabase.co/storage/v1/object/public/timer-backgrounds/lakeside.avif', alarmSound: 'digital', alarmVolume: 0.5, defaultCurrency: null };
  const [initialState] = useState(loadTimerState);
  const [mode, setMode] = useState(initialState?.mode || 'focus');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft ?? DEFAULT_SETTINGS.focus * 60);
  const [isActive, setIsActive] = useState(initialState?.isActive || false);
  const [timerResetKey, setTimerResetKey] = useState(0);
  const [focusMode, setFocusMode] = useState(false);

  // Ref to hold lateast state for Sync Replies without re-running effects
  const latestStateRef = useRef({ isActive: false, mode: 'focus', timeLeft: 25 * 60 });
  // Update this ref whenever state changes
  useEffect(() => {
    latestStateRef.current = { isActive, mode, timeLeft };
  }, [isActive, mode, timeLeft]);






  // --- CAFFEINE TRACKER ---


  // --- PROFILE VIEW STATE ---
  const [viewingProfile, setViewingProfile] = useState(null);

  // --- CACHE-FIRST STATE INITIALIZATION ---
  const [notes, setNotes] = useState(Storage.getNotes());
  const [tasks, setTasks] = useState(Storage.getTasks());
  const [habits, setHabits] = useState(Storage.getHabits());

  const handleUpdateTasks = (newTasks) => {
    setTasks(newTasks);
    Storage.saveTasksLocally(newTasks);
  };

  const handleUpdateHabits = (newHabits) => {
    setHabits(newHabits);
    Storage.saveHabitsLocally(newHabits);
  };

  const [isNoteLibraryOpen, setIsNoteLibraryOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // If null -> New Note

  const [settings, setSettings] = useState(() => Storage.getSettings(DEFAULT_SETTINGS));
  const [settingsTab, setSettingsTab] = useState('preferences');

  // Lakeside Background Migration (One-time override for existing users)
  useEffect(() => {
    if (!localStorage.getItem('lakeside_forced_v1')) {
      setSettings(prev => {
        const newSettings = { ...prev, background: 'https://mdqrytgnmhdieszgtznf.supabase.co/storage/v1/object/public/timer-backgrounds/lakeside.avif' };
        Storage.saveSettingsLocally(newSettings);
        return newSettings;
      });
      localStorage.setItem('lakeside_forced_v1', 'true');
    }
  }, []);


  // --- ROOM SYNC STATE ---
  const [activeRoomId, setActiveRoomId] = useState(() => localStorage.getItem('datimer_activeRoomId') || null);
  const [isRoomHost, setIsRoomHost] = useState(() => localStorage.getItem('datimer_isRoomHost') === 'true');
  const [remoteRoomUserId, setRemoteRoomUserId] = useState(() => localStorage.getItem('datimer_remoteRoomUserId') || null);
  const [incomingRoomInvite, setIncomingRoomInvite] = useState(null);
  const [isSeamlessPanorama, setIsSeamlessPanorama] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (activeRoomId) {
      localStorage.setItem('datimer_activeRoomId', activeRoomId);
      localStorage.setItem('datimer_isRoomHost', isRoomHost);
      if (remoteRoomUserId) localStorage.setItem('datimer_remoteRoomUserId', remoteRoomUserId);
    } else {
      localStorage.removeItem('datimer_activeRoomId');
      localStorage.removeItem('datimer_isRoomHost');
      localStorage.removeItem('datimer_remoteRoomUserId');
    }
  }, [activeRoomId, isRoomHost, remoteRoomUserId]);

  // On-Mount Validation
  useEffect(() => {
    const validateRoom = async () => {
      const storedRoomId = localStorage.getItem('datimer_activeRoomId');
      if (!storedRoomId) return;

      const { success, room, error } = await RoomsService.getRoom(storedRoomId);
      
      if (!success) {
        if (error?.code === 'PGRST116') {
          console.warn("[Room] Room deleted. Clearing state.", error);
          setActiveRoomId(null);
          handleRoomClosed(storedRoomId);
          return;
        }
        console.warn("[Room] Network error during validation. Preserving state.", error);
        return; 
      }
      
      if (!room) {
        setActiveRoomId(null);
        return;
      }

      const getExpirationTime = (state) => {
          if (!state || !state.isActive) return null;
          if (state.mode === 'stopwatch') return Infinity;
          return state.serverEndTime || Infinity;
      };

      const hostExp = getExpirationTime(room.host_timer_state);
      const guestExp = getExpirationTime(room.participant_timer_state);
      
      const hostIsPaused = !room.host_timer_state?.isActive;
      const guestIsPaused = !room.participant_timer_state?.isActive;

      let maxExpiration = -Infinity;
      if (!hostIsPaused && hostExp !== null) maxExpiration = Math.max(maxExpiration, hostExp);
      if (!guestIsPaused && guestExp !== null) maxExpiration = Math.max(maxExpiration, guestExp);

      const now = RoomsService.getSyncedTime();
      let shouldDelete = false;

      if (maxExpiration === -Infinity) {
          // Both paused. Check if updated_at is > 15 mins old
          const lastUpdate = new Date(room.updated_at).getTime();
          if (now - lastUpdate > 15 * 60 * 1000) {
              shouldDelete = true;
          }
      } else if (maxExpiration !== Infinity) {
          // Someone was running a countdown. Has it been 15 mins since it naturally expired?
          if (now > maxExpiration + 15 * 60 * 1000) {
              shouldDelete = true;
          }
      }

      if (shouldDelete) {
        console.log("[Room] Abandoned/Expired room detected on mount. Cleaning up.");
        RoomsService.leaveRoom(storedRoomId);
        setActiveRoomId(null);
      }
    };
    validateRoom();
  }, []);

  // --- DEV TOOLS ---
  const [isDevSplit, setIsDevSplit] = useState(false);
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isSplitScreen = !!activeRoomId || isDevSplit;

  // Pull Tab hover-to-reveal state
  const [showPullTab, setShowPullTab] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [isPaneAnimating, setIsPaneAnimating] = useState(false);
  const [tabLinger, setTabLinger] = useState(false);

  useEffect(() => {
    let timeout;
    if (isPaneAnimating) {
      setTabLinger(true);
    } else {
      timeout = setTimeout(() => {
        setTabLinger(false);
      }, 2500); // Keep tab visible for 2.5s after animation finishes
    }
    return () => clearTimeout(timeout);
  }, [isPaneAnimating]);

  useEffect(() => {
    if (!isSplitScreen) {
      setShowPullTab(false);
      return;
    }
    const handleMouseMove = (e) => {
      // The tab is at exactly (window.innerWidth / 2, window.innerHeight / 2).
      // Calculate radial distance to create a circular "safe zone" around the tab itself.
      const tabX = window.innerWidth / 2;
      const tabY = window.innerHeight / 2;
      const distance = Math.sqrt(Math.pow(e.clientX - tabX, 2) + Math.pow(e.clientY - tabY, 2));
      
      // Reveal if cursor is within 180px of the center
      const shouldShow = distance < 180;
      setShowPullTab(prev => (prev !== shouldShow ? shouldShow : prev));
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isSplitScreen]);

  // NTP Clock Sync
  const [serverClockSynced, setServerClockSynced] = useState(false);
  useEffect(() => {
    setServerClockSynced(false);
    RoomsService.syncClock().then(() => setServerClockSynced(true));
  }, [activeRoomId]); // FIX #10: Re-sync on room join

  // Track timeLeft in a ref so we can use it in memo closures without adding it as a dependency
  // This prevents broadcasting to the DB every single second during a countdown, while ensuring
  // we always capture the absolute latest time if a broadcast IS triggered by another dependency.
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Ref + state trigger for pomoCount (declared later at line ~3125, but needed in localTimerState memo)
  const pomoCountRef = useRef(0);
  const [pomoCountTrigger, setPomoCountTrigger] = useState(0);

  // NEW: Track ACTUAL total duration of the current session (for progress bar when time is edited)
  const [currentSessionTotalDuration, setCurrentSessionTotalDuration] = useState(null);

  // Prepare Local Timer State for broadcasting
  // Only capture timeLeft when paused to avoid broadcasting every second during countdown
  const pausedTimeLeft = isActive ? null : timeLeftRef.current;
  const localTimerState = React.useMemo(() => {
    if (!activeRoomId) return null; // FIX #5: Gate behind roomId
    
    // FIX: Always send the correct base duration so the remote progress bar calculates correctly
    const defaultDuration = mode === 'focus' ? settings.focus * 60 : (mode === 'shortBreak' ? settings.shortBreak * 60 : settings.longBreak * 60);
    const actualTotalDuration = currentSessionTotalDuration || defaultDuration;

    return {
      isActive,
      remainingDuration: (isActive ? timeLeftRef.current : pausedTimeLeft) * 1000,
      totalDuration: actualTotalDuration,
      serverEndTime: isActive ? RoomsService.getSyncedTime() + (timeLeftRef.current * 1000) : null,
      mode,
      background: settings.background,
      pomoCount: pomoCountRef.current,
      pomosBeforeLongBreak: settings.pomosBeforeLongBreak
    };
  }, [activeRoomId, isActive, pausedTimeLeft, mode, settings.background, settings.focus, settings.shortBreak, settings.longBreak, currentSessionTotalDuration, serverClockSynced, pomoCountTrigger, settings.pomosBeforeLongBreak]);

  const handleRoomClosed = React.useCallback(() => setActiveRoomId(null), []);
  useRoomSync(activeRoomId, isRoomHost, localTimerState, handleRoomClosed);

  // Room Join & Invite Listeners
  useEffect(() => {
    if (!user) return;

    const handleJoinRoom = (e) => {
      // If host, don't split yet — wait for participant to accept
      if (e.detail.isHost) {
        // Store pending room info, listen for participant acceptance
        const pendingRoomId = e.detail.roomId;
        const pendingRemoteUserId = e.detail.remoteUserId;
        
        const acceptChannel = supabase.channel(`room_accept:${pendingRoomId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${pendingRoomId}` }, (payload) => {
            // Y accepted — their timer state is now in the room
            if (payload.new.participant_timer_state) {
              setActiveRoomId(pendingRoomId);
              setIsRoomHost(true);
              setRemoteRoomUserId(pendingRemoteUserId);
              supabase.removeChannel(acceptChannel);
            }
          })
          .on('broadcast', { event: 'room_declined' }, async () => {
            console.log("[Rooms] Invite was declined by participant");
            // They declined. We (the host) should delete the DB row safely
            await RoomsService.leaveRoom(pendingRoomId);
            supabase.removeChannel(acceptChannel);
          })
          .subscribe();
        
        // Store cleanup in case component unmounts
        return () => supabase.removeChannel(acceptChannel);
      } else {
        // Participant joining — split immediately (they accepted)
        setActiveRoomId(e.detail.roomId);
        setIsRoomHost(e.detail.isHost);
        setRemoteRoomUserId(e.detail.remoteUserId);
      }
    };
    window.addEventListener('join_room', handleJoinRoom);

    // FIX #3: Listen for invites via postgres_changes on the `rooms` table
    // instead of unreliable ephemeral broadcasts.
    const channel = supabase.channel(`invites:${user.uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms', filter: `participant_id=eq.${user.uid}` }, (payload) => {
        setIncomingRoomInvite(payload.new);
      })
      .subscribe();

    // Catch-up sync: Fetch any invites missed while offline
    const fetchPendingInvites = async () => {
      const { success, invite } = await RoomsService.getPendingInvite(user.uid, activeRoomId);
      if (success && invite) {
        setIncomingRoomInvite(invite);
      }
    };
    fetchPendingInvites();

    return () => {
      window.removeEventListener('join_room', handleJoinRoom);
      supabase.removeChannel(channel);
    };
  }, [user?.uid]);


  // --- INTENTION MODE STATE ---
  const [intentionTask, setIntentionTask] = useState(() => localStorage.getItem('zen_intention_task') || "");


  // Dynamic Reminder Logic
  const [remindMessage, setRemindMessage] = useState("");

  useEffect(() => {
    if (settings.intentionMode && intentionTask && !isActive) {
      const templates = [
        `Remember why you started: ${intentionTask}`,
        `Don't lose track of ${intentionTask}`,
        `Stay consistent with ${intentionTask}`,
        `You committed to ${intentionTask}`,
        `Pause, breathe, then ${intentionTask}`
      ];
      const randomMsg = templates[Math.floor(Math.random() * templates.length)];
      setRemindMessage(randomMsg);
    }
  }, [isActive, settings.intentionMode, intentionTask]);



  const handleApplyAction = (actionText) => {
    // Extract numbers if present
    const match = actionText.match(/\d+/);
    const val = match ? parseInt(match[0]) : null;

    if (actionText.includes("Focus") && val) {
      // FIX: Only change CURRENT session duration, do NOT save to global settings
      // const newSettings = { ...settings, focus: val };
      // handleSettingsSave(newSettings);
      handleModeChange('focus'); // Switch to focus mode first
      setTimeLeft(val * 60);     // Override time
      setIsActive(true);         // Auto-start
    } else if (actionText.includes("Break") && val) {
      // FIX: Only change CURRENT session duration, do NOT save to global settings
      // const newSettings = { ...settings, shortBreak: val };
      // handleSettingsSave(newSettings);
      handleModeChange('shortBreak');
      setTimeLeft(val * 60);
      setIsActive(true);
    } else if (actionText.includes("Resume")) {
      if (!isActive) toggleTimer();
    } else if (actionText.includes("Switch")) {
      // "Switch to 50/10" -> Complex parsing, maybe skip for now or assume simple toggle
      // For now, minimal support
    }
  };

  const handleIntentionComplete = async (task, durationInput) => {
    setIntentionTask(task);
    localStorage.setItem('zen_intention_task', task);

    let newFocus = settings.focus;
    let newShortBreak = settings.shortBreak;
    let newPomos = settings.pomosBeforeLongBreak;

    // Manual Parsing Logic
    let minutes = settings.focus;
    if (durationInput) {
      const lower = durationInput.toLowerCase();
      const val = parseFloat(lower);
      if (!isNaN(val)) {
        if (lower.includes('h') || lower.includes('hr')) {
          minutes = Math.round(val * 60);
        } else {
          minutes = Math.round(val);
        }
      }
    }
    if (minutes > 45) {
      newFocus = 50;
      newShortBreak = 10;
    } else {
      newFocus = minutes;
    }

    const newSettings = {
      ...settings,
      focus: newFocus,
      shortBreak: newShortBreak,
      pomosBeforeLongBreak: newPomos
    };
    handleSettingsSave(newSettings);

    setTimeLeft(newFocus * 60);
    setMode('focus');
    setIsActive(false);
    setHasStartedSession(false); // Reset session start tracking
  };

  const handleIntentionCancel = () => {
    // ONLY cancels the wizard setup.
    const newSettings = { ...settings, intentionMode: false };
    handleSettingsSave(newSettings);
    setIntentionTask("");
    localStorage.removeItem('zen_intention_task');
  };

  const [pomoCount, setPomoCount] = useState(initialState?.pomoCount || 0);
  useEffect(() => { pomoCountRef.current = pomoCount; setPomoCountTrigger(prev => prev + 1); }, [pomoCount]);
  const [hoveredDockIndex, setHoveredDockIndex] = useState(null);
  // Load Stats from Cache
  const [stats, setStats] = useState(() => {
    // --- FIX: Force Check Daily Reset on Load ---
    Storage.checkDailyReset();

    // Attempt to load today's stats from LS, otherwise default
    const local = localStorage.getItem('zen_stats_current');
    return local ? { ...DEFAULT_STATS, ...JSON.parse(local) } : DEFAULT_STATS;
  });

  // --- FIX: Hydrate History from Server on Load ---
  useEffect(() => {
    const syncHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Fetch all history
          const { success, data } = await UserService.getHistory(user.id);
          if (success && data) Storage.hydrateHistory(data);
        } catch (e) {
          console.error("History Sync Failed", e);
        }
      }
    };
    syncHistory();
  }, [onboardingStep]);

  // --- SYNC NOTES ON LOAD (Fix for Deletion Sync) ---
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const syncNotes = async () => {
      try {
        const { success, data } = await UserService.getSettings(user.uid, 'notes');

        if (success && data) {
          // Sync Notes - Force update even if empty (handles deletions)
          const serverNotes = data.notes || [];
          setNotes(serverNotes);
          Storage.saveNotesLocally(serverNotes);
        } else if (success && !data) {
          // If no row exists in user_settings, it means no notes on server.
          // If we trust server as source of truth for DELETIONS, we should clear local.
          // BUT, this risks wiping data for new offline users. 
          // However, for the specific bug "I deleted on phone, still on web", the phone would have upserted an empty list or deleted the row.
          // If the row is gone, we can assume empty notes.
          console.log("No user_settings found, assuming empty notes.");
          setNotes([]);
          Storage.saveNotesLocally([]);
        }
      } catch (e) {
        console.error("User Settings Sync Failed", e);
      }
    };

    syncNotes();
  }, [user]);

  const handleProfileUpdate = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
    setViewingProfile(prev => {
      // Since the update came from the active profile modal (which only allows editing self),
      // we can safely update the viewingProfile if it exists.
      if (prev) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  };


  const [customBackgrounds, setCustomBackgrounds] = useState(() => { try { const saved = localStorage.getItem('zen_custom_bgs'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; } });
      const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [isPro, setIsPro] = useState(() => Storage.peekProStatus());
  const [proModalSource, setProModalSource] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [unlockedAmbiences, setUnlockedAmbiences] = useState(settings?.preferences?.unlockedAmbiences || []);
  const [ambienceSetupDone, setAmbienceSetupDone] = useState(settings?.preferences?.ambienceSetupDone || false);

  // Sync unlocked ambiences from settings updates (e.g. from Supabase)
  useEffect(() => {
    if (settings?.preferences) {
      const prefs = settings.preferences;
      if (prefs.unlockedAmbiences && JSON.stringify(prefs.unlockedAmbiences) !== JSON.stringify(unlockedAmbiences)) {
        setUnlockedAmbiences(prefs.unlockedAmbiences);
      }
      if (prefs.ambienceSetupDone !== undefined && prefs.ambienceSetupDone !== ambienceSetupDone) {
        setAmbienceSetupDone(prefs.ambienceSetupDone);
      }
    }
  }, [settings, unlockedAmbiences, ambienceSetupDone]);
  const [isTallyHovered, setIsTallyHovered] = useState(false);

  const skipStatsRef = useRef({ attempted: 0, skipped: 0 });

  // Restore skipStats on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zen_timer_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.skipStats) {
          skipStatsRef.current = parsed.skipStats;
        }
      }
    } catch (e) { console.error("Error restoring stats", e); }
  }, [onboardingStep]);

  // --- SHOPIFY SUBSCRIPTION SYNC ---
  useEffect(() => {
    if (!user) return;

    // 1. Initial Check: Always trust the server on load
    const fetchProStatus = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', user.uid)
        .single();

      if (data && !error) {
        setIsPro(data.is_pro);
        // Also update local storage to keep it somewhat fresh for next boot
        if (data.is_pro !== isPro) {
          Storage.saveProStatus(data.is_pro);
        }
      }
    };
    fetchProStatus();

    // 2. Real-time Listener: Handle Upgrades AND Downgrades
    const profileSync = supabase
      .channel('public:profiles_pro_check')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.uid}`
        },
        (payload) => {
          const newStatus = payload.new.is_pro;
          setIsPro(newStatus);
          Storage.saveProStatus(newStatus); // Sync local storage

          if (newStatus) {
            setProModalSource(null); // Close modal if they just bought it
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSync);
    };
  }, [user]);


  const [editingModeId, setEditingModeId] = useState(null);
  const [editInputValue, setEditInputValue] = useState("");

  const [isEditingSessions, setIsEditingSessions] = useState(false);
  const [sessionEditValue, setSessionEditValue] = useState("");


  // FIX: Track if session has actually started to prevent premature interventions
  const [hasStartedSession, setHasStartedSession] = useState(false);

  // --- QUICKLINKS STATE (New Feature) ---
  const [quicklinks, setQuicklinks] = useState(() => Storage.getQuicklinks());

  useEffect(() => {
    if (quicklinks) {
      Storage.saveQuicklinksLocally(quicklinks);
    }
  }, [quicklinks]);

  // NEW: Track AI Planning State for Visual Feedback



  const commitSessionEdit = () => {
    const val = parseInt(sessionEditValue, 10);
    // Limit between 1 and 12 sessions for UI sanity
    if (!isNaN(val) && val > 0 && val <= 16 && val !== settings.pomosBeforeLongBreak) {
      const newSettings = { ...settings, pomosBeforeLongBreak: val };
      handleSettingsSave(newSettings);
    }
    setIsEditingSessions(false);
  };

  const commitInlineEdit = () => {
    if (!editingModeId) return;

    const val = parseInt(editInputValue, 10);

    // Validation: Must be number, > 0, and different from current
    if (!isNaN(val) && val > 0 && val !== settings[editingModeId]) {
      const newSettings = { ...settings, [editingModeId]: val };
      // Reuse your existing robust save handler
      handleSettingsSave(newSettings);
    }

    setEditingModeId(null);
  };

  // --- USER ACTIVITY TRACKER (For Cinematic Mode) ---
  const [isUserActive, setIsUserActive] = useState(true);
  const activityTimeoutRef = useRef(null);

  useEffect(() => {
    const handleActivity = () => {
      // 1. Wake up the UI immediately
      setIsUserActive(true);

      // 2. Clear any existing sleep timer
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);

      // 3. Set a new sleep timer (3 seconds)
      // Only if we are actually in Focus Mode (otherwise UI stays always on)
      if (focusMode) {
        activityTimeoutRef.current = setTimeout(() => {
          setIsUserActive(false);
        }, 3000);
      }
    };

    if (focusMode) {
      // If Focus Mode is ON, listen for movement to wake up/sleep
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('keydown', handleActivity);

      // Start the countdown immediately upon entering focus mode
      handleActivity();
    } else {
      // If Focus Mode is OFF, UI is always active
      setIsUserActive(true);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, [focusMode]);

  // Helper variable for cleaner JSX
  // If Focus Mode is OFF, or User IS Active -> Show UI (Opacity 100)
  // Otherwise -> Hide UI (Opacity 0)
  const uiOpacityClass = (!focusMode || isUserActive) ? 'opacity-100' : 'opacity-0';



  // --- OPTIMIZED SYNC: Run ONCE on mount ---
  // --- OPTIMIZED SYNC: Run ONCE on mount ---
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const checkAndMigrateProfile = async () => {
      try {
        // Check if profile exists in Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, handle, is_pro')
          .eq('id', user.uid)
          .single();

        if (!profile && !error) {
          // Case 1: No Profile -> New User logic
          console.log("No profile found, redirecting to onboarding...");
          setOnboardingStep(1);

        } else if (profile) {
          // Case 2: Profile Exists

          // A. Sync Server Status to Local Cache
          if (profile.is_pro) {
            // If DB says Pro, ensure LocalStorage agrees (restore logic)
            setIsPro(true);
            Storage.saveProStatus(true); // Helper to save claim
          }

          // B. Handle Check
          if (!profile.handle) {
            // If profile exists but no handle, go to onboarding
            setOnboardingStep(1);
          }
          // Else, all good.
        }
      } catch (e) {
        console.error("Profile check failed:", e);
      }
    };

    checkAndMigrateProfile();
  }, [user]);


  const handleReorderNotes = (newOrder) => {
    setNotes(newOrder);
  };

  const saveNotesOrder = async (currentNotes) => {
    // 1. Save to LocalStorage
    Storage.saveNotesLocally(currentNotes);

    // 2. Save to DB
    if (user && !user.isAnonymous) {
      try {
        await UserService.upsertSettings({
          user_id: user.uid,
          notes: currentNotes,
          updated_at: new Date()
        });
      } catch (e) { console.error("Reorder failed", e); }
    }
  };

  const handleSaveNote = async (note) => {
    // 1. OPTIMISTIC UPDATE
    const exists = notes.some(n => n.id === note.id);
    const updatedNotes = exists
      ? notes.map(n => (n.id === note.id ? note : n))
      : [note, ...notes];

    setNotes(updatedNotes);

    // 2. SAVE TO LOCAL STORAGE
    Storage.saveNotesLocally(updatedNotes);

    // 3. SYNC TO DB
    if (user && !user.isAnonymous) {
      try {
        await UserService.upsertSettings({
          user_id: user.uid,
          notes: updatedNotes,
          updated_at: new Date()
        });
      } catch (e) {
        console.error("Note sync failed:", e);
      }
    }
  };

  const handleDeleteNote = async (noteId) => {
    // 1. Remove from Active Notes
    const updatedNotes = notes.filter(n => n.id !== noteId);

    // 2. Add to Trash Ledger
    const localTrash = Storage.getTrash();
    const updatedTrash = { ...localTrash, [noteId]: Date.now() };

    setNotes(updatedNotes);

    // 3. Save Both to Local Storage
    Storage.saveNotesLocally(updatedNotes);
    Storage.saveTrashLocally(updatedTrash);

    // 4. Sync Both to DB
    if (user && !user.isAnonymous) {
      try {
        await UserService.upsertSettings({
          user_id: user.uid,
          notes: updatedNotes,
          updated_at: new Date()
        });
      } catch (e) {
        console.error("Delete failed", e);
      }
    }
  };

  // --- AUDIO REFS ---
  const musicAudioRef = useRef(new Audio());
  const ambienceRefs = useRef({});// NEW: Separate Engine for Ambience

  // --- AUDIO STATE ---
  const [volume, setVolume] = useState(() => Storage.getVolume());



  // 1. MUSIC (Focus Tracks)
  // 1. MUSIC (Focus Tracks)
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);

  // 2. AMBIENCE (Rain, Wind, etc.) - NEW

  const [ambienceState, setAmbienceState] = useState({});

  // 3. LOFI GIRL
  const [isLofiPlaying, setIsLofiPlaying] = useState(false);


  // --- VOLUME SYNC ---
  useEffect(() => {
    if (musicAudioRef.current) musicAudioRef.current.volume = volume;
    // Ambience volumes are handled individually now
  }, [volume]);

  // --- AUDIO EVENT LISTENERS (Setup for both engines) ---
  useEffect(() => {
    const audio = musicAudioRef.current;
    const onTime = () => setMusicProgress(audio.currentTime);
    const onMeta = () => setMusicDuration(audio.duration);
    const onEnd = () => setIsMusicPlaying(false);
    const onWait = () => setMusicLoading(true);
    const onCanPlay = () => setMusicLoading(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('waiting', onWait);
    audio.addEventListener('playing', onCanPlay);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('waiting', onWait);
      audio.removeEventListener('playing', onCanPlay);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, []);
  // --- SOCIAL STATE ---
  const [showFriends, setShowFriends] = useState(false);
  const [socialInitialServerId, setSocialInitialServerId] = useState(null);
  const [socialInitialTab, setSocialInitialTab] = useState(null);
  const [socialView, setSocialView] = useState('list');

  // --- SMART MENTION NOTIFICATION LOGIC ---
  const prevMentionsRef = useRef(totalMentions);
  const hasPingedRef = useRef(false); // Track if we've pinged for the current "unread batch"
  const prevModeRef = useRef(mode);

  // 1. Reset Ping Suppression when Modal Closes
  useEffect(() => {
    if (!showFriends) {
      // User closed the modal/checked friends -> Reset the suppression so strict helper or next batch can ping
      hasPingedRef.current = false;
    }
  }, [showFriends]);

  // 2. Monitoring Effect
  useEffect(() => {
    const isModeSwitchToBreak = prevModeRef.current === 'focus' && mode !== 'focus';
    const isNewMention = totalMentions > prevMentionsRef.current;

    // RULE: Never ping in Focus
    if (mode === 'focus') {
      prevMentionsRef.current = totalMentions;
      prevModeRef.current = mode;
      return;
    }

    // RULE: If Social Modal is OPEN -> Silence (User is presumably looking at it)
    if (showFriends) {
      prevMentionsRef.current = totalMentions;
      prevModeRef.current = mode;
      return;
    }

    let shouldPing = false;

    // CASE A: Switching to Break with pending mentions
    if (isModeSwitchToBreak && totalMentions > 0) {
      shouldPing = true;
    }
    // CASE B: New Mention received while in Break (and modal closed)
    else if (isNewMention) {
      // Only ping if we haven't suppressed it yet
      // (User requirement: "dont get pinged further until they open the social modal")
      if (!hasPingedRef.current) {
        shouldPing = true;
      }
    }

    if (shouldPing) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869.wav'); // Subtle ping
      audio.volume = 0.5;
      audio.play().catch(e => console.error("Ping failed", e));
      hasPingedRef.current = true; // Suppress future pings until reset via modal open/close
    }

    prevMentionsRef.current = totalMentions;
    prevModeRef.current = mode;
  }, [totalMentions, mode, showFriends]);
  const [friends, setFriends] = useState([]); // List of friend objects with live status

  // --- UNIFIED MODAL STATE & GUEST LOGIC ---
  const [unifiedModalTab, setUnifiedModalTab] = useState('preferences');

  const checkGuestAccess = () => {
    if (user?.isAnonymous) {
      setUnifiedModalTab('account');
      setIsUnifiedModalOpen(true);
      return false;
    }
    return true;
  };
  const [friendUids, setFriendUids] = useState([]); // Just the IDs for listening
  const [viewingFriendStats, setViewingFriendStats] = useState(null); // User object of friend to view stats for


  


  // --- STRICT MODE STATE & LOGIC ---
  const [strictMode, setStrictMode] = useState(() => localStorage.getItem('zen_strict_mode') === 'true');

  











  const [showStrictConfirm, setShowStrictConfirm] = useState(false);
    const [showStrictDisableConfirm, setShowStrictDisableConfirm] = useState(false);





  // --- STRICT MODE LOGIC (UPDATED: EXTENSION BASED) ---
  const strictModeRef = useRef(strictMode);

  // Keep Ref in sync
  useEffect(() => {
    strictModeRef.current = strictMode;
    localStorage.setItem('zen_strict_mode', strictMode);
  }, [strictMode, isActive, mode]);

  const enableStrictMode = () => {
    setStrictMode(true);
    setShowStrictConfirm(false);

    // Sync to Supabase
    syncTimerState({
      isActive,
      mode,
      timeLeft,
      targetEndTime: isActive ? endTimeRef.current : null
    });
  };

  const handleStrictDisable = () => {
    setStrictMode(false);
    setShowStrictDisableConfirm(false);

    // Sync to Supabase
    syncTimerState({
      isActive,
      mode,
      timeLeft,
      targetEndTime: isActive ? endTimeRef.current : null
    });
  };

  // (We deleted handleStrictResume and the "Trap" useEffect because we don't need them anymore)
  const timerIntervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());




  useEffect(() => {
    const handleFullscreenChange = () => {

    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onboardingStep]);

  const playBtnRef = useRef(null);
  const endTimeRef = useRef(null);
  const audioRefs = useRef({});
  const prevSettings = useRef(DEFAULT_SETTINGS);

  const prevNotes = useRef([]);






  // NEW: Windows Promo Popup State
  const [showWindowsPromo, setShowWindowsPromo] = useState(false);


  useEffect(() => {
    // Check if dismissed
    const isDismissed = localStorage.getItem('zen_windows_promo_dismissed');

    // Check if desktop (not strict check, just avoiding mobile for now)
    const isDesktop = window.innerWidth > 768;

    // Check if not already installed (not running in Electron/Windows app)
    // Assuming the Windows app might set a user agent or global variable
    // For now, we just check if we are in a browser
    const isBrowser = !window.navigator.userAgent.includes('Electron');

    // Only show on main screen (after onboarding)
    if (!isDismissed && isDesktop && isBrowser && onboardingStep >= 3) {
      // Show after a slight delay
      const timer = setTimeout(() => {
        setShowWindowsPromo(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [onboardingStep]);

  const handleDismissWindowsPromo = () => {
    setShowWindowsPromo(false);
    localStorage.setItem('zen_windows_promo_dismissed', 'true');
  };

  // --- FOCUS MODE STATE ---


  useEffect(() => {
    // Initialize audio refs for ALL available alarm sounds
    ALARM_SOUNDS.forEach(sound => {
      const audio = new Audio(sound.src);
      audio.preload = 'auto';
      // Volume will be set dynamically on play
      audioRefs.current[sound.id] = audio;
    });
  }, [onboardingStep]); // Run once on mount

  // Update audio source if custom sounds are added (future proofing)
  // or if we needed to reload them. For now, static list is fine.

  // No longer need keys 'focus', 'shortBreak', 'longBreak' mapping to same file.
  // We map by sound ID now.
  useEffect(() => { localStorage.setItem('zen_custom_bgs', JSON.stringify(customBackgrounds)); }, [customBackgrounds]);
  // --- GLOBAL KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyPress = (e) => {
      // 1. BLOCK ALL SHORTCUTS IF GAME IS OPEN
      // This checks if the portal exists OR the specific game container exists
      if (document.getElementById('arcade-modal') || document.getElementById('snake-game-container')) {
        return;
      }

      // 2. Ignore if modifier keys are pressed (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

      // --- ESCAPE KEY LOGIC (High Priority) ---
      if (e.key === 'Escape') {
        // A. Close Modals (LIFO - Last In First Out logic)
        if (isUnifiedModalOpen) { setIsUnifiedModalOpen(false); return; }
        if (showStats) { setShowStats(false); return; }
        if (showFriends) { setShowFriends(false); return; }
        if (showMusic) { setShowMusic(false); return; }
        if (viewingFriendStats) { setViewingFriendStats(null); setShowStats(false); return; }
        if (isNoteLibraryOpen) { setIsNoteLibraryOpen(false); return; }

        // B. Close Confirmations
        if (showStrictConfirm) { setShowStrictConfirm(false); return; }
        if (showStrictDisableConfirm) { setShowStrictDisableConfirm(false); return; }


      // C. Blur Inputs / Edit Modes

        // D. Close Note Editor made this change just for the sake of it 
        if (editingNote) {
          // Optional: Auto-save or just close? 
          // Usually better to save, but Esc implies "Cancel/Exit"
          // For now, let's just close or trigger the save handler manually if you prefer
          return;
        }

        return; // Stop further execution for Escape
      }

      // --- IGNORE OTHER SHORTCUTS IF TYPING ---
      if (isInputFocused) return;

      // --- OTHER SHORTCUTS ---



      // Space: Toggle Timer (Only in Session)
      if (e.key === ' ' && onboardingStep === 3) { e.preventDefault(); toggleTimer(); return; }

      // Tab: Cycle Modes (Only if timer stopped)
      if (e.key === 'Tab' && onboardingStep === 3) {
        // Check if timer is reset (timeLeft equals settings duration)
        const isAtDefaultPosition = !isActive && timeLeft === settings[mode] * 60;

        // OR just allow switching whenever paused:
        if (!isActive) {
          e.preventDefault();
          const modeOrder = ['focus', 'shortBreak', 'longBreak'];
          const currentIndex = modeOrder.indexOf(mode);
          const nextIndex = (currentIndex + 1) % modeOrder.length;
          const nextMode = modeOrder[nextIndex];
          handleModeChange(nextMode); // Use your handler to ensure sync
          return;
        }
      }

      // P: Toggle Music
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (isMusicPlaying) {
          handlePauseMusic();
        } else {
          // Play current or default
          const trackToPlay = currentTrack || MUSIC_TRACKS[0];
          handlePlayMusic(trackToPlay);
        }
        return;
      }

      // Note Library
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        // If you want T to open Notes Library:
        setIsNoteLibraryOpen(true);
      }

      // S: Settings
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); setIsUnifiedModalOpen(prev => !prev); }

    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);

  }, [
    // --- CRITICAL: ALL STATE VARIABLES MUST BE HERE ---
    isActive, onboardingStep, mode, timeLeft, settings,
    // Modals
showFriends,
showMusic, showStats, viewingFriendStats,
    showStrictConfirm, showStrictDisableConfirm,
    isNoteLibraryOpen, editingNote,
    isUnifiedModalOpen,
    // Music
    isMusicPlaying, currentTrack, volume,
    // Inputs
  ]);

  const playAlarm = () => {
    // 1. Get the current alarm sound ID from settings, default to 'digital'
    const soundId = settings.alarmSound || 'digital';

    // 2. Try to find the audio element in our ref map
    const audio = audioRefs.current[soundId];

    if (audio) {
      audio.currentTime = 0;
      // 3. Apply volume from settings
      audio.volume = settings.alarmVolume !== undefined ? settings.alarmVolume : 0.5;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Audio play failed, falling back to beep:", error);
          fallbackBeep();
        });
      }
    } else {
      // 4. Fallback if audio ref not found
      console.warn(`Audio ref not found for ${soundId}`);
      fallbackBeep();
    }
  };
  const fallbackBeep = () => { try { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 440; osc.type = 'sine'; gain.gain.value = 0.1; osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1); osc.stop(ctx.currentTime + 1); } } catch (e) { console.error("Audio fallback failed", e); } };


  // App.jsx

  const flushUnsavedTime = async () => {
    // We don't need to write to DB here. 
    // LocalStorage has already captured every second via the timer loop.
    // We just reset the ref to prevent double-counting if logic changes later.
  };


  // --- NEW: Sync Timer State Helper ---
  // App.jsx (~Line 2060)

  const syncTimerState = async (newState) => {
    if (!user) return;

    // --- HYBRID PIGGYBACK STRATEGY ---
    const currentStats = Storage.getTodayStats();
    const fullHistory = Storage.getFullHistory();
    const currentStreak = Storage.calculateStreak(fullHistory);

    const payload = {
      timerState: {
        pomoCount, // Include session count (bridge to Android)
        ...newState, // Allow newState to override if needed
        isStrict: strictMode,
        lastUpdated: Date.now()
      }, // newState contains { isActive, mode, timeLeft }
      stats: {
        dailyFocusTime: currentStats.dailyFocusTime || 0,
        dailyBreakTime: currentStats.dailyBreakTime || 0,
        dailySessions: currentStats.dailySessions || 0,
        dailyStopwatchTime: currentStats.dailyStopwatchTime || 0,
        currentStreak: currentStreak // Ensure streak is synced to public stats
      },
      streak: currentStreak
    };

    setStats(prev => ({ ...prev, currentStreak }));

    try {
      const todayId = formatDateId(new Date());

      // 1. Update Profile (Public presence + stats)
      await UserService.updateProfile(user.uid, {
        timer_state: payload.timerState,
        stats: payload.stats,
        // streak: payload.streak, // If you add streak column to profiles
        last_active: new Date()
      });

      // 2. Personal History Log
      // We use upsert to ensure date row exists
      await UserService.upsertHistory({
        user_id: user.uid,
        date_id: todayId,
        focus_time: payload.stats.dailyFocusTime,
        break_time: payload.stats.dailyBreakTime,
        sessions: payload.stats.dailySessions,
        stopwatch_time: payload.stats.dailyStopwatchTime,
        data: payload.stats
      });


    } catch (e) {
      console.error("Sync failed", e);
    }
  };



  // --- UPDATED AUTH EFFECT (Supabase) ---
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserMapping(session.user);
      } else {
        handleUserMapping(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserMapping(session?.user || null);
    });

    // REALTIME PROFILE SYNC
    const profileChannel = supabase.channel('public:profiles_sync')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          // If the update matches current user, refresh map
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && session.user.id === payload.new.id) {
              console.log("Profile updated externally, refreshing...");
              handleUserMapping(session.user);
            }
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(profileChannel);
    };
  }, [onboardingStep]);

  const handleUserMapping = async (supaUser) => {
    // GUARD: Skip Auth check if in Demo Mode
    if (window.location.search.includes('demo=')) {
      setIsAuthChecking(false);

      return;
    }



    if (supaUser) {
      // 1. FETCH PROFILE DATA (Handle, About, Pro Status)
      let profileData = {};
      try {
        const { success, data } = await UserService.getProfile(supaUser.id, 'handle, about, is_pro, photo_url, display_name');
        if (success && data) {
          profileData = data;
        }
      } catch (e) {
        console.warn("Profile fetch failed, using auth defaults", e);
      }

      // 2. MAP & MERGE USER
      const appUser = {
        ...supaUser,
        uid: supaUser.id, // CRITICAL: Maintain 'uid' for existing code
        displayName: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0],
        photoURL: supaUser.user_metadata?.avatar_url,
        isAnonymous: supaUser.is_anonymous,
        handle: profileData.handle || null,
        about: profileData.about || null,
        isPro: profileData.is_pro || false
      };

      setUser(appUser);

      // 3. STORAGE & ONBOARDING SYNC
      if (appUser.isAnonymous) {
        console.log("Guest session active.");
        localStorage.removeItem('zen_user_handle');
        localStorage.setItem('pomodoro_user_name', "Guest");
        setOnboardingStep(3);
      }

      // Registered User Logic
      if (appUser.handle) {
        localStorage.setItem('zen_user_handle', appUser.handle);
        setOnboardingStep(3);
      } else {
        // Fallback: If handle missing but user exists, just let them in.
        // They can set handle in settings.
        console.warn("Handle missing for user, defaulting to dashboard.");
        setOnboardingStep(3);

      }

    } else {
      // SESSION EXPIRED OR USER SIGNED OUT
      // Clear all user data to prevent stale state
      setUser(null);
      setOnboardingStep(0); // Always reset to login screen
      setDataLoaded(false);
      
      // Clear localStorage to prevent stale data showing
      localStorage.removeItem('zen_user_handle');
      localStorage.removeItem('pomodoro_user_name');
      
      console.log("Session cleared - user signed out or session expired.");
    }

    setIsAuthChecking(false);
  };

  // --- DEMO MODE REMOVED ---
  // Demo functionality has been disabled as per security requirements.
  // The useEffect hook that handled ?demo=caffeine has been deleted.

  // --- SOCIAL: Friends Logic (SUPABASE MIGRATION) ---

  const [friendRequests, setFriendRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);


  // Helper: Calculate friend status (Online/Focus/Idle)
  // Moved outside useEffect for reuse
  const calculateFriendStatus = useCallback((data, now) => {
    let isOnline = false;
    let isActive = false;
    let statusText = "Offline";
    let mode = 'focus';
    let timeLeft = 0;
    const GRACE_PERIOD = 5 * 60 * 1000; // 5 mins
    const MAX_STOPWATCH_DURATION = 12 * 60 * 60 * 1000; // 12 hours

    if (data.timer_state) {
      const ts = data.timer_state;
      const lastUpdated = ts.lastUpdated || 0;
      const timeSinceUpdate = now - lastUpdated;

      // LOGIC FIX: If timer is actively running and has time left, user IS online.
      const isTimerRunning = ts.isActive && (
        ts.mode === 'stopwatch' 
          ? (now - ts.targetEndTime < MAX_STOPWATCH_DURATION)
          : (ts.targetEndTime - now > 0)
      );
      const isStale = !isTimerRunning && (timeSinceUpdate > GRACE_PERIOD);

      if (!isStale) {
        isOnline = true;
        mode = ts.mode || 'focus';
        if (ts.isActive) {
          isActive = true;
          if (mode === 'stopwatch') {
            const elapsed = Math.max(0, Math.ceil((now - ts.targetEndTime) / 1000));
            timeLeft = elapsed;
            const elapsedMin = Math.floor(elapsed / 60);
            statusText = elapsedMin > 0 ? `Stopwatch • ${elapsedMin}m` : `Stopwatch • <1m`;
          } else {
            const remaining = Math.ceil((ts.targetEndTime - now) / 1000);
            if (remaining > 0) {
              timeLeft = remaining;
              statusText = `${mode === 'focus' ? 'Focus' : 'Break'} • ${Math.floor(timeLeft / 60)}m`;
            } else {
              isActive = false;
              statusText = "Idle";
            }
          }
        } else {
          isActive = false;
          if (mode === 'stopwatch') {
            const elapsedMin = Math.floor((ts.timeLeft || 0) / 60);
            statusText = elapsedMin > 0 ? `Stopwatch • Paused • ${elapsedMin}m` : `Stopwatch • Paused`;
          } else {
            statusText = "Paused";
          }
        }
      } else {
        isOnline = false;
        statusText = "Offline";
      }
    }
    return { isOnline, isActive, statusText, mode, timeLeft };
  }, [onboardingStep]);

  // 1. LISTEN TO FRIEND REQUESTS (Incoming)
  useEffect(() => {
    if (!user) { setFriendRequests([]); return; }

    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          created_at,
          sender:profiles!sender_id (id, display_name, handle, photo_url, is_pro)
        `)
        .eq('receiver_id', user.uid)
        .eq('status', 'pending');

      if (data) {
        const mapped = data.map(r => ({
          uid: r.sender.id,
          requestId: r.id,
          displayName: r.sender.display_name,
          handle: r.sender.handle,
          photoURL: r.sender.photo_url,
          isPro: r.sender.is_pro,
          timestamp: new Date(r.created_at).getTime()
        }));
        setFriendRequests(mapped);
      }
    };

    fetchRequests();

    const channel = supabase.channel(`social_requests:${user.uid}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.uid}` },
        () => { fetchRequests(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 2. LISTEN TO BLOCKED USERS
  useEffect(() => {
    if (!user) { setBlockedUsers([]); return; }

    const fetchBlocked = async () => {
      const { data } = await supabase
        .from('blocked_users')
        .select(`
           blocked_user_id,
           profile:profiles!blocked_user_id (id, display_name, photo_url, handle)
        `)
        .eq('user_id', user.uid);

      if (data) {
        const mapped = data.map(b => ({
          uid: b.profile.id,
          displayName: b.profile.display_name,
          photoURL: b.profile.photo_url,
          handle: b.profile.handle
        }));
        setBlockedUsers(mapped);
      }
    };

    fetchBlocked();

    const channel = supabase.channel('social_blocked')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_users', filter: `user_id=eq.${user.uid}` },
        () => fetchBlocked()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 3. LISTEN TO FRIENDS (List + Status)
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      // Manual Hydration for Reliability
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, is_pinned')
        .eq('user_id', user.uid);

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => f.friend_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, handle, photo_url, is_pro, timer_state, last_active, stats, about')
          .in('id', friendIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          const now = Date.now();
          const mapped = friendships.map(f => {
            const p = profileMap.get(f.friend_id);
            if (!p) return null;
            const status = calculateFriendStatus(p, now);
            return {
              uid: p.id,
              displayName: p.display_name,
              handle: p.handle,
              photoURL: p.photo_url,
              isPro: p.is_pro,
              isPinned: f.is_pinned,
              timerState: p.timer_state,
              stats: p.stats,
              about: p.about,
              ...status
            };
          }).filter(Boolean);
          setFriends(mapped);
          setFriendUids(mapped.map(f => f.uid));
        }
      } else {
        setFriends([]);
        setFriendUids([]);
      }
    };

    fetchFriends();

    const friendshipChannel = supabase.channel('social_friendships')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${user.uid}` },
        () => fetchFriends()
      )
      .subscribe();

    const presenceChannel = friendUids.length > 0 ? supabase.channel('social_presence')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(${friendUids.join(',')})` // Security: Only listen to friends
        },
        (payload) => {
          // Payload is now guaranteed to be a friend due to server-side filter
          setFriends(prev => prev.map(f => {
            if (f.uid === payload.new.id) {
              const newP = payload.new;
              const status = calculateFriendStatus(newP, Date.now());
              return {
                ...f,
                timerState: newP.timer_state,
                last_active: newP.last_active,
                stats: newP.stats,
                ...status
              };
            }
            return f;
          }));
        }
      )
      .subscribe() : null;

    const interval = setInterval(() => {
      const now = Date.now();
      setFriends(prev => prev.map(f => {
        if (f.timerState) {
          const status = calculateFriendStatus({ timer_state: f.timerState }, now);
          return { ...f, ...status };
        }
        return f;
      }));
    }, 1000);

    return () => {
      supabase.removeChannel(friendshipChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      clearInterval(interval);
    };
  }, [user, friendUids.join(','), calculateFriendStatus]);

  // --- ACTIONS ---

  const handleSendRequest = useCallback(async (targetUser) => {
    if (!user) return { success: false, error: "Not logged in" };
    if (targetUser.uid === user.uid) return { success: false, error: "You can't add yourself." };

    try {
      const { success, error } = await SocialService.sendFriendRequest(user.uid, targetUser.uid);
      if (!success) {
        return { success: false, error: error?.message || error || "Failed to send." };
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: "Failed to send." };
    }
  }, [user]);

  const handleCheckOutgoingRequest = useCallback(async (targetUserId) => {
    if (!user) return false;
    const { success, data } = await SocialService.checkOutgoingRequest(user.uid, targetUserId);
    return success ? data : false;
  }, [user]);

  const handleBlockUser = useCallback(async (targetUser) => {
    if (!user) return;
    try {
      const targetUid = targetUser.uid || targetUser;
      const { success, error } = await SocialService.blockUser(user.uid, targetUid);

      if (success) {
        setFriends(prev => prev.filter(f => f.uid !== targetUid));
      } else {
        console.error("Block failed", error);
      }
    } catch (e) { console.error("Block failed", e); }
  }, [user]);

  const handleUnblockUser = useCallback(async (blockedUid) => {
    if (!user) return;
    try {
      const { success, error } = await SocialService.unblockUser(user.uid, blockedUid);

      if (success) {
        setBlockedUsers(prev => prev.filter(b => b.uid !== blockedUid));
      } else {
        console.error("Unblock failed", error);
      }
    } catch (e) { console.error("Unblock failed", e); }
  }, [user]);

  const handleAcceptRequest = useCallback(async (requestObj) => {
    if (!user || !requestObj.requestId) return { success: false, error: "Invalid request" };
    try {
      const { success, error } = await SocialService.acceptFriendRequest(requestObj.requestId);

      if (!success) {
        console.error("Accept failed", error);
        throw error;
      }

      // SUCCESS: Force Fetch Friendship Data
      const { data } = await SocialService.fetchFriends(user.uid);

      if (data) {
        const now = Date.now();
        const mapped = data.map(row => {
          const p = row.profile;
          if (!p) return null;
          const status = calculateFriendStatus(p, now);
          return {
            uid: p.id,
            displayName: p.display_name,
            handle: p.handle,
            photoURL: p.photo_url,
            isPro: p.is_pro,
            isPinned: row.is_pinned,
            timerState: p.timer_state,
            stats: p.stats || {}, // Ensure stats is never null
            ...status
          };
        }).filter(Boolean);
        setFriends(mapped);
        setFriendUids(mapped.map(f => f.uid));

        // REMOVE FROM REQUESTS LIST
        setFriendRequests(prev => prev.filter(r => r.requestId !== requestObj.requestId));
      }
      return { success: true };
    } catch (e) {
      console.error("Accept failed", e);
      return { success: false, error: e.message };
    }
  }, [user]);

  const handleDeclineRequest = useCallback(async (requesterId) => {
    if (!user) return;
    try {
      await SocialService.declineFriendRequest(user.uid, requesterId);
    } catch (e) { console.error("Decline failed", e); }
  }, [user]);

  const handleRemoveFriend = useCallback(async (friendId) => {
    if (!user) return;
    setFriends(prev => prev.filter(f => f.uid !== friendId)); // Optimistic UI update

    try {
      const { success, error } = await SocialService.removeFriend(user.uid, friendId);
      if (!success) {
        console.error("Remove failed", error);
        // Could revert optimistic update here if needed
      }
    } catch (e) { console.error("Remove failed", e); }
  }, [user]);


  const handleTogglePin = useCallback(async (friendId, currentStatus) => {
    if (!user) return;
    try {
      await supabase
        .from('friendships')
        .update({ is_pinned: !currentStatus })
        .eq('user_id', user.uid)
        .eq('friend_id', friendId);
    } catch (e) { console.error("Pin failed", e); }
  }, [user]);

  const handleViewFriendStats = (friend) => {
    setViewingFriendStats(friend);
    setShowStats(true);
    setShowFriends(false);
  };

  const handleSearchUsers = useCallback(async (queryText) => {
    if (!queryText) return [];
    const term = queryText.trim();
    if (!term) return [];

    try {
      const { success, data, error } = await UserService.searchUsers(term);

      if (success && data) {
        // Filter out self and existing friends AND MAP to camelCase for FriendView
        const mapped = data
          .filter(u => u.id !== user.uid && !friendUids.includes(u.id))
          .map(u => ({
            uid: u.id,
            displayName: u.display_name,
            handle: u.handle,
            photoURL: u.photo_url,
            isPro: u.is_pro
          }));

        return mapped;
      } else {
        console.error("Search error", error);
        return [];
      }
    } catch (e) {
      console.error("Search failed", e);
      return [];
    }
  }, [user, friendUids]);

  // --- End Social Logic ---

  // --- UPDATED SYNC EFFECT (FIXED) ---
  // --- UPDATED SYNC EFFECT (SUPABASE MIGRATION) ---
  useEffect(() => {
    if (!user) return;

    // A. SYNC SETTINGS (Notes, Trash, App Settings)
    // [LOCAL-FIRST] Listener removed to prevent overwrite loops. 
    // We now trust local state and only fetch once on mount.

    // B. SYNC PROFILE (Handle, Pro Status, Streak)
    // [LOCAL-FIRST] Listener removed. We rely on initial fetch and local optimistic updates.



    const initStreak = async () => {
      try {
        if (user?.uid) {
          // Server is authoritative - use it when available
          const { success, data: serverStreak } = await UserService.getCurrentStreak(user.uid);
          if (success) {
            setStats(prev => ({ ...prev, currentStreak: serverStreak || 0 }));
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch server streak, using local calculation:', err);
      }
      
      // Offline fallback: calculate from local history
      const localHistory = Storage.getFullHistory();
      const localStreak = Storage.calculateStreak(localHistory);
      setStats(prev => ({ ...prev, currentStreak: localStreak }));
    };
    initStreak();

    // Initial Fetch (Required for Supabase to get current state)
    const fetchInitialData = async () => {
      try {
        const { data: serverData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.uid)
          .maybeSingle();

        if (serverData) {
          // 1. NOTES
          const serverNotes = serverData.notes || [];
          const localNotes = Storage.getNotes() || [];
          const mergedNotesMap = new Map();
          serverNotes.forEach(note => mergedNotesMap.set(note.id, note));
          localNotes.forEach(localNote => {
            const serverNote = mergedNotesMap.get(localNote.id);
            if (!serverNote || (localNote.updatedAt || 0) > (serverNote.updatedAt || 0)) {
              mergedNotesMap.set(localNote.id, localNote);
            }
          });
          const finalNotes = Array.from(mergedNotesMap.values());
          if (JSON.stringify(finalNotes) !== JSON.stringify(localNotes)) {
            setNotes(finalNotes);
            Storage.saveNotesLocally(finalNotes);
          }
          prevNotes.current = finalNotes;

          // 2. SETTINGS
          if (serverData.settings) {
            const remote = serverData.settings;
            // Get local settings, defaulting to current defaults
            const local = Storage.getSettings(DEFAULT_SETTINGS);

            // LOGIC: If remote has a newer timestamp, use it.
            // CAUTION: If remote is "Defaults" created just now, it might look newer than real local data.
            // Check if remote is just defaults (approximate check)
            const isRemoteDefault = Object.keys(remote).length <= Object.keys(DEFAULT_SETTINGS).length && remote.focus === DEFAULT_SETTINGS.focus;

            if (remote.updatedAt && remote.updatedAt > (local.updatedAt || 0)) {
              // Remote is explicitly newer -> Trust it
              const merged = { ...DEFAULT_SETTINGS, ...remote };
              setSettings(merged);
              Storage.saveSettingsLocally(merged);
              prevSettings.current = merged;
            } else if (!isRemoteDefault && local.updatedAt > (remote.updatedAt || 0)) {
              // Local is newer and remote is not just a fresh default -> Keep local (it will sync next save)
              prevSettings.current = local;
              // Trigger a save to update server
              Storage.saveSettingsLocally(local);
            } else {
              // Tie or Local is older? 
              // If local has data and remote is generic default, trust local.
              if (!isRemoteDefault) {
                const merged = { ...DEFAULT_SETTINGS, ...remote };
                setSettings(merged);
                Storage.saveSettingsLocally(merged);
                prevSettings.current = merged;
              } else {
                // Remote is default, Local might be custom. Trust Local.
                Storage.saveSettingsLocally(local);
                prevSettings.current = local;
              }
            }
          }

          // 4. TASKS & HABITS
          if (serverData.tasks) {
            setTasks(serverData.tasks);
            Storage.saveTasksLocally(serverData.tasks);
          }
          if (serverData.habits) {
            setHabits(serverData.habits);
            Storage.saveHabitsLocally(serverData.habits);
          }

        } else {
          // NO DATA FOUND -> Create Initial Row
          console.log("No user_settings found. creating...");
          const initialSettings = Storage.getSettings(DEFAULT_SETTINGS);
          try {
            const { error } = await UserService.insertSettings({
              user_id: user.uid,
              settings: initialSettings,
              updated_at: new Date()
            });
            if (error) console.error("Failed to create initial settings", error);
          } catch (err) { console.error("Creation error", err); }
          prevSettings.current = initialSettings;
          prevSettings.current = initialSettings;
        }

        // 4. HYDRATE TODAY'S STATS (Fix for 0s bug)
        try {
          const todayId = formatDateId(new Date());
          const { success, data: todayHistory } = await UserService.getHistoryByDate(user.uid, todayId);

          if (success && todayHistory) {
            Storage.hydrateTodayStats(todayHistory);
            // Note: We don't need to force setStats here because:
            // 1) The Timer/Stats UI reads directly from localStorage on mount/tick
            // 2) The 'stats' state in App.jsx is mainly for public profile sync
          }
        } catch (e) {
          console.error("Failed to hydrate stats", e);
        }
      } catch (e) {
        console.error("Initial fetch failed", e);
      } finally {
        setDataLoaded(true);
      }
    };
    fetchInitialData();

    return () => {
      // Channels removed in local-first refactor
    };
  }, [user?.uid]);


  // --- REAL-TIME TIMER SYNC (RECEIVER + RESPONDER) ---
  // [LOCAL-FIRST] Removed to prevent ghost timer resets.
  // We still PUSH state in toggleTimer/handleModeChange, but we don't listen for echoes.

  // --- OPTIMIZED SAVE LOGIC (Supabase) ---
  useEffect(() => {
    if (!user || !dataLoaded) return;

    const isDifferent = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

    // Check for Critical Changes (Notes, Settings)
    const notesChanged = JSON.stringify(notes) !== JSON.stringify(prevNotes.current);
    const hasCriticalChanges = notesChanged || isDifferent(settings, prevSettings.current);

    if (hasCriticalChanges) {
      const saveData = async () => {
        // Prepare Payload for user_settings
        const payload = {
          notes,
          settings,
          updated_at: new Date()
        };

        await UserService.upsertSettings({
          user_id: user.uid,
          ...payload
        });

        // Update Refs
        prevNotes.current = notes;
        prevSettings.current = settings;
      };

      const handler = setTimeout(saveData, 2000);
      return () => clearTimeout(handler);
    }
  }, [notes, settings, user?.uid, dataLoaded]);


  // --- FOCUS MODE LOGIC ---
  useEffect(() => {
    let timeout;
    if (isActive && mode === 'focus') {
      timeout = setTimeout(() => setFocusMode(true), 1500);
    } else {
      setFocusMode(false);
    }
    return () => clearTimeout(timeout);
  }, [isActive, mode]);



  // --- HANDLER: PLAY MUSIC (Mutually Exclusive with Lofi) ---
  const handlePlayMusic = (track) => {
    // 1. Stop Lofi if playing
    if (isLofiPlaying) setIsLofiPlaying(false);

    if (currentTrack?.id === track.id) {
      musicAudioRef.current.play();
      setIsMusicPlaying(true);
    } else {
      setCurrentTrack(track);
      setMusicLoading(true);
      musicAudioRef.current.src = track.src;
      musicAudioRef.current.load();
      musicAudioRef.current.play().catch(e => console.error("Music play failed", e));
      setIsMusicPlaying(true);
    }
  };

  const handlePauseMusic = () => {
    musicAudioRef.current.pause();
    setIsMusicPlaying(false);
  };

  // --- HANDLER: AMBIENCE MIXER (Multi-Track + Looping) ---

  // 1. Wrap toggleAmbience in useCallback
  const toggleAmbience = useCallback((track, isPreview = false) => {
    const id = track.id;

    // Check if already active -> STOP IT
    if (ambienceState[id]?.isPlaying) {
      const audio = ambienceRefs.current[id];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
      }
      setAmbienceState(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      // START IT
      if (!ambienceRefs.current[id]) {
        ambienceRefs.current[id] = new Audio(track.src);
      }
      const audio = ambienceRefs.current[id];

      audio.loop = !isPreview;
      audio.volume = 0.5;

      if (isPreview) {
        audio.onended = () => {
          setAmbienceState(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        };
      } else {
        audio.onended = null;
      }

      audio.play().catch(e => console.error("Ambience fail", e));

      setAmbienceState(prev => ({
        ...prev,
        [id]: { isPlaying: true, volume: 0.5 }
      }));
    }
  }, [ambienceState]); // Added dependency

  // 2. THIS IS THE CRITICAL FIX: Wrap stopAllAmbience in useCallback
  const stopAllAmbience = useCallback(() => {
    Object.keys(ambienceRefs.current).forEach(key => {
      const audio = ambienceRefs.current[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
      }
    });
    setAmbienceState({});
  }, [onboardingStep]);

  // 3. Wrap changeAmbienceVolume in useCallback
  const changeAmbienceVolume = useCallback((id, newVol) => {
    const audio = ambienceRefs.current[id];
    if (audio) audio.volume = newVol;

    setAmbienceState(prev => ({
      ...prev,
      [id]: { ...prev[id], volume: newVol }
    }));
  }, [onboardingStep]);

  // --- HANDLER: TOGGLE LOFI ---
  const toggleLofi = () => {
    if (isLofiPlaying) {
      setIsLofiPlaying(false);
    } else {
      handlePauseMusic(); // Stop Music
      setIsLofiPlaying(true);
    }
  };

  // --- SEEK ---
  const handleSeekMusic = (time) => {
    musicAudioRef.current.currentTime = time;
    setMusicProgress(time);
  };




  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();

      // 1. Clear ALL Persistent Data (Centralized)
      Storage.clearAll();


      setOnboardingInnerStep(0);
      setIsPro(false); // Explicit state update
      setNotes([]);    // Reset notes UI
      setTasks([]);
      setHabits([]);
      setStats(DEFAULT_STATS); // Reset stats UI

    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };




  // --- SYNC WORKER REMOVED (Replaced by Event-Driven "Piggyback" Sync) ---
  // The 'attemptSync' effect was here. It is now obsolete because we sync
  // history in real-time via syncTimerState.


  // --- TIMER INTERVAL & TRANSITION LOGIC (Ghost-Proof) ---
  useEffect(() => {
    // 1. Safety Clear: Stop any existing timer immediately
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (isActive) {
      // Initialize the "Wall Clock" (Ref) so all timers share the same baseline
      lastTickRef.current = Date.now();

      if (!endTimeRef.current) {
        endTimeRef.current = mode === 'stopwatch' 
          ? Date.now() - timeLeft * 1000 
          : Date.now() + timeLeft * 1000;
      }

      // 2. Start the Timer Loop
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();

        // --- THE FIX: SHARED CLOCK CHECK ---
        // We calculate delta against the SHARED Ref, not a local variable.
        // If a "Ghost Timer" runs, it will see this Ref was just updated by the Real Timer
        // and 'delta' will be tiny (e.g., 5ms), so it will skip the block below.
        const delta = now - lastTickRef.current;

        // --- A. UI COUNTDOWN (Visual Only) ---
        const diff = mode === 'stopwatch' 
          ? now - endTimeRef.current 
          : endTimeRef.current - now;
        const secondsRemaining = Math.max(0, Math.ceil(diff / 1000));

        setTimeLeft(prev => {
          if (prev !== secondsRemaining) return secondsRemaining;
          return prev;
        });


        // --- C. STATS LEDGER (The Gatekeeper) ---
        // Only proceed if the Wall Clock says 1 full second has passed
        if (delta >= 1000) {
          const secondsPassed = Math.floor(delta / 1000);

          // 1. UPDATE THE WALL CLOCK
          lastTickRef.current += (secondsPassed * 1000);

          // 2. Update Local Storage (The Ledger)
          const updatedStats = Storage.updateLocalStats(secondsPassed, mode);

          // 3. Add to Server Buffer

          // 4. Update React State
          setStats(prev => ({
            ...prev,
            dailyFocusTime: updatedStats.dailyFocusTime,
            dailyBreakTime: updatedStats.dailyBreakTime
          }));
        }

        // --- D. SESSION END LOGIC ---
        if (secondsRemaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

          // One final check to save the session count safely
          if (mode === 'focus') {
            const updatedStats = Storage.incrementSessionCount();
            setStats(updatedStats);
          }

          flushUnsavedTime();
          playAlarm(mode);

          // Mode Switching Logic...
          let nextMode = mode;
          let nextTimeLeft = 0;
          let nextIsActive = false;

          if (mode === 'focus') {
            setStats(prev => ({ ...prev, dailySessions: prev.dailySessions + 1 }));
            if (strictMode) document.exitFullscreen().catch(() => { });

            // 1. DETERMINE INTENDED NEXT MODE
            let intendedNextMode = 'shortBreak';
            let intendedTimeLeft = (Number(settings.shortBreak) || 5) * 60;

            if (pomoCount + 1 >= (Number(settings.pomosBeforeLongBreak) || 4)) {
              intendedNextMode = 'longBreak';
              intendedTimeLeft = (Number(settings.longBreak) || 15) * 60;
            }

              // NORMAL BEHAVIOR
              nextMode = intendedNextMode;
              nextTimeLeft = intendedTimeLeft;
              if (settings.autoStartBreaks) nextIsActive = true;

          } else if (mode === 'shortBreak') {
            // ... (existing shortBreak end logic) ...
            const nextCount = pomoCount + 1;
            setPomoCount(nextCount);
            nextMode = 'focus';
            if (strictMode) document.documentElement.requestFullscreen().catch(() => { });
            nextTimeLeft = (Number(settings.focus) || 25) * 60;
            if (settings.autoStartWork) nextIsActive = true;

            // UPDATE LOCAL STATE IMMEDIATELY (Fixes Loop Bug)
            setMode(nextMode);
            setTimeLeft(nextTimeLeft);
            setIsActive(nextIsActive);
            endTimeRef.current = nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null;

            // Pass explicit count to sync so it sends the NEW value immediately
            syncTimerState({
              pomoCount: nextCount,
              isActive: nextIsActive,
              targetEndTime: nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null,
              mode: nextMode,
              timeLeft: nextTimeLeft,
              lastUpdated: Date.now()
            });
            // CRITICAL FIX: Force useEffect to re-run
            setTimerResetKey(prev => prev + 1);
            return; // Exit here to avoid double sync below

          } else if (mode === 'longBreak') {
            // ... (existing longBreak end logic) ...
            setPomoCount(0);
            nextMode = 'focus';
            if (strictMode) document.documentElement.requestFullscreen().catch(() => { });
            nextTimeLeft = (Number(settings.focus) || 25) * 60;
            if (settings.autoStartWork) nextIsActive = true;

            // UPDATE LOCAL STATE IMMEDIATELY (Fixes Loop Bug)
            setMode(nextMode);
            setTimeLeft(nextTimeLeft);
            setIsActive(nextIsActive);
            endTimeRef.current = nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null;

            // Pass explicit count
            syncTimerState({
              pomoCount: 0,
              isActive: nextIsActive,
              targetEndTime: nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null,
              mode: nextMode,
              timeLeft: nextTimeLeft,
              lastUpdated: Date.now()
            });
            // CRITICAL FIX: Force useEffect to re-run
            setTimerResetKey(prev => prev + 1);
            return; // Exit here
          }

          setMode(nextMode);
          setTimeLeft(nextTimeLeft);
          setIsActive(nextIsActive);

          let nextTarget = nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null;
          endTimeRef.current = nextTarget;

          syncTimerState({
            isActive: nextIsActive,
            targetEndTime: nextTarget,
            mode: nextMode,
            timeLeft: nextTimeLeft,
            lastUpdated: Date.now()
          });

          // CRITICAL FIX: Force useEffect to re-run even if mode/isActive are unchanged
          setTimerResetKey(prev => prev + 1);
        }
      }, 1000); // 1s resolution prevents mobile CPU/battery drain
    } else {
      endTimeRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, mode, settings, pomoCount, strictMode, timerResetKey]);

  useEffect(() => {
    if (isActive && endTimeRef.current) {
      localStorage.setItem('zen_timer_state', JSON.stringify({
        mode,
        isActive: true,
        targetEndTime: endTimeRef.current,
        timestamp: Date.now(),
        // ADDED PERSISTENCE:
        skipStats: skipStatsRef.current,
        pomoCount // Persist session count
      }));
    }
  }, [isActive, mode, pomoCount]); // Added pomoCount to dependency array

  useEffect(() => {
    if (!isActive) {
      localStorage.setItem('zen_timer_state', JSON.stringify({
        mode,
        isActive: false,
        timeLeft,
        timestamp: Date.now(),
        // ADDED PERSISTENCE:
        skipStats: skipStatsRef.current,
        pomoCount // Persist session count
      }));
    }
  }, [isActive, mode, timeLeft, pomoCount]);

  const isInitialMount = useRef(true);
  const prevDurationRef = useRef(settings[mode] * 60);
  useEffect(() => { if (isInitialMount.current) { isInitialMount.current = false; return; } const newDuration = settings[mode] * 60; if (!isActive) { if (timeLeft === prevDurationRef.current) { setTimeLeft(newDuration); } } prevDurationRef.current = newDuration; }, [mode, settings[mode]]);

  // --- UPDATED TOGGLE TIMER ---
  const toggleTimer = () => {
    // BLOCK: Do not allow starting if AI is planning

    // 1. Flush: effectively does nothing now (Silent)
    if (isActive) flushUnsavedTime();

    const newIsActive = !isActive;
    setIsActive(newIsActive);

    if (newIsActive) {
      setHasStartedSession(true); // Mark session as started
    }

    // 3. Prepare Payload
    let stateToSync = {
      isActive: newIsActive,
      mode,
      timeLeft,
      // If starting, set target. If pausing, nullify target.
      targetEndTime: newIsActive 
        ? (mode === 'stopwatch' ? Date.now() - timeLeft * 1000 : Date.now() + timeLeft * 1000) 
        : null
    };

    if (newIsActive) {
      endTimeRef.current = stateToSync.targetEndTime;
    }

    // 4. SYNC TO DB (The "Status" Update)
    // This writes to publicProfiles so friends see "Paused"
    syncTimerState(stateToSync);
  };


  const handleConfirmReset = () => {
    // 1. Clear Local Buffers
    // We discard any partial seconds accumulated since the last tick
    // so they don't get added to stats later.

    // 2. Reset Timer State
    setIsActive(false);
    const nextTime = mode === 'stopwatch' ? 0 : (settings[mode] || 25) * 60;
    setTimeLeft(nextTime);
    setPomoCount(0);
    endTimeRef.current = null;
    setHasStartedSession(false); // Reset session tracking
    setCurrentSessionTotalDuration(null); // Reset dynamic duration

    // 3. Sync "Reset" state to DB (so friends see you are Idle)
    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: mode,
      timeLeft: nextTime,
      lastUpdated: Date.now()
    });
  };



  const handleModeChange = (newMode) => {
    flushUnsavedTime();
    setMode(newMode);
    setIsActive(false);
    
    const newTimeLeft = newMode === 'stopwatch' ? 0 : settings[newMode] * 60;
    setTimeLeft(newTimeLeft);
    
    setHasStartedSession(false); // Reset session tracking
    setCurrentSessionTotalDuration(null); // Reset dynamic duration

    // Sync Mode Change
    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: newMode,
      timeLeft: newTimeLeft,
    });
  };



  // FIX: Robustly clear Intention Data whenever Intention Mode is disabled
  // This ensures that toggling it OFF in current settings (even without save) clears the task.
  useEffect(() => {
    if (!settings.intentionMode && intentionTask) {
      setIntentionTask("");
      localStorage.removeItem('zen_intention_task');
    }
  }, [settings.intentionMode, intentionTask]);

  const handleSettingsSave = async (newSettings) => {
    // 1. ADD TIMESTAMP
    const settingsWithTimestamp = {
      ...newSettings,
      updatedAt: Date.now()
    };

    // FIX: Clear Intention
    if (settings.intentionMode && !newSettings.intentionMode) {
      setIntentionTask("");
      localStorage.removeItem('zen_intention_task');
    }

    // 2. Save locally
    Storage.saveSettingsLocally(settingsWithTimestamp);

    // 3. Update React State
    setSettings(settingsWithTimestamp);
    // 4. Calculate Timer Adjustments
    const oldDuration = settings[mode];
    const newDuration = newSettings[mode];
    const deltaMinutes = newDuration - oldDuration;

    if (isActive) {
      // --- A. TIMER IS RUNNING ---
      let newTargetEndTime = endTimeRef.current;
      let newTimeLeft = timeLeft;

      if (deltaMinutes !== 0) {
        const msToAdd = deltaMinutes * 60 * 1000;
        newTargetEndTime = endTimeRef.current + msToAdd;
        endTimeRef.current = newTargetEndTime;
        newTimeLeft = timeLeft + (deltaMinutes * 60);
        setTimeLeft(newTimeLeft);
      }

      if (user) {
        const timerState = {
          isActive: true,
          targetEndTime: newTargetEndTime,
          mode: mode,
          timeLeft: newTimeLeft,
          lastUpdated: Date.now()
        };

        // 1. Save Settings
        await UserService.upsertSettings({
          user_id: user.uid,
          settings: settingsWithTimestamp,
          updated_at: new Date()
        });

        // 2. Sync Timer & Stats
        await syncTimerState(timerState);
      }

    } else {
      // --- B. TIMER IS PAUSED ---
      const newDurationSeconds = newSettings[mode] * 60;
      setTimeLeft(newDurationSeconds);
      endTimeRef.current = null;

      if (user) {
        const timerState = {
          isActive: false,
          targetEndTime: null,
          mode: mode,
          timeLeft: newDurationSeconds,
          lastUpdated: Date.now()
        };

        await UserService.upsertSettings({
          user_id: user.uid,
          settings: settingsWithTimestamp,
          updated_at: new Date()
        });

        await syncTimerState(timerState);
      }
    }
  };

  const handleUpdateEndTime = (newTimeStr) => {
    // 1. Parse Input
    const [h, m] = newTimeStr.split(':').map(Number);
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setHours(h);
    targetDate.setMinutes(m);
    targetDate.setSeconds(0);
    targetDate.setMilliseconds(0);

    // 2. Handle Day Rollover (If time is in past, assume tomorrow)
    if (targetDate < now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // 3. Calculate New Duration
    const diff = targetDate.getTime() - now.getTime(); // ms
    if (diff <= 0) return; // Should not happen due to rollover check, but safety first

    const newSeconds = Math.ceil(diff / 1000);

    // 4. Update State
    setTimeLeft(newSeconds);
    setCurrentSessionTotalDuration(newSeconds); // Fix progress bar base

    if (isActive) {
      endTimeRef.current = targetDate.getTime();
      // Force sync for others
      syncTimerState({
        isActive: true,
        targetEndTime: targetDate.getTime(),
        mode: mode,
        timeLeft: newSeconds,
        lastUpdated: Date.now()
      });
    } else {
      // If paused, we just update the timeLeft so that when they resume, it calculates correctly
      // We do NOT set endTimeRef here because it's paused.
      // However, "Ends at" implies "If I start now...". 
      // Wait, if I edit the "Ends at" time while paused, do I change the constant duration settings? 
      // NO. We just override the current session's timeLeft.
      // syncTimerState for paused status
      syncTimerState({
        isActive: false,
        targetEndTime: null,
        mode: mode,
        timeLeft: newSeconds,
        lastUpdated: Date.now()
      });
    }
  };

  const handleUpgradeToPro = async () => {
    if (!user?.uid) return;

    try {
      const productId = import.meta.env.VITE_POLAR_PRODUCT_ID;
      if (!productId) {
        console.error("VITE_POLAR_PRODUCT_ID is missing in .env");
        alert("Configuration Error: Product ID missing.");
        return;
      }

      // 1. Create Checkout Session
      const { data, error } = await supabase.functions.invoke('create-polar-checkout', {
        body: {
          productId: productId,
          supabaseUid: user.uid
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      // 2. Redirect to Polar
      const ALLOWED_CHECKOUT_HOSTS = ['polar.sh', 'checkout.polar.sh'];
      try {
        const urlObj = new URL(data.url);
        if (ALLOWED_CHECKOUT_HOSTS.some(host => urlObj.host.endsWith(host))) {
          window.location.href = data.url;
        } else {
          console.error('Blocked redirect to untrusted URL:', data.url);
          alert('Checkout failed. Security check blocked the redirect.');
        }
      } catch (e) {
        console.error("Invalid redirect URL", e);
        alert('Checkout failed. Invalid redirect.');
      }

    } catch (err) {
      console.error("Upgrade failed:", err);
      alert("Failed to initiate checkout. Please try again.");
    }
  };

  const handleSaveAmbienceSelection = async (selectedIds) => {
    const newPreferences = { unlockedAmbiences: selectedIds, ambienceSetupDone: true };

    // 1. Update UI State
    setUnlockedAmbiences(selectedIds);
    setAmbienceSetupDone(true);

    // 2. Update Local Settings & Storage immediately
    setSettings(prev => {
      const updated = { ...prev, preferences: newPreferences };
      Storage.saveSettingsLocally(updated);
      return updated;
    });

    if (!user || user.isAnonymous) return;

    try {
      // 3. Sync to Supabase
      // Re-construct using latest settings to be safe, though local update handles the state
      const newSettings = {
        ...settings,
        preferences: newPreferences
      };

      await UserService.upsertSettings({
        user_id: user.uid,
        settings: newSettings,
        updated_at: new Date()
      });
    } catch (e) {
      console.error("Failed to save ambience selection", e);
    }
  };

  const handleMentionClick = async (handle) => {
    const cleanHandle = handle.replace(/^@/, '');

    // 1. Check if it's ME
    if (user && (user.handle === cleanHandle || user.handle === '@' + cleanHandle)) {
      setViewingProfile(user);
      return;
    }

    // 2. Check friends
    const friend = friends.find(f => f.handle === cleanHandle || f.handle === '@' + cleanHandle);
    if (friend) {
      setViewingProfile(friend);
      return;
    }

    // 3. Fetch from DB
    try {
      const { success, data } = await UserService.getProfileByHandle('@' + cleanHandle);
      if (success && data) setViewingProfile(data);
      else {
        // Try without @
        const { success: success2, data: data2 } = await UserService.getProfileByHandle(cleanHandle);
        if (success2 && data2) setViewingProfile(data2);
        else alert("User not found");
      }
    } catch (e) { console.error(e); }
  };

  const handleBackgroundChange = (bgSrc) => {
    // 3. Prepare New Settings with Timestamp
    const newSettings = {
      ...settings,
      background: bgSrc,
      updatedAt: Date.now()
    };

    // 4. Save to Local Storage IMMEDIATELY
    Storage.saveSettingsLocally(newSettings);

    // 5. Update React State (Visuals)
    setSettings(newSettings);
  };

  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  useEffect(() => {
    // 1. Define your icons here
    const modeIcons = {
      focus: '🎯',      // Focus
      shortBreak: '🧘', // Short Break
      longBreak: '🧘'   // Long Break
    };

    if (isActive) {
      const icon = modeIcons[mode] || '';
      document.title = `${icon} ${formatTime(timeLeft)} • DaTimer`;
    } else {
      // Optional: You could show "⏸️ Paused" or just the app name
      document.title = "DaTimer";
    }

    return () => {
      document.title = "DaTimer";
    };
  }, [timeLeft, isActive, mode]);

  const dashboardFriends = friends.filter(f => f.isOnline || f.isPinned);
  const isSessionInProgress = timeLeft !== settings.focus * 60;
  const isStrictLocked = strictMode && mode === 'focus' && isSessionInProgress;

  // --- INTENTION MODE LOGIC ---
  const INTENTION_VIDEO = "https://cdn.pixabay.com/video/2023/04/28/160776-822846838_small.mp4";

  // Show Wizard only if mode is enabled AND no task is set
  // If task is set, we are in "Session Phase" (even if paused/ready)
  const showIntentionFlow = settings.intentionMode && !intentionTask;

  // FIX: Reset timer and session state when Intention Mode is enabled
  useEffect(() => {
    if (settings.intentionMode) {
      if (isActive) setIsActive(false);
      setHasStartedSession(false);
      setTimeLeft(settings.focus * 60);
      // Optional: if we want to reset progress too
      // setPomoCount(0); 
    }
  }, [settings.intentionMode]);




  // Background Logic:
  // 1. Intention Mode (Wizard OR Session): ALWAYS Show Video
  // 2. Standard: Show settings.background
  const useIntentionTheme = false; // DEPRECATED: We use video for everything in Intention Mode now
  const activeBackground = settings.intentionMode ? INTENTION_VIDEO : settings.background;

  // FIX: Only show intervention if session has actually started (hasStartedSession)
  const showIntervention = settings.intentionMode && intentionTask && mode === 'focus' && !isActive && timeLeft !== settings.focus * 60 && timeLeft > 0 && hasStartedSession;

  if (isAuthChecking) return <AppLoader />;


  return (
    <>
      {/* <VideoManager user={user}> */}
      <div className="h-[100dvh] md:min-h-screen bg-black text-white flex flex-col md:block relative overflow-hidden">

        {/* 1. BACKGROUND LAYERS (Main Window) */}
        {useIntentionTheme ? (
          // HOLO GRAIN THEME (Replaces Gradient)
          <HoloGrainBackground isActive={isActive} playButtonRef={playBtnRef} />
        ) : (
          // STANDARD / VIDEO BACKGROUND
          activeBackground && (
            isVideo(activeBackground) ? (
              <div className={`fixed inset-y-0 left-0 z-0 overflow-hidden w-full`}>
                <video
                  ref={mainVideoRef}
                  src={activeBackground}
                  autoPlay loop muted playsInline disablePictureInPicture
                  style={{
                    filter: 'brightness(1.2) contrast(1.1)',
                    transform: 'translateZ(0)',
                    opacity: 0.8
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className={`fixed inset-y-0 left-0 z-0 bg-cover bg-center w-full`}
                style={{
                  backgroundImage: `url(${activeBackground})`,
                  opacity: 0.8
                }}
              />
            )
          )
        )}

        {/* 2. OVERLAY LAYER (Standard dimming, disabled for Gradient to keep it vivid?) */}
        <div
          className={`fixed inset-y-0 left-0 z-[1] pointer-events-none transition-colors duration-1000 ease-in-out w-full`}
          style={{
            backgroundColor: (activeBackground && !useIntentionTheme)
              ? 'transparent'
              : useIntentionTheme
                ? 'rgba(0,0,0,0)'
                : focusMode
                  ? 'rgba(0, 0, 0, 0.5)'
                  : 'rgba(0, 0, 0, 0.55)'
          }}
        />
        {!activeBackground && !useIntentionTheme && (<div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-0" />)}

        {/* 1.5 PIP WINDOW CONTENT (Minimal: Background + Clock + Play/Pause Button) */}
        {isPiPActive && (
          <PiPPortal>
            {useIntentionTheme ? (
              <HoloGrainBackground isActive={isActive} playButtonRef={playBtnRef} />
            ) : (
              activeBackground && (
                isVideo(activeBackground) ? (
                  <div className={`fixed inset-y-0 left-0 z-0 overflow-hidden w-full`}>
                    <video
                      src={activeBackground}
                      autoPlay loop muted playsInline disablePictureInPicture
                      style={{
                        filter: 'brightness(1.2) contrast(1.1)',
                        transform: 'translateZ(0)',
                        opacity: 0.8
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`fixed inset-y-0 left-0 z-0 bg-cover bg-center w-full`}
                    style={{
                      backgroundImage: `url(${activeBackground})`,
                      opacity: 0.8
                    }}
                  />
                )
              )
            )}
            <div
              className={`fixed inset-y-0 left-0 z-[1] pointer-events-none transition-colors duration-1000 ease-in-out w-full`}
              style={{
                backgroundColor: (activeBackground && !useIntentionTheme)
                  ? 'transparent'
                  : useIntentionTheme
                    ? 'rgba(0,0,0,0)'
                    : focusMode
                      ? 'rgba(0, 0, 0, 0.5)'
                      : 'rgba(0, 0, 0, 0.55)'
              }}
            />
            {!activeBackground && !useIntentionTheme && (<div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-0" />)}

            {/* MINIMAL PIP UI OVERLAY (With Idle Hiding) */}
            <PiPOverlay timeLeft={timeLeft} isActive={isActive} toggleTimer={toggleTimer} />
          </PiPPortal>
        )}



        {/* --- ONBOARDING FLOW --- */}
        {/* <VideoPipWindow
          isSocialModalOpen={showFriends}
          onExpand={(serverId) => {
            // If we have an active video server, we want the modal to open TO that server.
            if (serverId) {
              setSocialInitialServerId(serverId);
              setSocialInitialTab('video');
            }
            setShowFriends(true);
          }}
        /> */}
        {onboardingStep < 3 && (
          <Suspense fallback={null}>
            <OnboardingFlow
              user={user}
              onComplete={() => setOnboardingStep(3)}
              currentStep={onboardingInnerStep}
              onStepChange={setOnboardingInnerStep}
            />
          </Suspense>
        )}

        {/* --- INTENTION WIZARD OR DASHBOARD --- */}
        <AnimatePresence mode="wait">
          {showIntentionFlow ? (
            <IntentionWizard
              key="intention-wizard"
              onComplete={handleIntentionComplete}
              onCancel={handleIntentionCancel}
            />
          ) : (
            <div key="dashboard" className={`h-full w-full flex flex-col md:block transition-all duration-1500 ease-out ${onboardingStep === 3 ? 'opacity-100 delay-200' : 'opacity-0'}`}>

              {/* --- MOBILE HEADER --- */}
              <div className={`md:hidden flex justify-center items-center w-full p-6 z-20 flex-shrink-0 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>
                <div className="flex items-center gap-2">
                  <RevealLogo src="/logo/logo-mark-light.svg" className="w-14 h-14" />
                </div>
              </div>

              {/* --- GLOBAL ROOM INVITE TOAST --- */}
              <AnimatePresence>
                {incomingRoomInvite && (
                  <div className="fixed z-[60] left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+80px)] md:bottom-24 md:left-auto md:right-12 flex justify-center pointer-events-none">
                    <motion.div 
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 50 }}
                      className="pointer-events-auto"
                    >
                      <RoomInviteToast 
                          invite={incomingRoomInvite}
                        onAccept={() => {
                            if (activeRoomId) {
                                RoomsService.leaveRoom(activeRoomId);
                            }
                            setActiveRoomId(incomingRoomInvite.id);
                            setIsRoomHost(false);
                            setRemoteRoomUserId(incomingRoomInvite.host_id);
                            setIncomingRoomInvite(null);
                        }}
                        onDecline={() => {
                            RoomsService.declineInvite(incomingRoomInvite.id);
                            setIncomingRoomInvite(null);
                        }}
                        onDismiss={() => {
                            setIncomingRoomInvite(null);
                        }}
                    />
                  </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* --- UNIFIED FOOTER DOCK (Mobile & Desktop) --- */}
              <div className={`flex flex-col items-center md:items-start absolute bottom-0 w-full md:w-auto md:bottom-8 left-0 md:left-12 z-50 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>
                {dashboardFriends.length > 0 && !incomingRoomInvite && (
                  <div className="hidden md:block">
                    <FriendsDock
                      friends={dashboardFriends}
                      onViewFriendStats={handleViewFriendStats}
                    />
                  </div>
                )}
                <div onMouseLeave={() => setHoveredDockIndex(null)} className="flex items-center md:gap-0 gap-4 md:p-1.5 p-3 md:bg-black/40 bg-black/60 md:backdrop-blur-xl backdrop-blur-md md:border border-t border-white/10 md:rounded-full rounded-t-3xl shadow-2xl w-full md:w-auto justify-around md:justify-start pb-[calc(env(safe-area-inset-bottom)+12px)] md:pb-1.5">
                  <button onMouseEnter={() => setHoveredDockIndex(0)} onClick={() => { if (checkGuestAccess()) { setShowFriends(true); } }} className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white group flex items-center cursor-default">
                    <div className="relative">

                      <Users size={20} className={((unreadCount > 0 || totalMentions > 0) && mode !== 'focus') ? "text-white" : ""} />
                      {((unreadCount > 0 || totalMentions > 0) && mode !== 'focus') && <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1a0c00] ${totalMentions > 0 ? 'bg-blue-500' : 'bg-red-500'}`} />}
                    </div>
                    <span className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-smooth ${((unreadCount > 0 || totalMentions > 0) && mode !== 'focus') ? "max-w-[150px] opacity-100 ml-2 text-white" : "max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2 hidden md:block"}`}>
                      {(totalMentions > 0 && mode !== 'focus') ? `${totalMentions} Mention${totalMentions > 1 ? 's' : ''}` : (unreadCount > 0 && mode !== 'focus') ? "New Message" : "Friends"}
                    </span>
                  </button>
                  <BendingDivider activeSide={hoveredDockIndex === 0 ? 'left' : hoveredDockIndex === 1 ? 'right' : null} isDimmed={isMusicPlaying} />
                  <div role="button" onMouseEnter={() => setHoveredDockIndex(1)} onClick={() => { setShowMusic(true); }} className={`relative p-2 rounded-full transition-colors group flex items-center cursor-default ${isMusicPlaying ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>

                    {/* Wrapper for Icon + Popup to ensure centering works on the ICON ONLY */}
                    <div className="relative flex items-center justify-center">


                      <Music size={20} className={`relative z-10 ${isMusicPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
                    </div>

                    <div className="hidden md:flex items-center overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-smooth">
                      {isMusicPlaying ? (<button onClick={(e) => { e.stopPropagation(); handlePauseMusic(); }} className="ml-2 px-2 py-0.5 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200"><Pause size={10} fill="black" /></button>) : (<span className="text-sm font-medium ml-2">Music</span>)}
                    </div>
                  </div>
                  <BendingDivider activeSide={hoveredDockIndex === 1 ? 'left' : (hoveredDockIndex === 2) ? 'right' : null} isDimmed={isMusicPlaying || strictMode} />
                  <div onMouseEnter={() => setHoveredDockIndex(2)} onClick={() => setIsUnifiedModalOpen(true)} className="relative p-2 rounded-full transition-colors group flex items-center cursor-default text-white/70 hover:text-white hover:bg-white/10">
                    <div className="relative flex items-center justify-center w-6 h-6">
                      <Avatar userData={user} photoURL={user?.photoURL} name={user?.displayName} size="full" isPro={isPro} />
                    </div>
                    <div className="hidden md:flex items-center overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-smooth">
                      <span className="text-sm font-medium ml-2">Settings</span>
                    </div>
                  </div>
                  {/* <BendingDivider activeSide={(hoveredDockIndex === 2) ? 'left' : (hoveredDockIndex === 3) ? 'right' : null} isDimmed={strictMode} />
                <motion.button layout onMouseEnter={() => setHoveredDockIndex(3)} onClick={() => { setShowCaffeine(true); setHighlightCaffeine(false); }} className={`relative p-2 rounded-full transition-colors group flex items-center ${showCaffeine ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  {highlightCaffeine && (<div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce text-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] pointer-events-none z-50"><ArrowDown size={32} strokeWidth={3} /><div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rotate-45" /></div>)}
                  <Coffee size={20} className={showCaffeine ? 'text-yellow-400' : ''} />
                  <motion.span layout className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-smooth ${showCaffeine ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2'}`}>Caffeine</motion.span>
                </motion.button> */}
                </div>
              </div>

              {/* --- DESKTOP LOGO --- */}
              <div className={`hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-1000 ease-out delay-500 ${onboardingStep === 3 ? uiOpacityClass : 'opacity-0 pointer-events-none'}`}>
                <RevealLogo src="/logo/logo-mark-light.svg" className="w-14 h-14" />
              </div>

              {/* --- TIMER SECTION (Main) --- */}
              <main className={`flex-1 flex flex-col items-center justify-center min-h-0 w-full px-4 pt-16 pb-20 md:pb-0 relative md:absolute z-10 md:pointer-events-none transition-transform duration-1000 ease-apple md:inset-0 ${isSplitScreen ? 'md:-translate-x-1/4 -translate-y-[25%] md:translate-y-0' : 'translate-x-0 translate-y-0'}`}>
                  <div className="pointer-events-auto flex flex-col items-center animate-fade-in-up w-full max-w-full relative">

                    {/* --- MESSAGE BOX & SMART INTERVENTION AREA --- */}
                    {/* FIX: Increased z-index to 60 to ensure TimePicker popup stays above Mode Switcher and Tally (z-50) */}
                    <div className="absolute -top-16 left-0 right-0 flex justify-center pointer-events-none z-[60]">
                      <AnimatePresence mode="wait">

                        {/* 1. STANDARD MESSAGE PILL (Only show if Intervention is CLOSED) */}
                        {!showIntervention && (
                          <motion.div
                            key="smart-message"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="pointer-events-auto"
                          >
                            <SmartMessage
                              isActive={isActive}
                              timeLeft={timeLeft}
                              targetEndTime={endTimeRef.current}
                              mode={mode}
                              isUserActive={isUserActive}
                              focusMode={focusMode}
                              // Removed layoutId prop
                              overrideMessage={
                                settings.intentionMode && intentionTask
                                  ? (
                                    isActive
                                      ? `I will work on ${intentionTask}`
                                      : (
                                        timeLeft === settings.focus * 60
                                          ? "Ready when you are"
                                          : (remindMessage || `Remember: ${intentionTask}`)
                                      )
                                  )
                                  : null
                              }
                              onUpdateEndTime={handleUpdateEndTime}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 2. SMART INTERVENTION (Standard Modal Trigger) */}
                    <SmartIntervention
                      isVisible={showIntervention}
                      isActive={isActive}
                      intention={intentionTask}
                      duration={settings.focus}
                      timeLeft={timeLeft}
                      userName={user?.displayName?.split(' ')[0]}
                      onClose={() => toggleTimer()}
                      onApplyAction={handleApplyAction}
                    />

                    {/* SMART INTERVENTION OVERLAY
                <SmartIntervention
                  isVisible={useIntentionTheme && !isActive && timeLeft !== settings.focus * 60 && timeLeft > 0}
                  isActive={isActive}
                  intention={intentionTask}
                  duration={settings.focus}
                  timeLeft={timeLeft}
                  userName={user?.displayName?.split(' ')[0]}
                  onClose={() => toggleTimer()} // Close = Resume
                  onApplyAction={handleApplyAction}
                  getGeminiAdvice={getGeminiAdvice}
                /> */}
                    {/* --- MODE SWITCHER (Updated with Inline Edit & Centered Text) --- */}
                    <div className="flex items-center justify-center mb-2 h-10 w-full max-w-xl text-sm">
                      {[{ id: 'focus', label: 'Focus' }, { id: 'shortBreak', label: 'Short Break' }, { id: 'longBreak', label: 'Long Break' }, { id: 'stopwatch', label: 'Stopwatch' }].map((m) => {
                        const isCurrent = mode === m.id;
                        const isEditing = editingModeId === m.id;
                        // FIX: Use dynamic session duration if available for current mode, else default
                        const defaultSeconds = settings[m.id] * 60;
                        const totalSeconds = (isCurrent && currentSessionTotalDuration) ? currentSessionTotalDuration : defaultSeconds;

                        const progress = m.id === 'stopwatch' ? 100 : (totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0);

                        let containerClass = `relative h-full rounded-full transition-all overflow-hidden flex items-center justify-center whitespace-nowrap min-w-0 `;

                        if (isActive) {
                          if (isCurrent) { containerClass += "flex-[100] bg-white/10 mx-0 cursor-default border border-transparent duration-1000 ease-in-out"; }
                          else { containerClass += "flex-[0.001] px-0 mx-0 opacity-0 border border-transparent duration-1000 ease-in-out"; }
                        } else {
                          containerClass += "flex-1 mx-1 md:mx-1.5 duration-300 ease-out ";
                          if (isCurrent) { containerClass += "bg-white text-black font-medium border border-white cursor-default group "; }
                          else { containerClass += "bg-transparent text-white/50 border border-transparent hover:border-white/20 hover:text-white cursor-default "; }
                        }

                        return (
                          <motion.button
                            key={m.id}
                            layout
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isActive) {
                                if (isCurrent) {
                                  if (m.id !== 'stopwatch') {
                                    setEditInputValue(settings[m.id].toString());
                                    setEditingModeId(m.id);
                                  }
                                } else {
                                  handleModeChange(m.id);
                                }
                              }
                            }}
                            className={containerClass}
                            disabled={isActive}
                            animate={{ x: 0 }}
                            transition={{ duration: 0.5 }}
                          >
                            {/* Progress Bar Background */}
                            <div className={`absolute inset-y-0 left-0 bg-white transition-all duration-1000 ease-linear will-change-[width] ${isActive && isCurrent ? 'opacity-100' : 'opacity-0'}`} style={{ width: `${isActive && isCurrent ? progress : 0}%` }} />

                            {/* CONTENT: Either Input or Label */}
                            {isEditing ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative z-20 flex items-center justify-center w-full h-full"
                              >
                                <input
                                  autoFocus
                                  type="number"
                                  min="1"
                                  max="120"
                                  className="bg-transparent border-none outline-none text-center font-bold text-black w-12 p-0 m-0 focus:ring-0 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={editInputValue}
                                  onChange={(e) => setEditInputValue(e.target.value)}
                                  onBlur={commitInlineEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); commitInlineEdit(); }
                                    if (e.key === 'Escape') { e.preventDefault(); setEditingModeId(null); }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs font-medium text-black/50 ml-0.5">m</span>
                              </motion.div>
                            ) : (
                              <span className={`relative z-10 font-medium flex items-center justify-center gap-1 ${isCurrent ? 'mix-blend-difference text-white' : ''}`}>
                                <span className="whitespace-nowrap">{m.label}</span>
                                {!isActive && isCurrent && m.id !== 'stopwatch' && (
                                  <div className="hidden md:flex overflow-hidden max-w-0 opacity-0 group-hover:max-w-[20px] group-hover:opacity-100 transition-all duration-300 ease-out items-center">
                                    <Pencil size={12} className="text-white ml-1 flex-shrink-0" />
                                  </div>
                                )}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* --- CYCLE TALLY INDICATOR (Updated with Double-Tap Edit) --- */}
                    <div
                      className={`relative z-50 flex items-center justify-center gap-3 mb-2 h-8 cursor-default min-w-[100px] transition-opacity duration-300 ${mode === 'stopwatch' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                      onMouseEnter={() => setIsTallyHovered(true)}
                      onMouseLeave={() => setIsTallyHovered(false)}
                      onDoubleClick={() => {
                        if (!isActive) {
                          setSessionEditValue(settings.pomosBeforeLongBreak.toString());
                          setIsEditingSessions(true);
                        }
                      }}
                      title={!isActive ? "Double-click to edit sessions" : ""}
                    >
                      {isEditingSessions ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md"
                        >
                          <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Intervals:</span>
                          <input
                            autoFocus
                            type="number"
                            min="1"
                            max="16"
                            className="bg-transparent border-none outline-none text-center font-bold text-white w-8 p-0 m-0 focus:ring-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={sessionEditValue}
                            onChange={(e) => setSessionEditValue(e.target.value)}
                            onBlur={commitSessionEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); commitSessionEdit(); }
                              if (e.key === 'Escape') { e.preventDefault(); setIsEditingSessions(false); }
                            }}
                          />
                        </motion.div>
                      ) : (
                        Array.from({ length: settings.pomosBeforeLongBreak }).map((_, i) => {
                          const isCompleted = i < pomoCount;
                          const isCurrent = i === pomoCount;
                          const shouldExpand = isCurrent && isTallyHovered;
                          return (
                            <div key={i} className={`relative rounded-full flex items-center justify-center transition-all duration-500 ease-smooth ${shouldExpand ? 'w-16 h-7 bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : (isCompleted || isCurrent) ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/20'}`}>
                              {isCurrent && (<span className={`absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-black whitespace-nowrap leading-none transition-all duration-300 ${shouldExpand ? 'opacity-100 scale-100 delay-75' : 'opacity-0 scale-50'}`}>{i + 1} / {settings.pomosBeforeLongBreak}</span>)}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* --- TIMER --- */}
                    <div
                      onClick={toggleTimer}
                      className={`
                    leading-none tracking-normal select-none tabular-nums transition-all duration-700 cursor-default
                    
                    font-timer-bricolage
                    
                    ${isSplitScreen ? 'text-[18vw] md:text-[8rem] lg:text-[10rem]' : 'text-[20vw] md:text-[10rem] lg:text-[12rem]'}
                    text-white/90
                    ${'drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'}
                  `}
                      style={{
                        fontWeight: 550
                      }}
                    >
                      <CountdownTimer timeLeft={timeLeft} disableAnimation={true} />
                    </div>

                    {/* --- CONTROLS --- */}
                    <div className="flex items-center gap-6 mt-8 md:mt-10 w-full justify-center z-50">

                      {/* PiP Button - Hide when active (it's in the PiP window) */}
                      {!isPiPActive && (
                        <button
                          onClick={togglePiP}
                          className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-default"
                          title="Picture-in-Picture"
                        >
                          <PictureInPicture2 size={20} />
                        </button>
                      )}

                      <button
                        ref={playBtnRef}
                        onClick={toggleTimer}
                        className={`w-20 h-20 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_0_40px_rgba(255,255,255,0.2)] md:hover:scale-110 md:shadow-[0_0_40px_rgba(255,255,255,0.1)] cursor-default`}
                      >
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${isActive ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-90 opacity-0'}`}>
                            <Pause size={32} fill="black" />
                          </div>
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${!isActive ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}>
                            <Play size={32} fill="black" className="ml-1" />
                          </div>
                        </div>
                      </button>

                      <LiquidResetBtn
                        onReset={handleConfirmReset}
                        disabled={strictMode && mode === 'focus'}
                      />
                    </div>

                    {mode !== 'stopwatch' && (
                      <GameCenter
                        mode={mode}
                        timeLeft={timeLeft}
                        background={settings.background}
                        isPro={isPro}
                        onOpenPro={() => setProModalSource('arcade')}
                      />
                    )}

                    {/* <TimerModeSelector
                  mode={mode}
                  opacityClass={uiOpacityClass}
                  isIntentionMode={settings.intentionMode}
                  onToggleMode={(val) => {
                    const newSettings = { ...settings, intentionMode: val };
                    setSettings(newSettings);
                    handleSettingsSave(newSettings);
                  }}
                  isPro={isPro}
                  onOpenPro={() => setProModalSource('personalities')}
                /> */}

                  </div>
                </main>

                {/* --- REMOTE USER PANE (Right Half on Desktop, Bottom Half on Mobile) --- */}
                <AnimatePresence>
                  {isSplitScreen && (
                    <motion.div
                      key="remote-pane" 
                      initial={{ opacity: 0, x: window.innerWidth >= 768 ? 'calc(100% + 80px)' : 0 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: window.innerWidth >= 768 ? 'calc(100% + 80px)' : 0 }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      onAnimationStart={() => setIsPaneAnimating(true)}
                      onAnimationComplete={() => setIsPaneAnimating(false)}
                      className="flex flex-col md:flex-row absolute bottom-0 md:inset-y-0 md:right-0 w-full h-1/2 md:w-1/2 md:h-full z-[30] pointer-events-none"
                    >
                        {/* Pull Tab Container (Desktop) */}
                        <div className="hidden absolute left-[-76px] w-[76px] top-1/2 -translate-y-1/2 h-[160px] overflow-hidden z-[1] pointer-events-none md:flex items-center justify-end">
                            <motion.button
                                initial={{ x: 80 }}
                                animate={{ x: (showPullTab || tabLinger) ? 0 : 80 }}
                                exit={{ x: 80 }}
                                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                onClick={async () => {
                                    setIsLeavingRoom(true);
                                    if (isDevSplit) {
                                        setIsDevSplit(false);
                                    } else {
                                        await RoomsService.leaveRoom(activeRoomId);
                                        handleRoomClosed();
                                    }
                                    setIsLeavingRoom(false);
                                }}
                                disabled={isLeavingRoom}
                                className="pointer-events-auto w-[46px] h-[100px] bg-black/60 backdrop-blur-md md:backdrop-blur-3xl transform-gpu will-change-transform border-y border-l border-white/10 rounded-l-2xl flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-black/80 transition-colors group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Leave Room"
                            >
                                {isLeavingRoom ? (
                                    <Loader2 size={18} className="animate-spin text-white/60" />
                                ) : (
                                    <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                                )}
                            </motion.button>
                        </div>
                        
                        {/* Leave Room Button (Mobile) */}
                        <div className="md:hidden absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[5] pointer-events-none flex flex-col justify-end items-center pb-[calc(env(safe-area-inset-bottom)+100px)]">
                             <button
                                onClick={async () => {
                                    setIsLeavingRoom(true);
                                    if (isDevSplit) setIsDevSplit(false);
                                    else { await RoomsService.leaveRoom(activeRoomId); handleRoomClosed(); }
                                    setIsLeavingRoom(false);
                                }}
                                disabled={isLeavingRoom}
                                className="pointer-events-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-red-400 hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-50 shadow-xl"
                             >
                                {isLeavingRoom ? <Loader2 size={18} className="animate-spin" /> : <><LogOut size={18} /> <span className="text-sm font-medium">Leave Room</span></>}
                             </button>
                        </div>

                        {/* Inner Pane (Contains background, blur, clipped edges) */}
                        <div className={`absolute inset-0 rounded-t-[40px] md:rounded-t-none md:rounded-l-[40px] border-t md:border-t-0 md:border-l overflow-hidden z-[2] pointer-events-auto transition-all duration-1000 ${isSeamlessPanorama ? 'border-white/10 shadow-[-12px_0_30px_-12px_rgba(0,0,0,0.5)] bg-gradient-to-r from-white/[0.03] to-transparent backdrop-blur-none' : 'border-white/10 shadow-xl md:shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md md:backdrop-blur-3xl transform-gpu will-change-transform bg-black/20'}`}>
                            <RemoteTimerPane 
                                roomId={isDevSplit ? 'dev-room' : activeRoomId} 
                                isHost={isRoomHost} 
                                remoteUserId={isDevSplit ? 'dev-user' : remoteRoomUserId}
                                localBackground={activeBackground}
                                localClockType="bricolage"
                                isDevMock={isDevSplit}
                                onLeaveRoom={handleRoomClosed}
                                onBackgroundMatch={setIsSeamlessPanorama}
                                onSyncClick={(remoteState, remoteTimeLeft) => {
                                   setIsActive(remoteState.isActive);
                                   setTimeLeft(remoteTimeLeft);
                                   if (remoteState.mode) handleModeChange(remoteState.mode);
                                }}
                            />
                        </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              {/* STICKY NOTE WIDGET CONTAINER */}
              <div className={`
                w-full flex items-start justify-center gap-4 z-20 transition-all duration-700 ease-in-out 
                md:absolute md:top-8 md:left-12 md:w-auto md:flex-col md:justify-start
                md:transition-opacity md:duration-700 md:ease-in-out 
                ${onboardingStep === 3 ? uiOpacityClass : 'opacity-0 pointer-events-none'}
              `}>
                <StickyNoteWidget
                  notes={notes}
                  onOpenLibrary={() => setIsNoteLibraryOpen(true)}
                  isLibraryOpen={isNoteLibraryOpen}
                  onSave={handleSaveNote}
                />
              </div>

            </div>
          )
          }
        </AnimatePresence >



        <Suspense fallback={null}>
          <UnifiedSettingsModal
            isOpen={isUnifiedModalOpen}
            onClose={() => setIsUnifiedModalOpen(false)}
            user={user}
            signOut={handleSignOut}
            settings={settings}
            setSettings={setSettings}
            handleSettingsSave={handleSettingsSave}
            handleBackgroundChange={handleBackgroundChange}
            backgrounds={[...BACKGROUND_OPTIONS, ...customBackgrounds]}
            stats={stats}
            isPro={isPro}
            onOpenPro={(source) => setProModalSource(source || 'settings')}
            onReplayOnboarding={() => { setIsUnifiedModalOpen(false); setOnboardingStep(0); setOnboardingInnerStep(0); }}
            initialTab={settingsTab}

          />
        </Suspense>

        <Suspense fallback={null}>
          <SocialProfileModal
            isOpen={showStats}
            onClose={() => {
              setShowStats(false);
              setViewingFriendStats(null);
            }}
            user={viewingFriendStats}
            currentUser={user}
            onAddFriend={null} // Already friends or viewing stats
            onMessage={() => {
              setShowStats(false); // Close modal
              setShowFriends(true); // Open friends list
              // Ideally switch to DMs
            }}
            onProfileUpdate={null} // Friends can't update friend profiles
          />
        </Suspense>


        <MiniLofiPlayer isPlaying={isLofiPlaying} onToggle={toggleLofi} volume={volume} />
        <Suspense fallback={null}>
          <MusicModal
            // ... (keep existing props like volume, currentTrack, etc.) ...
            volume={volume}
            onVolumeChange={setVolume}
            isOpen={showMusic}
            onClose={() => setShowMusic(false)}
            currentTrack={currentTrack}
            isPlaying={isMusicPlaying}
            onPlay={handlePlayMusic}
            onPause={handlePauseMusic}
            isLoading={musicLoading}
            progress={musicProgress}
            duration={musicDuration}
            onSeek={handleSeekMusic}
            ambienceState={ambienceState}
            onToggleAmbience={toggleAmbience}
            onAmbienceVolume={changeAmbienceVolume}
            onStopAllAmbience={stopAllAmbience}
            isLofiPlaying={isLofiPlaying}
            onToggleLofi={toggleLofi}

            // --- NEW PROPS ---
            isPro={isPro}
            unlockedAmbiences={unlockedAmbiences}
            ambienceSetupDone={ambienceSetupDone}
            onSaveAmbienceSelection={handleSaveAmbienceSelection}
            onOpenPro={() => setProModalSource('ambience')}
          // -----------------
          />
        </Suspense>
        {/* --------------------- */}

        {/* --- ADD STRICT MODE MODALS HERE --- */}
        <StrictConfirmationModal
          isOpen={showStrictConfirm}
          onClose={() => setShowStrictConfirm(false)}
          onConfirm={enableStrictMode}
        />
        <StrictDisableModal
          isOpen={showStrictDisableConfirm}
          onClose={() => setShowStrictDisableConfirm(false)}
          onConfirm={handleStrictDisable}
        />


        <Suspense fallback={null}>
          <SocialModal
            activeRoomId={activeRoomId}
            isOpen={showFriends}
            onClose={() => {
              setShowFriends(false);
              setSocialView('list');
              setSocialInitialServerId(null); // Reset target
              setSocialInitialTab(null); // Reset tab
            }}
            initialServerId={socialInitialServerId} // PASS TARGET SERVER
            initialTab={socialInitialTab} // PASS TARGET TAB
            initialView={socialView}
            user={user}
            onMarkRead={markAsRead}
            getLastReadTime={getLastReadTime}
            unreadCounts={unreadCounts}
            onViewProfile={setViewingProfile}
            friends={friends}
            friendRequests={friendRequests}
            blockedUsers={blockedUsers}
            onSendRequest={handleSendRequest}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            checkOutgoingRequest={handleCheckOutgoingRequest}
            onViewStats={handleViewFriendStats}
            onTogglePin={handleTogglePin}
            onSearchUsers={handleSearchUsers}
            onRemoveFriend={handleRemoveFriend}
            isFocusing={mode === 'focus'}
            onMentionClick={handleMentionClick}
          />
        </Suspense>

        <Suspense fallback={null}>
          <SocialProfileModal
            isOpen={!!viewingFriendStats}
            onClose={() => setViewingFriendStats(null)}
            user={viewingFriendStats}
            currentUser={user}
            onProfileUpdate={handleProfileUpdate}
            onAddFriend={
              // Only show Add Friend if NOT already friends and NOT self
              (!viewingFriendStats || (viewingFriendStats.id !== user.uid && !friendUids.includes(viewingFriendStats.id)))
                ? () => handleSendRequest(viewingFriendStats.id)
                : null
            }
            onMessage={() => {
              setViewingFriendStats(null);
              setShowFriends(true);
            }}
          />
        </Suspense>

        <NoteSystemModals
          notes={notes}
          tasks={tasks}
          habits={habits}
          onUpdateTasks={handleUpdateTasks}
          onUpdateHabits={handleUpdateHabits}
          isLibraryOpen={isNoteLibraryOpen}
          closeLibrary={() => setIsNoteLibraryOpen(false)}
          editingNote={editingNote}
          setEditingNote={setEditingNote}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onReorder={handleReorderNotes}
          onSaveOrder={() => saveNotesOrder(notes)}
          isPro={isPro}
          onOpenPro={() => setProModalSource('notes')}
        />

        <GetProModal
          isOpen={!!proModalSource} // Open if source is not null
          onClose={() => setProModalSource(null)}
          onUpgrade={handleUpgradeToPro}
          source={proModalSource} // Pass the source string ('notes' or 'arcade')
        />

        {/* --- GLOBAL REMINDER SYSTEM (Hidden) --- */}
        <TaskReminderSystem tasks={tasks} />




        {/* --- COMMAND MENU --- */}
        {
          (onboardingStep >= 3 || onboardingInnerStep === 2) && (
            <Suspense fallback={null}>
              <CommandMenu
                onboardingMode={onboardingStep < 3}
                onOnboardingNext={() => setOnboardingInnerStep(3)}
                openNotes={() => setIsNoteLibraryOpen(true)}
                openMusic={() => setShowMusic(true)}
                openSocial={() => setShowFriends(true)}
                openSettings={(tab = 'preferences') => { setSettingsTab(tab); setIsUnifiedModalOpen(true); }}
                setTimerActive={setIsActive}

                // Timer Controls
                mode={mode}
                setMode={handleModeChange}
                timeLeft={timeLeft}
                setTimeLeft={setTimeLeft}
                isActive={isActive}
                settings={settings}
                setSettings={setSettings}

                // Shortcuts
                setEditingNote={setEditingNote}

                // Sounds
                playAmbience={toggleAmbience}
                unlockedAmbiences={unlockedAmbiences}
                ambientSounds={AMBIENT_SOUNDS} // Pass data constant

                // Quicklinks
                quicklinks={quicklinks}
                setQuicklinks={setQuicklinks}
              />
            </Suspense>
          )
        }



      </div>
      {/* </VideoManager> */}
    </>
  );
}
export default function App() {
  const pathname = window.location.pathname;

  return (
    <Suspense fallback={<AppLoader />}>
      {pathname === '/releasenotes' && <ReleaseNotesPage />}
      {pathname === '/privacy' && <PrivacyPolicyPage />}
      {pathname === '/about' && <AboutPage />}
      {pathname === '/contact' && <ContactPage />}
      {pathname === '/downloads' && <DownloadsPage />}

      {pathname !== '/releasenotes' &&
        pathname !== '/privacy' &&
        pathname !== '/about' &&
        pathname !== '/contact' &&
        pathname !== '/downloads' && (
          <ErrorBoundary>
            <MainApp />
          </ErrorBoundary>
        )}
    </Suspense>
  );
}
