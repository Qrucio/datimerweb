import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, X, Plus, Music, SkipForward, SkipBack, Check, Trash2, BarChart2, Zap, Coffee, Flame, CheckSquare, Clock, Sparkles, Loader2, RotateCw, GripVertical, ArrowRight, Pencil, LogIn, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, UserPlus, Circle, Pin, UserMinus, Maximize, Minimize, AlertTriangle, ShieldAlert, Lock, Unlock, Volume2, Bold, Italic, List, StickyNote as StickyNoteIcon, VolumeX, LogOut, GripHorizontal, CloudRain, CloudLightning, Wind, Waves, Tent, Trees, Train, Keyboard, Headphones, Radio, Gamepad2, ChevronUp, ChevronDown, Ban, Bell, Download, Brain, CheckCircle2, Crown, TrendingUp, } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot, Timestamp, collection, query, where, getDocs, orderBy, getDoc, limit, deleteDoc, increment, writeBatch } from "firebase/firestore";
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { createPortal } from 'react-dom';
import CloseButton from './components/ui/CloseButton';
import { Storage } from './utils/storage';
import UnifiedSettingsModal from './components/modals/UnifiedSettingsModal';
import OnboardingFlow from './components/OnboardingFlow';
import SocialModal from './components/modals/SocialModal';
import MusicModal from './components/modals/MusicModal';
import Avatar from './components/Avatar';
import { BACKGROUND_OPTIONS, AMBIENT_SOUNDS, MUSIC_TRACKS } from './utils/data';
import SnakeGame, { SnakeIcon } from './components/games/SnakeGame';
import TypingGame from './components/games/TypingGame';

const CHROME_ID = "jedfahaahenadaohjcppmoghhepiigdp";
const FIREFOX_ID = "altimercompanion@qruciatus.com";
import CaffeineTracker from './components/CaffeineTracker';

const getExtensionId = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf("firefox") > -1) return FIREFOX_ID;
  return CHROME_ID;
};

const syncWithExtension = (isActive, isStrict, mode) => {
  // We send a message to the window. 
  // The content.js (injected by extension) will catch this and relay it.
  window.postMessage({
    type: "ALTIMER_SYNC_REQUEST",
    payload: {
      type: 'SYNC_TIMER',
      isActive: isActive,
      isStrict: isStrict,
      mode: mode
    }
  }, "*");
};

const getBrowserType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf("firefox") > -1) return "firefox";
  if (userAgent.indexOf("safari") > -1 && userAgent.indexOf("chrome") === -1) return "webkit";
  return "chromium"; // Default to Chromium (Chrome, Brave, Edge, Opera)
};

// --- HANDLE GENERATOR HELPERS ---
const generateCandidateHandle = (name) => {
  // Cleans name, takes first 10 chars, adds random 4-digit suffix
  const cleanName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 10);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `@${cleanName}_${suffix}`.toLowerCase();
};

const getUniqueHandle = async (baseName) => {
  let isUnique = false;
  let attempt = 0;
  let handle = "";

  // Try up to 5 times to find a unique handle
  while (!isUnique && attempt < 5) {
    handle = generateCandidateHandle(baseName);

    // Check against Public Profiles (Efficient Query)
    const q = query(
      collection(db, "publicProfiles"),
      where("handle_lowercase", "==", handle.toLowerCase())
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      isUnique = true;
    }
    attempt++;
  }

  // Fallback: Use timestamp to guarantee uniqueness if loop fails
  if (!isUnique) {
    handle = `@${baseName.slice(0, 5)}_${Date.now().toString().slice(-6)}`;
  }

  return handle;
};

const AppLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <RevealLogo src="/logo/altimerwhite.png" className="w-16 h-16 opacity-50" disableReveal={true} />
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  </div>
);



// --- ERROR BOUNDARY COMPONENT ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CRITICAL APP ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white">
          {/* Ensure fonts are loaded even in error state */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
            .font-serif-display { font-family: 'Playfair Display', serif; }
          `}</style>

          <h1 className="font-serif-display text-4xl md:text-6xl text-white tracking-tight">
            Under Maintenance
          </h1>
          <p className="mt-4 text-white/30 text-sm font-sans">
            Please refresh or try again later.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_APP_FIREBASE_MEASUREMENT_ID,
};

let app, auth, db, provider;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  provider = new GoogleAuthProvider();
} catch (e) {
  console.warn("Firebase config missing. App running in offline mode.");
}

const apiKey = import.meta.env.VITE_APP_GEMINI_API_KEY;
const callGemini = async (prompt) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};


const cleanText = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/^["']|["']$/g, '')
    .trim();
};

const isVideo = (url) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|mov)$/i);
};



const loadTimerState = () => {
  try {
    const saved = localStorage.getItem('zen_timer_state');
    if (saved) {
      const { mode, isActive, targetEndTime, timeLeft } = JSON.parse(saved);
      if (isActive && targetEndTime) {
        const remaining = Math.ceil((targetEndTime - Date.now()) / 1000);
        return remaining > 0
          ? { mode, isActive: true, timeLeft: remaining }
          : { mode, isActive: false, timeLeft: 0 };
      }
      return { mode, isActive: false, timeLeft };
    }
  } catch (e) {
    console.warn("Failed to load timer state", e);
  }
  return null;
};

// Helper for date comparison
const isSameDay = (d1, d2) => {
  return d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();
};

const isYesterday = (today, pastDate) => {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(pastDate, yesterday);
};

const formatDateId = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format seconds into readable string (e.g., "1h 30m 10s")
const formatDetailedDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
};

const GlobalStyles = () => (
  <style>{`
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@700&family=Rajdhani:wght@700&display=swap');
    @import url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/css/dseg.min.css');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Rajdhani:wght@700&display=swap');
    
    body { 
      background-color: #000000; 
      color: #ffffff; 
      font-family: 'Inter', sans-serif; 
      margin: 0; 
      overflow-x: hidden; 
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-tap-highlight-color: transparent;
    }
    @media (min-width: 768px) { body { overflow: hidden; } }
    
    @media (max-width: 767px) {
      * {
        -webkit-tap-highlight-color: transparent;
      }
      button, a, input, textarea, select {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      input, textarea {
        font-size: 16px; /* Prevents zoom on iOS */
      }
    }
    
    .font-serif-display { font-family: 'Playfair Display', serif; }
    .font-clock { font-family: 'Montserrat', sans-serif; font-weight: 700; }
    .font-logo { font-family: 'Rajdhani', sans-serif; font-weight: 700; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 2px; }

    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.2, 0.0, 0.2, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.2, 0.0, 0.2, 1) forwards; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @keyframes wordRise { 0% { opacity: 0; transform: translateY(20px); filter: blur(4px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0); } }
    .word-animate { opacity: 0; display: inline-block; animation: wordRise 0.8s cubic-bezier(0.2, 0.0, 0.2, 1) forwards; }

    .strike-text { 
      position: relative;
      background-image: linear-gradient(to right, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.6) 100%); 
      background-repeat: no-repeat; 
      background-position: 0 50%; 
      background-size: 0% 1.5px; 
      transition: background-size 0.5s cubic-bezier(0.25, 1, 0.5, 1), color 0.5s cubic-bezier(0.25, 1, 0.5, 1); 
      display: inline; 
      box-decoration-break: clone; 
      -webkit-box-decoration-break: clone; 
    }
    .completed .strike-text { 
      background-size: 100% 1.5px; 
      color: rgba(255, 255, 255, 0.35); 
    }

    .blur-enter { animation: blurIn 0.8s ease-out forwards; }
    .blur-exit { animation: blurOut 0.5s ease-in forwards; }
    @keyframes blurIn { from { opacity: 0; filter: blur(8px); transform: scale(0.98); } to { opacity: 1; filter: blur(0); transform: scale(1); } }
    @keyframes blurOut { from { opacity: 1; filter: blur(0); transform: scale(1); } to { opacity: 0; filter: blur(8px); transform: scale(1.02); } }

    .cursor-blink { animation: blink 1s step-end infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    .toggle-checkbox:checked {
      right: 0;
      border-color: #68D391;
    }
    .toggle-checkbox:checked + .toggle-label {
      background-color: #fff;
    }
    
    .toggle-switch {
        position: relative;
        width: 44px;
        height: 26px;
        background-color: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        cursor: pointer;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .toggle-switch.on {
        background-color: rgba(52, 199, 89, 0.3);
        border-color: rgba(52, 199, 89, 0.4);
        box-shadow: 0 0 15px rgba(52, 199, 89, 0.2), inset 0 0 10px rgba(52, 199, 89, 0.1);
    }
    .toggle-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        background: linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 100%);
        border-radius: 50%;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .toggle-switch.on .toggle-knob {
        transform: translateX(18px);
        background: #ffffff;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    @keyframes logo-spin {
      0% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-5px) rotate(-180deg); }
      100% { transform: translateY(0) rotate(-360deg); }
    }
    
    .logo-spin-active {
      animation: logo-spin 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  `}</style>
);

// Replaces SpinningLogo
const RevealLogo = ({ src, className, disableReveal = false }) => {
  return (
    <motion.div
      className={`group relative flex items-center justify-center ${disableReveal ? '' : 'cursor-pointer'}`}
      initial="rest"
      whileHover={disableReveal ? "rest" : "hover"}
      animate="rest"
    >
      {/* The Logo Image (The "A") */}
      <motion.img
        src={src}
        alt="altimer Logo"
        className={`${className} relative z-10 object-contain`}
        variants={{
          rest: { x: 0 },
          // Shift left slightly to make space for the text
          hover: { x: -8 }
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />

      {/* The Reveal Text ("ltimer") */}
      {!disableReveal && (
        <div className="overflow-hidden flex items-center absolute left-[85%] top-0 bottom-0 pl-1">
          <motion.span
            className="font-logo text-white leading-none tracking-wide whitespace-nowrap"
            style={{
              fontSize: '150%', // Matches logo scale
              lineHeight: '1',
              marginTop: '0.1em'
            }}
            variants={{
              // Start hidden behind the logo, shifted left, transparent
              rest: { x: -20, opacity: 0, width: 0 },
              // Slide out to natural position
              hover: { x: 0, opacity: 1, width: "auto" }
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            timer
          </motion.span>
        </div>
      )}
    </motion.div>
  );
};


const Toggle = ({ label, checked, onChange }) => (
  <div
    className="flex justify-between items-center w-full group cursor-pointer py-3 select-none"
    onClick={() => onChange(!checked)}
  >
    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
      {label}
    </span>

    {/* Track */}
    <div
      className={`relative w-[51px] h-[31px] flex-shrink-0 rounded-full border transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${checked
        ? 'bg-[#34C759] border-[#34C759] shadow-[0_0_15px_rgba(52,199,89,0.4)]' // iOS Green + Glow
        : 'bg-[#39393d] border-transparent' // iOS Dark Mode Off Grey
        }`}
    >
      {/* Knob - ALWAYS WHITE, PERFECT CIRCLE */}
      <div
        className={`absolute top-[1px] left-[1px] w-[27px] h-[27px] bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${checked ? 'translate-x-[20px]' : 'translate-x-0'
          }`}
      />
    </div>
  </div>
);

// Updated StatCard: Monochrome & Rounded-2xl
const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between h-20 md:h-24">
    <div className="flex justify-between items-start">
      <span className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
      {Icon && <Icon size={14} className="text-white/30" />}
    </div>
    <div className="text-lg md:text-xl font-light text-white tracking-wide font-clock">{value}</div>
  </div>
);

const BendingDivider = ({ activeSide, isDimmed }) => {
  // activeSide: 'left', 'right', or null

  const variants = {
    // 1. IDLE: We use a Q (Curve) command even for the straight line.
    // The control point (middle number) is at x=3 (center), so it looks straight.
    idle: { d: "M 3 2 Q 3 10 3 18" },

    // 2. BEND RIGHT: Control point moves to x=7 (pushes right)
    // Used when the left neighbor expands
    bendRight: { d: "M 3 2 Q 7 10 3 18" },

    // 3. BEND LEFT: Control point moves to x=-1 (pushes left)
    // Used when the right neighbor expands
    bendLeft: { d: "M 3 2 Q -1 10 3 18" },
  };

  return (
    <div className={`w-3 h-5 flex items-center justify-center transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
      <svg width="6" height="20" viewBox="0 0 6 20" className="overflow-visible">
        <motion.path
          variants={variants}
          initial="idle"
          animate={activeSide === 'left' ? 'bendRight' : activeSide === 'right' ? 'bendLeft' : 'idle'}
          // STIFFNESS/DAMPING FIX:
          // stiffness: 300 (fast response)
          // damping: 30 (kills the wobble/oscillation quickly)
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  );
};

// --- CALENDAR VIEW COMPONENT ---
const CalendarView = ({ historyData, currentMonth, setCurrentMonth, onSelectDate, selectedDate }) => {
  const [viewMode, setViewMode] = useState('days'); // 'days' or 'months'
  const [selectorYear, setSelectorYear] = useState(currentMonth.getFullYear());

  // Effect to sync selector year when currentMonth changes from external
  useEffect(() => {
    setSelectorYear(currentMonth.getFullYear());
  }, [currentMonth]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrev = () => {
    if (viewMode === 'days') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    } else {
      setSelectorYear(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    } else {
      setSelectorYear(prev => prev + 1);
    }
  };

  const handleMonthSelect = (monthIndex) => {
    setCurrentMonth(new Date(selectorYear, monthIndex, 1));
    setViewMode('days');
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const getDayStyle = (date) => {
    if (!date) return 'invisible';
    const dateId = formatDateId(date);
    const dayStats = historyData[dateId];

    // Base Text Style
    let textStyle = 'text-white/20'; // No data (Grey)

    if (dayStats && dayStats.dailyFocusTime > 0) {
      textStyle = 'text-white font-bold'; // Has data (White)
    }

    // Selection Style (Circular background)
    const isSelected = date && selectedDate && isSameDay(date, selectedDate);
    const selectionBg = isSelected ? 'bg-white/20 rounded-full' : '';

    return `${textStyle} ${selectionBg}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setViewMode(viewMode === 'days' ? 'months' : 'days')}
          className="text-base md:text-lg font-medium text-white hover:text-white/80 transition-colors flex items-center gap-1"
        >
          {viewMode === 'days' ? `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}` : selectorYear}
        </button >
        <div className="flex gap-2">
          <button onClick={handlePrev} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"><ChevronLeft size={18} /></button>
          <button onClick={handleNext} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"><ChevronRight size={18} /></button>
        </div>
      </div >

      {
        viewMode === 'days' ? (
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {/* FIX: Use index (i) as key instead of day letter (d) */}
            {
              ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[10px] text-white/30 font-medium py-0.5">{d}</div>
              ))
            }
            {
              days.map((date, idx) => (
                <button
                  key={idx}
                  disabled={!date}
                  onClick={() => date && onSelectDate(date)}
                  className={`h-8 w-8 md:h-9 md:w-9 flex items-center justify-center text-xs font-medium transition-all duration-200 mx-auto hover:text-white
                ${getDayStyle(date)}
                `}
                >
                  {date ? date.getDate() : ''}
                </button>
              ))
            }
          </div >
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((month, index) => (
              <button
                key={month}
                onClick={() => handleMonthSelect(index)}
                className={`p-3 rounded-xl text-sm font-medium transition-colors
                        ${currentMonth.getMonth() === index && selectorYear === currentMonth.getFullYear()
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}
                    `}
              >
                {month.substring(0, 3)}
              </button>
            ))}
          </div>
        )
      }
    </div >
  );
};


const GetProModal = ({ isOpen, onClose, onUpgrade, source = 'notes' }) => {
  // Config for the modal content
  const content = {
    notes: {
      title: "Limit Reached",
      description: <>Free users are limited to 3 notes. Upgrade to <span className="text-cyan-400 font-bold">Flow</span> for unlimited notes, exclusive themes, and more.</>,
      icon: StickyNoteIcon
    },
    arcade: {
      title: "Unlock Arcade",
      description: <>Gain access to <span className="text-cyan-400 font-bold">Flow</span> exclusive games, multiplayer modes, and global leaderboards.</>,
      icon: Gamepad2
    },
    ambience: {
      title: "Soundscape Locked",
      description: <>You have chosen your 3 free sounds. Upgrade to <span className="text-cyan-400 font-bold">Flow</span> to unlock the full library and mix unlimited sounds.</>,
      icon: CloudRain
    },
    music: {
      title: "Unlock Focus Music",
      description: <>Curated Focus Tracks are a <span className="text-cyan-400 font-bold">Flow</span> feature. Upgrade to access high-fidelity binaural beats and lofi streams.</>,
      icon: Music
    },
    settings: {
      title: "Unlock Everything",
      description: (
        <div className="flex flex-col gap-3 mt-1">
          <p className="text-white/60 text-sm">Become a Flow member to remove all limits and access the complete experience.</p>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-left">
            {[StickyNoteIcon, Gamepad2, CloudRain, Music, Crown].map((Icon, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-1 bg-cyan-400/10 rounded text-cyan-400"><Icon size={12} /></div>
                <span className="text-xs text-white/80">Flow Feature Unlocked</span>
              </div>
            ))}
          </div>
        </div>
      ),
      icon: Crown
    }
  };

  const currentContent = content[source] || content.notes;
  const Icon = currentContent.icon;

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-sm p-8 bg-[#111] border border-cyan-500/30 rounded-3xl text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Blue Background Blur */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan-500/10 blur-[50px] pointer-events-none" />

            <div className="relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Icon size={32} />
            </div>

            <h2 className="relative z-10 text-2xl font-serif-display text-white mb-2">{currentContent.title}</h2>
            <div className="relative z-10 text-white/60 text-sm mb-8 leading-relaxed px-1">
              {currentContent.description}
            </div>

            <button onClick={() => { if (onUpgrade) onUpgrade(); }} className="relative z-10 w-full py-3.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-sm uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-cyan-500/20">
              Upgrade to Flow
            </button>
            <button onClick={onClose} className="mt-4 text-xs text-white/30 hover:text-white uppercase tracking-widest font-bold transition-colors">Maybe Later</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// --- ADD THIS FUNCTION ---
const handleUpgradeToPro = async () => {
  if (!user) return;

  // Simulate a Pro Upgrade for testing
  try {
    // 1. Update Private User Doc
    await setDoc(doc(db, "users", user.uid), {
      subscription: { plan: 'pro', status: 'active', since: Date.now() }
    }, { merge: true });

    // 2. Update Public Profile (so friends see the gold ring)
    await setDoc(doc(db, "publicProfiles", user.uid), {
      isPro: true
    }, { merge: true });

    // 3. Update Local State
    setIsPro(true);
    setProModalSource(null); // Close the modal

    // (Optional) Trigger the celebration modal manually if needed
    // but the useEffect watching 'isPro' should handle it.

  } catch (e) {
    console.error("Upgrade simulation failed:", e);
  }
};

const handleSaveAmbienceSelection = async (selectedIds) => {
  if (!user) return;
  try {
    await setDoc(doc(db, "users", user.uid), {
      preferences: {
        unlockedAmbiences: selectedIds,
        ambienceSetupDone: true
      }
    }, { merge: true });

    setUnlockedAmbiences(selectedIds);
    setAmbienceSetupDone(true);
  } catch (e) {
    console.error("Failed to save ambience selection", e);
  }
};


const AccountModal = ({
  isOpen,
  onClose,
  user,
  stats,
  onSignOut,
  isPro,
  onDeleteRequest,
  currentHandle // <--- Destructured new prop
}) => {
  const [activeTab, setActiveTab] = useState('today');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyData, setHistoryData] = useState({});

  // --- HANDLE EDITING STATE ---
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [handleStatus, setHandleStatus] = useState("idle"); // 'idle', 'checking', 'available', 'taken'
  const [handleSuggestions, setHandleSuggestions] = useState([]);
  const [handleError, setHandleError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Initialize Handle State
  useEffect(() => {
    if (user && isOpen) {
      // LOGIC FIX: Use the currentHandle prop passed from MainApp
      const current = currentHandle || "";
      setNewHandle(current.replace(/^@/, ''));
      checkCooldown();
    }
  }, [user, isOpen, currentHandle]);

  // Load History
  useEffect(() => {
    if (isOpen && activeTab === 'history' && user) {
      const historyRef = collection(db, 'users', user.uid, 'history');
      const q = query(historyRef, orderBy('date', 'desc'));
      getDocs(q).then(snapshot => {
        const data = {};
        snapshot.forEach(doc => { data[doc.id] = doc.data(); });
        setHistoryData(data);
      });
    }
  }, [isOpen, activeTab, currentMonth, user]);

  // --- LIVE CHECK AVAILABILITY ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isEditingHandle && newHandle.length >= 3) {
        // Ignore if it matches current handle (case insensitive)
        const currentStr = currentHandle || "";
        const cleanCurrent = currentStr.replace(/^@/, '');

        if (newHandle.toLowerCase() === cleanCurrent.toLowerCase()) {
          setHandleStatus("available");
          return;
        }

        setHandleStatus("checking");
        const fullHandle = `@${newHandle}`;

        // Query DB
        const q = query(collection(db, "publicProfiles"), where("handle_lowercase", "==", fullHandle.toLowerCase()));
        const snap = await getDocs(q);

        if (snap.empty) {
          setHandleStatus("available");
        } else {
          // Double check it's not the user themselves (redundant safety)
          if (snap.docs[0].id === user.uid) {
            setHandleStatus("available");
          } else {
            setHandleStatus("taken");
            // Generate suggestions
            const base = newHandle.replace(/[^a-zA-Z0-9_]/g, '');
            const s1 = `${base}_${Math.floor(Math.random() * 99)}`;
            const s2 = `${base}${new Date().getFullYear()}`;
            const s3 = `its_${base}`;
            setHandleSuggestions([s1, s2, s3]);
          }
        }
      } else if (newHandle.length > 0 && newHandle.length < 3) {
        setHandleStatus("idle"); // Too short to check
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newHandle, isEditingHandle, user, currentHandle]);

  // --- COOLDOWN CHECKER ---
  const checkCooldown = async () => {
    if (!user) return;
    const DEV_IDS = ['cmxtLQPCqkfhkhNQZ04ZlXjCPbV2', 'QHlFAC3H34fiIVT2LaWlAoOrjmH2'];
    if (DEV_IDS.includes(user.uid)) {
      setDaysRemaining(0);
      return;
    }
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists()) {
      const lastChange = userSnap.data().lastHandleChange || 0;
      const now = Date.now();
      const diffTime = Math.abs(now - lastChange);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 14) {
        setDaysRemaining(14 - diffDays);
      } else {
        setDaysRemaining(0);
      }
    }
  };

  const handleSaveHandle = async () => {
    if (handleStatus !== 'available') return;
    if (newHandle.length < 3) return setHandleError("Too short.");
    if (daysRemaining > 0) return setHandleError(`Wait ${daysRemaining} days.`);

    setIsSaving(true);
    setHandleError(null);
    const fullHandle = `@${newHandle}`;

    try {
      const batch = writeBatch(db);
      const publicRef = doc(db, "publicProfiles", user.uid);
      batch.set(publicRef, {
        uid: user.uid,
        displayName: user.displayName || "User",
        photoURL: user.photoURL || null,
        handle: fullHandle,
        handle_lowercase: fullHandle.toLowerCase()
      }, { merge: true });

      const privateRef = doc(db, "users", user.uid);
      batch.set(privateRef, {
        handle: fullHandle,
        lastHandleChange: Date.now()
      }, { merge: true });

      await batch.commit();

      setIsEditingHandle(false);
      setDaysRemaining(14);

    } catch (err) {
      console.error("HANDLE SAVE ERROR:", err);
      setHandleError("Error saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const onHandleChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
    setNewHandle(val);
    setHandleError(null);
    if (val.length > 0) setHandleStatus("checking");
  };

  const getEffectiveHistory = () => {
    const todayId = formatDateId(new Date());
    return { ...historyData, [todayId]: { ...stats, date: new Date() } };
  };

  const getDisplayStats = () => {
    if (activeTab === 'today') return stats;
    if (selectedDate) {
      const dateId = formatDateId(selectedDate);
      return getEffectiveHistory()[dateId] || { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0, currentStreak: '-' };
    }
    return { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0, currentStreak: '-' };
  };

  const finalStats = getDisplayStats();

  // Dynamic Styles for Input
  const getInputContainerStyle = () => {
    if (handleStatus === 'available') return 'border-green-500/50 bg-green-500/5';
    if (handleStatus === 'taken') return 'border-red-500/50 bg-red-500/5';
    return 'border-white/20 bg-black/40';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            layout
            initial={{ scale: 0.95, opacity: 0, y: 10 }} // Reduced motion
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }} // Smoother/Lighter
            className="bg-[#111] border border-white/10 rounded-3xl w-[95vw] md:w-full md:max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] will-change-transform"
            onClick={e => e.stopPropagation()}
          >
            {/* ... (Keep the content inside exactly the same) ... */}
            {/* LEFT COLUMN */}
            <motion.div layout className="w-full md:w-[320px] border-b md:border-b-0 md:border-r border-white/10 bg-white/5 p-8 flex flex-col items-center justify-center text-center relative">
              {/* ... Content ... */}
              {/* Just ensure you copy the inner content from your existing file */}
              <button onClick={onClose} className="absolute top-4 left-4 md:hidden text-white/50 hover:text-white"><X size={20} /></button>
              <div className="w-24 h-24 md:w-32 md:h-32 mb-2 relative z-10">
                <Avatar userData={user} isPro={isPro} size="full" />
              </div>
              {/* ... rest of AccountModal content ... */}
              <h2 className="text-2xl font-bold text-white leading-tight">{user?.displayName || "Guest User"}</h2>

              {/* ... (Copy the rest of your AccountModal render logic here) ... */}
              <div className="mb-6 w-full flex flex-col items-center min-h-[24px] justify-center relative z-20">
                {/* ... Handle logic ... */}
                {isEditingHandle ? (
                  // ... input code ...
                  <div className="flex flex-col items-center gap-2 animate-fade-in-up w-full">
                    {/* ... */}
                    {/* Shortened for brevity - keep your existing JSX here */}
                    <div className={`flex items-center justify-between rounded-xl pl-4 pr-2 py-1 transition-all duration-300 relative w-full max-w-[220px] border ${getInputContainerStyle()}`}>
                      {/* ... inputs ... */}
                      <div className="flex items-center flex-1 min-w-0">
                        <span className="text-white/40 select-none mr-0.5 text-sm">@</span>
                        <input type="text" value={newHandle} onChange={onHandleChange} placeholder="username" onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setIsEditingHandle(false); setHandleError(null); setNewHandle(currentHandle ? currentHandle.replace(/^@/, '') : ""); } else if (e.key === 'Enter') { e.preventDefault(); handleSaveHandle(); } }} className="bg-transparent border-none outline-none text-sm font-medium text-white placeholder-white/20 w-full py-1" autoFocus maxLength={15} />
                      </div>
                      {/* ... buttons ... */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => { setIsEditingHandle(false); setHandleError(null); setHandleStatus('idle'); setNewHandle(currentHandle ? currentHandle.replace(/^@/, '') : ""); }} className="p-1 rounded-full text-white/30 hover:bg-white/10 hover:text-white transition-colors"><X size={16} /></button>
                        <button onClick={handleSaveHandle} disabled={isSaving || handleStatus !== 'available'} className={`p-1 rounded-full transition-colors ${(isSaving || handleStatus !== 'available') ? 'text-white/20 cursor-not-allowed' : 'text-white hover:bg-white/20'}`}>{isSaving || handleStatus === 'checking' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}</button>
                      </div>
                    </div>
                    {/* ... suggestions ... */}
                    <div className="min-h-[16px] w-full flex flex-col items-center">
                      {handleStatus === 'taken' && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                          <span className="text-[10px] text-red-400 font-medium">Handle taken. Suggestions:</span>
                          <div className="flex flex-wrap justify-center gap-2">
                            {handleSuggestions.map(s => (<button key={s} onClick={() => { setNewHandle(s); setHandleStatus("available"); }} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-white/70 hover:text-white transition-colors border border-white/5">{s}</button>))}
                          </div>
                        </motion.div>
                      )}
                      {handleError && <span className="text-[10px] text-red-400 font-medium whitespace-nowrap">{handleError}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="relative group flex items-center justify-center">
                    <p className="text-white text-base font-medium tracking-wide">{currentHandle || "@no_handle"}</p>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2">
                      <button onClick={() => setIsEditingHandle(true)} disabled={daysRemaining > 0} className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full ${daysRemaining > 0 ? 'cursor-not-allowed text-white/5' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}>{daysRemaining > 0 ? <Lock size={12} /> : <Pencil size={12} />}</button>
                      {daysRemaining > 0 && (<div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#111] border border-white/10 rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"><p className="text-[10px] text-white/50 whitespace-nowrap">Change in {daysRemaining} days</p></div>)}
                    </div>
                  </div>
                )}
              </div>

              {isPro && (<div className="mb-6 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Sparkles size={10} /> PRO MEMBER</div>)}
              <div className="w-full space-y-3 mt-auto"><button onClick={onSignOut} className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 group"><LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> Sign Out</button><div className="pt-2"><button onClick={onDeleteRequest} className="text-[10px] text-red-900 hover:text-red-600 underline decoration-red-900/30 hover:decoration-red-600 transition-colors font-mono uppercase tracking-widest cursor-pointer opacity-60 hover:opacity-100">Delete Account</button></div></div>
            </motion.div>

            {/* RIGHT COLUMN */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
              <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                <div className="flex gap-6"><button onClick={() => setActiveTab('today')} className={`text-sm font-medium transition-colors border-b-2 pb-0.5 ${activeTab === 'today' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>Today</button><button onClick={() => setActiveTab('history')} className={`text-sm font-medium transition-colors border-b-2 pb-0.5 ${activeTab === 'history' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>History</button></div>
                <button onClick={onClose} className="hidden md:block text-white/50 hover:text-white"><X size={20} /></button>
              </div>
              <motion.div layout className="overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'history' && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8"><CalendarView historyData={getEffectiveHistory()} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} onSelectDate={setSelectedDate} selectedDate={selectedDate} /></motion.div>)}
                <div className="grid grid-cols-2 gap-4"><StatCard label={activeTab === 'today' ? "Focus Time" : "Focus"} value={formatDetailedDuration(finalStats.dailyFocusTime || 0)} icon={Zap} /><StatCard label="Break Time" value={formatDetailedDuration(finalStats.dailyBreakTime || 0)} icon={Coffee} /><StatCard label="Sessions" value={finalStats.dailySessions || 0} icon={Clock} />{activeTab === 'today' && <StatCard label="Current Streak" value={`${finalStats.currentStreak || 0} d`} icon={Flame} />}</div>
              </motion.div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
// --- HELPERS FOR FRIEND STATS ---

const FriendStatCard = ({ label, value, icon: Icon, delay = 0, isHero = false, highlight = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className={`relative flex flex-col justify-between p-5 rounded-2xl overflow-hidden group 
      ${isHero ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 col-span-2' : 'bg-black/20 border border-white/5 hover:border-white/10 transition-colors'} 
      ${highlight ? 'ring-1 ring-white/20 bg-white/5' : ''}`
    }
  >
    <div className="flex justify-between items-start z-10">
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
      <div className={`p-1.5 rounded-lg ${isHero ? 'bg-white/10 text-white' : 'bg-white/5 text-white/20 group-hover:text-white/50 transition-colors'}`}>
        <Icon size={isHero ? 18 : 14} />
      </div>
    </div>
    <div className={`mt-4 font-mono font-light tracking-wide text-white z-10 ${isHero ? 'text-3xl' : 'text-xl'}`}>
      {value}
    </div>
    {isHero && <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />}
  </motion.div>
);

const FriendStreakCard = ({ streak }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
    className="col-span-2 relative overflow-hidden rounded-2xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#1a0c00] to-black/40 group"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
    <div className="flex items-center justify-between relative z-10">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">Current Streak</span>
        </div>
        <div className="text-4xl font-serif-display text-white flex items-baseline gap-1">
          {streak} <span className="text-sm font-sans text-white/40 font-medium">days</span>
        </div>
      </div>
      <motion.div
        animate={{ scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 10px rgba(249,115,22,0.4))", "drop-shadow(0 0 20px rgba(249,115,22,0.7))", "drop-shadow(0 0 10px rgba(249,115,22,0.4))"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-orange-500"
      >
        <Flame size={48} fill="currentColor" fillOpacity={0.2} strokeWidth={1.5} />
      </motion.div>
    </div>
  </motion.div>
);

const FriendHistoryCalendar = ({ historyData, currentMonth, setCurrentMonth, selectedDate, onSelectDate, isExpanded, setIsExpanded }) => {
  const [viewMode, setViewMode] = useState('days');
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Basic Calendar Logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => { e?.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); };
  const handleNextMonth = (e) => { e?.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); };

  // Navigation
  const handlePrevDay = (e) => {
    e?.stopPropagation();
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    onSelectDate(prev);
    if (prev.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1));
  };
  const handleNextDay = (e) => {
    e?.stopPropagation();
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    onSelectDate(next);
    if (next.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
  const allSlots = [...blanks, ...days];

  return (
    <motion.div layout className={`w-full bg-white/5 border border-white/5 rounded-3xl overflow-hidden relative transition-colors duration-300 ${isExpanded ? 'p-6' : 'p-4 hover:bg-white/10 cursor-pointer'}`} onClick={() => !isExpanded && setIsExpanded(true)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {isExpanded ? (
          <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex justify-between items-center mb-6">
              <button onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'days' ? 'months' : 'days'); }} className="text-lg font-serif-display text-white hover:text-white/80 transition-colors flex items-center gap-2">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </button>
              <div className="flex gap-1">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-2"><ChevronDown size={18} className="rotate-180" /></button>
              </div>
            </div>
            {viewMode === 'days' ? (
              <div className="animate-fade-in">
                <div className="grid grid-cols-7 mb-2">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} className="text-center text-[10px] font-bold text-white/20 py-2">{d}</div>))}</div>
                <div className="grid grid-cols-7 gap-y-2">
                  {allSlots.map((date, i) => {
                    if (!date) return <div key={i} />;
                    const dateId = formatDateId(date);
                    const data = historyData[dateId];
                    const hasData = data && data.dailyFocusTime > 0;
                    const isSelected = selectedDate && formatDateId(selectedDate) === dateId;
                    const isToday = formatDateId(new Date()) === dateId;
                    const intensity = hasData ? Math.min(data.dailyFocusTime / (4 * 3600), 1) : 0;

                    return (
                      <div key={i} className="flex justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectDate(date); }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 relative group 
                            ${isSelected ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110 z-10' : ''} 
                            ${!isSelected && hasData ? 'text-white hover:bg-white/10' : ''} 
                            ${!isSelected && !hasData ? 'text-white/20 hover:text-white/50' : ''} 
                            ${isToday && !isSelected ? 'border border-white/20' : ''}`}
                        >
                          {!isSelected && hasData && <div className="absolute inset-0 bg-white rounded-full opacity-10" style={{ opacity: 0.1 + (intensity * 0.2) }} />}
                          {!isSelected && hasData && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />}
                          {date.getDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 animate-fade-in">
                {monthNames.map((m, i) => (
                  <button key={m} onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1)); setViewMode('days'); }} className={`p-3 rounded-xl text-sm font-medium transition-colors ${currentMonth.getMonth() === i ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/10 rounded-full text-white"><CalendarIcon size={18} /></div>
              <div><p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Selected Date</p><h4 className="text-lg font-serif-display text-white">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h4></div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={handleNextDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronRight size={16} /></button>
              <div className="w-px h-4 bg-white/10 mx-2"></div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"><span>Expand</span><ChevronDown size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FriendProfileModal = ({ isOpen, onClose, friend }) => {
  const [activeTab, setActiveTab] = useState('today');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [historyData, setHistoryData] = useState({});
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  const [profileData, setProfileData] = useState(friend || {});

  useEffect(() => {
    if (isOpen && friend) {
      const userDocRef = doc(db, "publicProfiles", friend.uid);
      const unsubUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData(prev => ({
            ...prev,
            ...data,
            stats: data.stats || {}
          }));
        }
      });

      const fetchHistory = async () => {
        try {
          const historyRef = collection(db, 'users', friend.uid, 'history');
          const q = query(historyRef, orderBy('date', 'desc'), limit(100));
          const snapshot = await getDocs(q);
          const data = {};
          snapshot.forEach(doc => { data[doc.id] = doc.data(); });
          setHistoryData(data);
        } catch (e) {
          console.log("History access restricted or failed", e);
        }
      };

      fetchHistory();
      return () => unsubUser();
    }
  }, [isOpen, friend]);

  const getStats = () => {
    const s = profileData.stats || {};
    return {
      dailyFocusTime: profileData.todayFocusTime ?? s.dailyFocusTime ?? 0,
      dailyBreakTime: s.dailyBreakTime ?? 0,
      dailySessions: s.dailySessions ?? 0,
      currentStreak: profileData.streak ?? s.currentStreak ?? 0
    };
  };
  const currentStats = getStats();

  const getSelectedStats = () => {
    const dateId = formatDateId(selectedDate);
    const todayId = formatDateId(new Date());
    if (dateId === todayId) return currentStats;
    return historyData[dateId] || { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0 };
  };

  const selectedStats = getSelectedStats();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" />

          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none md:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              className="w-full md:max-w-3xl h-[100dvh] md:h-[85vh] bg-[#0A0A0A] border-none md:border border-white/10 rounded-none md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto relative"
            >

              {/* --- HEADER --- */}
              <div className="flex flex-col bg-[#0F0F0F] border-b border-white/5 shrink-0 z-20 pb-4 md:pb-6">

                {/* Top Row: Info & Close */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 md:px-8 md:pt-8">
                  <div className="flex items-center gap-4">
                    {/* AVATAR */}
                    <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0">
                      <Avatar userData={profileData} size="full" isPro={profileData?.isPro} />
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-serif-display text-white tracking-tight leading-none">
                          {profileData?.displayName}
                        </h2>

                        {/* --- MINIMALIST FLOW BADGE --- */}
                        {profileData?.isPro && (
                          <img
                            src="/protag.png"
                            alt="Flow Member"
                            className="h-5 w-auto object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] mt-0.5"
                            title="Flow Member"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/50 font-medium">{profileData?.handle}</span>
                        {profileData?.isOnline && (
                          <span className={`flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${profileData.isActive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${profileData.isActive ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            {profileData.statusText?.split('•')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all">
                    <X size={18} />
                  </button>
                </div>

                {/* View Switcher Pills */}
                <div className="px-5 md:px-8">
                  <div className="inline-flex p-1 bg-white/5 rounded-full border border-white/5 relative">
                    {['today', 'history'].map(view => (
                      <button
                        key={view}
                        onClick={() => setActiveTab(view)}
                        className={`relative flex items-center justify-center px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${activeTab === view ? 'text-black' : 'text-white/40 hover:text-white'}`}
                      >
                        {activeTab === view && (
                          <motion.div
                            layoutId="friendStatsPill"
                            className="absolute inset-0 bg-white rounded-full shadow-lg z-[-1]"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* --- CONTENT AREA --- */}
              <div className="flex-1 p-5 md:p-8 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#0A0A0A]">
                <AnimatePresence mode="wait">
                  {activeTab === 'today' ? (
                    <motion.div
                      key="today"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <FriendStatCard label="Focus Today" value={formatDetailedDuration(currentStats.dailyFocusTime || 0)} icon={Zap} isHero={true} />
                      <FriendStatCard label="Break Time" value={formatDetailedDuration(currentStats.dailyBreakTime || 0)} icon={Coffee} delay={0.1} />
                      <FriendStatCard label="Sessions" value={currentStats.dailySessions || 0} icon={TrendingUp} delay={0.15} />
                      <FriendStreakCard streak={currentStats.currentStreak || 0} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-6"
                    >
                      <FriendHistoryCalendar
                        historyData={historyData}
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        isExpanded={isCalendarExpanded}
                        setIsExpanded={setIsCalendarExpanded}
                      />

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 border-t border-white/10 pt-6">
                          <h4 className="font-serif-display text-lg text-white">
                            {!isCalendarExpanded ? "Overview" : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <FriendStatCard label="Focus Time" value={formatDetailedDuration(selectedStats.dailyFocusTime || 0)} icon={Zap} highlight />
                          <FriendStatCard label="Break Time" value={formatDetailedDuration(selectedStats.dailyBreakTime || 0)} icon={Coffee} />
                          <FriendStatCard label="Sessions" value={selectedStats.dailySessions || 0} icon={TrendingUp} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const StrictConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
            <Lock size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-medium text-white text-center mb-2">Enable Strict Mode?</h3>
          <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
            This will force full-screen during Focus sessions. If you try to exit or switch tabs, the timer will pause and a warning will appear.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-3 rounded-xl transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 bg-white text-black hover:bg-gray-200 text-sm font-bold py-3 rounded-xl transition-colors">Enable</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const StrictWarningModal = ({ isOpen, onResume, onDisable }) => {
  useEffect(() => {
    if (isOpen) {
      const audio = new Audio('/sounds/strict-mode.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed", e));
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center max-w-md">
            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 animate-pulse">
              <ShieldAlert size={48} className="text-red-500" />
            </div>

            <h2 className="text-3xl md:text-4xl font-serif-display text-white mb-4">Strict Mode Active</h2>
            <p className="text-white/50 mb-8 leading-relaxed">
              Focus is paused. Return to your session to resume.
            </p>

            <button onClick={onResume} className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2 mb-4">
              <Play size={18} fill="black" />
              <span>Resume Focus</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const StrictDisableModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
            <Unlock size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-medium text-white text-center mb-2">Turn off Strict Mode?</h3>
          <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
            Disabling this means the app will no longer force full-screen or block distractions during this session.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-3 rounded-xl transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 bg-white text-black hover:bg-gray-200 text-sm font-bold py-3 rounded-xl transition-colors">Turn Off</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);


// ... (SettingsModal, ConfirmationModal, KeyboardHelpModal remain unchanged)
const SettingsModal = ({ isOpen, onClose, settings, onSave, onBackgroundChange, user, isTimerRunning, devMode, setDevMode, customBackgrounds, onAddCustomBackground, onDeleteCustomBackground }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => { if (isOpen) { setLocalSettings(settings); setErrors({}); } }, [isOpen]);

  const handleChange = (e, mode) => { const value = e.target.value; if (value === '' || /^\d+$/.test(value)) { setLocalSettings(prev => ({ ...prev, [mode]: value })); if (errors[mode]) { setErrors(prev => ({ ...prev, [mode]: null })); } } };

  const handleToggle = (key, value) => { setLocalSettings(prev => ({ ...prev, [key]: value })); }

  const validateSettings = () => { const newErrors = {}; let hasError = false; const finalSettings = {};['focus', 'shortBreak', 'longBreak', 'pomosBeforeLongBreak'].forEach(mode => { const val = localSettings[mode]; if (val === undefined || val === '' || parseInt(val) === 0) { newErrors[mode] = true; hasError = true; } else { finalSettings[mode] = parseInt(val); } }); finalSettings.autoStartBreaks = localSettings.autoStartBreaks; finalSettings.autoStartWork = localSettings.autoStartWork; finalSettings.background = localSettings.background; return { hasError, newErrors, finalSettings }; };

  const handleCloseAction = () => {
    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);
    if (hasChanges) {
      const { hasError, finalSettings } = validateSettings();
      if (!hasError) {
        onSave(finalSettings);
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file && (file.type === "image/jpeg" || file.type === "image/png")) { const reader = new FileReader(); reader.onloadend = () => { const base64String = reader.result; const newBg = { id: `custom-${Date.now()}`, src: base64String, }; onAddCustomBackground(newBg); handleToggle('background', base64String); if (onBackgroundChange) onBackgroundChange(base64String); }; reader.readAsDataURL(file); } };
  const allBackgrounds = [...BACKGROUND_OPTIONS, ...customBackgrounds];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }} // Fast fade for backdrop
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleCloseAction}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }} // Reduced motion distance
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            // PERFORMANCE FIX: Use standard easing instead of spring
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-[#111] border border-white/10 p-4 md:p-8 rounded-2xl md:rounded-3xl w-[95vw] md:w-full md:max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] md:max-h-[85vh] no-scrollbar mx-2 md:mx-0 will-change-transform" // Added will-change-transform
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 md:mb-8"><h3 className="text-xl md:text-2xl font-medium text-white tracking-tight">Settings</h3><button onClick={handleCloseAction} className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center p-2 text-white/50 hover:text-white active:text-white/70 rounded-full hover:bg-white/10 transition-colors"><X size={24} /></button></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6">
                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">Timer Configuration</h4>

                {/* Vertical List Layout for Timers */}
                {['focus', 'shortBreak', 'longBreak'].map((mode) => (
                  <React.Fragment key={mode}>
                    <div className="flex justify-between items-center group py-1">
                      <label className={`text-sm font-medium capitalize transition-colors flex-shrink-0 ${errors[mode] ? 'text-red-400' : 'text-white/80 group-hover:text-white'}`}>
                        {mode.replace(/([A-Z])/g, ' $1').trim()} (min)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={localSettings[mode]}
                        onChange={(e) => handleChange(e, mode)}
                        className={`
                          w-16 bg-white/5 hover:bg-white/10 rounded-lg py-2 text-center text-white 
                          font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/20 transition-all 
                          ${errors[mode] ? 'bg-red-500/10 ring-2 ring-red-500/50' : ''}
                        `}
                        placeholder={settings[mode]}
                      />
                    </div>
                    {/* Interval Setting appearing after Long Break */}
                    {mode === 'longBreak' && (
                      <div className="flex justify-between items-center group py-1">
                        <label className={`text-sm font-medium transition-colors flex-shrink-0 ${errors['pomosBeforeLongBreak'] ? 'text-red-400' : 'text-white/80 group-hover:text-white'}`}>
                          Intervals
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={localSettings.pomosBeforeLongBreak}
                          onChange={(e) => handleChange(e, 'pomosBeforeLongBreak')}
                          className={`
                            w-16 bg-white/5 hover:bg-white/10 rounded-lg py-2 text-center text-white 
                            font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/20 transition-all 
                            ${errors['pomosBeforeLongBreak'] ? 'bg-red-500/10 ring-2 ring-red-500/50' : ''}
                          `}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}

                <div className="w-full h-px bg-white/10 my-2"></div>

                {/* Switched back to standard Toggle with new styling */}
                <Toggle label="Auto-start Breaks" checked={!!localSettings.autoStartBreaks} onChange={(v) => handleToggle('autoStartBreaks', v)} />
                <Toggle label="Auto-start Work" checked={!!localSettings.autoStartWork} onChange={(v) => handleToggle('autoStartWork', v)} />

                {user && user.uid === 'cmxtLQPCqkfhkhNQZ04ZlXjCPbV2' && (
                  <>
                    <div className="w-full h-px bg-white/10 my-2"></div>
                    <Toggle label="Dev Mode (No Stats)" checked={devMode} onChange={setDevMode} />
                  </>
                )}
              </div>

              {/* Right Column: Backgrounds (Unchanged) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={16} className="text-white/50" />
                  <label className="text-xs uppercase tracking-widest text-white/40 font-bold">Environment</label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {allBackgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        handleToggle("background", bg.src);
                        if (onBackgroundChange) onBackgroundChange(bg.src);
                      }}
                      className={`relative aspect-video rounded-xl overflow-hidden transition-all duration-300 group ${localSettings.background === bg.src
                        ? "ring-2 ring-white scale-[1.02] shadow-xl z-10"
                        : "opacity-60 hover:opacity-100 hover:scale-[1.02] hover:z-10"
                        }`}
                    >
                      {bg.src ? (
                        isVideo(bg.src) ? (
                          <video src={bg.src} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                        ) : (
                          <img src={bg.src} alt={bg.label} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full bg-[#222] flex items-center justify-center border border-white/10">
                          <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Empty</span>
                        </div>
                      )}

                      {localSettings.background === bg.src && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="bg-white text-black rounded-full p-1 shadow-lg">
                            <Check size={12} strokeWidth={4} />
                          </div>
                        </div>
                      )}

                      {isVideo(bg.src) && (
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white/90 uppercase tracking-widest border border-white/10 z-10 pointer-events-none">
                          Animated
                        </div>
                      )}

                      {bg.id.toString().startsWith("custom-") && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteCustomBackground(bg.id); }}
                          className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-500 text-white/70 hover:text-white rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-20"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </button>
                  ))}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-video rounded-xl overflow-hidden border border-dashed border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-300 group flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus size={16} className="text-white/50 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-[10px] text-white/40 group-hover:text-white/80 uppercase tracking-widest font-bold">Upload</span>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleFileSelect} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, warning }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-medium text-white mb-2">{title}</h3><p className="text-white/70 text-sm mb-4 leading-relaxed">{message}</p>{warning && (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-200/80 mb-6 leading-relaxed">{warning}</div>)}
            <div className="flex gap-3"><button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-xl transition-colors">Cancel</button><button onClick={onConfirm} className="flex-1 bg-red-500/10 border border-red-500/50 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold py-3 rounded-xl transition-colors">Reset</button></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const KeyboardHelpModal = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: 'Space', description: 'Play / Pause timer' },
    { key: 'Tab', description: 'Cycle timer modes (when not started)' },
    { key: 'P', description: 'Toggle Music' }, // <--- Added this line
    { key: 'N', description: 'Open notes library' },
    { key: 'O', description: 'Edit objective/session name' },
    { key: 'S', description: 'Open / Close settings' },
    { key: 'Esc', description: 'Exit from input fields or close modals' },
    { key: 'Shift + ?', description: 'Toggle this help' },
  ];
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-medium text-white">Keyboard Shortcuts</h3><button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X size={20} /></button></div>
            <div className="space-y-3">{shortcuts.map((shortcut, index) => (<div key={index} className="flex justify-between items-center py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><span className="text-sm text-white/70">{shortcut.description}</span><kbd className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs font-mono text-white/90 tracking-wider">{shortcut.key}</kbd></div>))}</div>
            <button onClick={onClose} className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-xl transition-colors">Close</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};




const NotificationCenter = () => {
  const [activeUpdates, setActiveUpdates] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Filter updates that haven't been seen yet
    const unseen = UPDATES.filter(update => !localStorage.getItem(update.id));
    if (unseen.length > 0) {
      setActiveUpdates(unseen);
      // Small delay for smooth entrance after app load
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleDismiss = () => {
    if (activeUpdates.length === 0) return;

    const current = activeUpdates[0];
    // Mark as seen
    localStorage.setItem(current.id, 'true');

    // Animate out current card
    setIsVisible(false);

    // Wait for animation, then remove from queue and show next if available
    setTimeout(() => {
      setActiveUpdates(prev => prev.slice(1));
      if (activeUpdates.length > 1) {
        setIsVisible(true);
      }
    }, 400);
  };

  if (activeUpdates.length === 0) return null;

  const currentUpdate = activeUpdates[0];
  const Icon = currentUpdate.icon;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="notification-card"
          initial={{ opacity: 0, x: 20, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-8 right-8 z-40 w-[90vw] max-w-sm hidden md:block" // Hidden on mobile to avoid clutter, visible on desktop
        >
          <div className="bg-[#111] border border-white/10 p-5 rounded-2xl shadow-2xl backdrop-blur-xl relative overflow-hidden group">
            {/* Glossy Effect */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-start gap-4 relative z-10">
              {/* Icon Bubble */}
              <div className={`w-10 h-10 rounded-full ${currentUpdate.bg} flex items-center justify-center flex-shrink-0 border border-white/5`}>
                <Icon size={20} className={currentUpdate.color} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    {currentUpdate.title}
                  </h4>
                  <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                    {activeUpdates.length > 1 ? `1 / ${activeUpdates.length}` : 'NEW'}
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-3">
                  {currentUpdate.description}
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={handleDismiss}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {activeUpdates.length > 1 ? 'Next' : 'Got it'}
                    {activeUpdates.length > 1 && <ArrowRight size={10} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


const StickyNote = ({ text, onClick, className = "", style = {}, scale = 1 }) => (
  <motion.div
    layoutId={onClick ? "sticky-note-transition" : undefined}
    onClick={onClick}
    style={style}
    whileHover={onClick ? { scale: scale * 1.05, rotate: 0 } : {}}
    whileTap={onClick ? { scale: scale * 0.95 } : {}}
    className={`bg-[#ffeb3b] text-black p-4 shadow-xl cursor-pointer relative overflow-hidden flex flex-col ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />
    <div className="relative z-10 flex-1 overflow-hidden text-left">
      {text ? (
        // USE NEW RENDERER HERE
        <RichTextRenderer text={text} className="text-sm md:text-base opacity-90" />
      ) : (
        <div className="w-full h-full flex items-center justify-center opacity-30">
          <span className="text-4xl font-light">+</span>
        </div>
      )}
    </div>
  </motion.div>
);
// Add these colors at the top of your file or inside App
const NOTE_COLORS = [
  '#ffeb3b', // Classic Yellow
  '#ffcc80', // Orange
  '#ccff90', // Green
  '#a7ffeb', // Teal
  '#f8bbd0', // Pink
  '#d1c4e9', // Purple
];


const StickyNoteWidget = ({ notes, onOpenLibrary, isLibraryOpen, onSave }) => {
  const hasNotes = notes.length > 0;
  const showStack = notes.length > 1;
  const topNote = notes[0];
  const secondNote = notes[1];

  // Helper to toggle checkboxes on the dashboard widget
  const handleToggleLine = (index, newStatus) => {
    if (!onSave || !topNote) return;
    const lines = topNote.text.split('\n');
    if (lines[index]) {
      const line = lines[index];
      // Toggle [ ] <-> [x]
      const newLine = newStatus
        ? line.replace(/^(\s*)\[ \]/, '$1[x]')
        : line.replace(/^(\s*)\[x\]/i, '$1[ ]');

      lines[index] = newLine;
      onSave({ ...topNote, text: lines.join('\n'), updatedAt: Date.now() });
    }
  };

  if (isLibraryOpen) {
    return <div className="relative w-40 h-80 md:w-48 md:h-48" />;
  }

  if (!hasNotes) {
    return (
      <button onClick={onOpenLibrary} className="w-32 h-32 md:w-48 md:h-48 border-2 border-dashed border-white/50 bg-white/5 rounded-xl flex items-center justify-center group hover:border-white hover:bg-white/10 transition-all duration-300 relative">
        <div className="text-center">
          <Plus size={24} className="text-white/60 group-hover:text-white mx-auto mb-2 transition-colors" />
          <span className="text-xs uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">Add Note</span>
        </div>
      </button>
    );
  }

  return (
    <div className="relative w-32 h-32 md:w-48 md:h-48 cursor-pointer group" onClick={onOpenLibrary}>
      {showStack && (
        <div
          className="absolute inset-0 shadow-lg transform rotate-6 translate-x-2 translate-y-2 group-hover:rotate-12 group-hover:translate-x-4 transition-transform duration-300 origin-bottom-right"
          style={{ backgroundColor: secondNote.color || '#ffeb3b', zIndex: 0 }}
        >
          <div className="absolute inset-0 bg-black/10" />
        </div>
      )}

      <div
        className="absolute inset-0 shadow-2xl p-4 flex flex-col z-10 transition-all duration-300 group-hover:-translate-y-1 group-hover:-rotate-2"
        style={{ backgroundColor: topNote.color || '#ffeb3b' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {topNote.title && (
            <h4 className="text-black font-bold text-sm mb-1 line-clamp-1 flex-shrink-0">{topNote.title}</h4>
          )}

          <div className="flex-1 overflow-hidden relative">
            {/* Use the Renderer so bold/checkboxes show up */}
            <RichTextRenderer
              text={topNote.text}
              className="text-xs md:text-sm"
              // Enable toggling if onSave is passed
              onToggle={onSave ? handleToggleLine : undefined}
            />

            {/* Fade out effect at bottom for overflow text */}
            <div
              className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${topNote.color || '#ffeb3b'}, transparent)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- RICH TEXT & TAGGING HELPERS ---

// --- RICH TEXT & TAGGING HELPERS ---

const parseRichText = (text, onToggleLine) => {
  if (!text) return [];
  return text.split('\n').map((line, index) => {
    // Checkboxes: "[ ] " or "[x] "
    const checkboxMatch = line.match(/^(\s*)\[([ x])\] (.*)/);
    if (checkboxMatch) {
      const indent = checkboxMatch[1];
      const isChecked = checkboxMatch[2].toLowerCase() === 'x';
      const content = checkboxMatch[3];
      return (
        <div key={index} className="flex items-start gap-2 my-1 group">
          <button
            type="button"
            // FIX: Stop pointer events from bubbling to Framer Motion's onTap
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (onToggleLine) {
                e.stopPropagation();
                onToggleLine(index, !isChecked);
              }
            }}
            className={`
              mt-1 w-3 h-3 border border-black/40 rounded-[3px] flex items-center justify-center transition-colors flex-shrink-0
              ${isChecked ? 'bg-black/60 border-transparent' : 'bg-transparent'}
              ${onToggleLine ? 'cursor-pointer hover:border-black' : ''}
            `}
          >
            {isChecked && <Check size={8} className="text-white" />}
          </button>
          <span className={`flex-1 leading-relaxed ${isChecked ? 'line-through opacity-50' : ''} whitespace-pre-wrap`}>
            {indent}{parseInlineStyles(content)}
          </span>
        </div>
      );
    }

    // Bullet Lists: "- "
    const bulletMatch = line.match(/^(\s*)-\s(.*)/);
    if (bulletMatch) {
      const indent = bulletMatch[1];
      const content = bulletMatch[2];
      return (
        <div key={index} className="flex items-start gap-2 my-1 pl-2">
          <div className="mt-2 w-1.5 h-1.5 bg-black/60 rounded-full flex-shrink-0" />
          <span className="flex-1 leading-relaxed whitespace-pre-wrap">{indent}{parseInlineStyles(content)}</span>
        </div>
      );
    }

    // Standard Paragraph
    return (
      <div key={index} className={`min-h-[1.2em] my-0.5 ${line.trim() === '' ? 'h-2' : ''} whitespace-pre-wrap`}>
        {parseInlineStyles(line)}
      </div>
    );
  });
};

const parseInlineStyles = (text) => {
  // Simple parser for **bold** and *italic*
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

// Now accepts onToggle to handle checkbox clicks
// Updated RichTextRenderer: Added 'font-normal' to force regular weight
const RichTextRenderer = ({ text, className = "", onToggle }) => (
  <div className={`font-sans font-normal text-black/90 ${className}`}>
    {parseRichText(text, onToggle)}
  </div>
);

// ... TagPill component remains the same ...
const TagPill = ({ label, active, onClick, onDelete }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border
      ${active
        ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
        : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/10'
      }
    `}
  >
    {label}
    {onDelete && (
      <div
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className={`p-0.5 rounded-full hover:bg-black/10 ${active ? 'text-black/50 hover:text-black' : 'text-white/50 hover:text-white'}`}
      >
        <X size={10} />
      </div>
    )}
  </button>
);
const LiquidDeleteBtn = ({ onDelete }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'confirming'
  const containerRef = useRef(null);

  // Close confirmation if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setStatus('idle');
      }
    };
    if (status === 'confirming') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [status]);

  const handleInitialClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('confirming');
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
    setStatus('idle');
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('idle');
  };

  return (
    <motion.div
      ref={containerRef}
      layout
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      initial={false}
      // --- CHANGED VALUES HERE ---
      animate={status === 'confirming'
        ? { width: 140, height: 40, borderRadius: 25, backgroundColor: "rgba(220, 38, 38, 0.15)" } // Larger Width/Height
        : { width: 30, height: 30, borderRadius: 50, backgroundColor: "rgba(0, 0, 0, 0.1)" } // Slightly larger start button too
      }
      // ---------------------------
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      // Removed 'h-7' class so Framer controls the height entirely
      className={`absolute top-2 right-2 backdrop-blur-md border border-white/10 flex items-center justify-center overflow-hidden z-50 cursor-default shadow-lg`}
    >
      <AnimatePresence mode="popLayout">
        {status === 'idle' ? (
          <motion.button
            key="trash-icon"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            onClick={handleInitialClick}
            className="w-full h-full flex items-center justify-center text-black/40 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 size={16} /> {/* Increased Icon Size */}
          </motion.button>
        ) : (
          <motion.div
            key="confirm-actions"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center gap-2 px-1 w-full justify-evenly" // Increased gap and spacing
          >
            <button
              onClick={handleConfirm}
              // Made buttons slightly larger
              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-transform cursor-pointer shadow-sm"
              title="Confirm Delete"
            >
              <Check size={16} strokeWidth={3} />
            </button>
            <span className="text-xs font-bold text-red-600 select-none">Delete?</span>
            <button
              onClick={handleCancel}
              className="w-7 h-7 rounded-full bg-black/10 text-black/50 flex items-center justify-center hover:bg-black/20 hover:text-black transition-colors cursor-pointer"
              title="Cancel"
            >
              <X size={14} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};



const LiquidResetBtn = ({ onReset, disabled }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'confirming'
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);

  // 1. Detect Screen Size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Check on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-reset logic
  useEffect(() => {
    let timer;
    if (status === 'confirming') {
      timer = setTimeout(() => setStatus('idle'), 3000);
    }
    return () => clearTimeout(timer);
  }, [status]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setStatus('idle');
      }
    };
    if (status === 'confirming') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [status]);

  if (disabled) {
    return (
      <div className="relative w-12 h-12 flex-shrink-0 z-30 opacity-20 grayscale cursor-not-allowed">
        <div className="absolute top-0 left-0 w-12 h-12 border border-white/30 rounded-full flex items-center justify-center">
          <RotateCcw size={22} />
        </div>
      </div>
    );
  }

  return (
    // Static Anchor
    <div className="relative w-12 h-12 flex-shrink-0 z-50">
      <motion.div
        ref={containerRef}
        layout
        initial={false}
        // Anchor to Top-Left (0,0) so it expands Right (desktop) or Down (mobile)
        style={{ transformOrigin: "0% 0%" }}
        className="absolute top-0 left-0 border flex items-center justify-center overflow-hidden cursor-pointer shadow-lg bg-[#111]"
        animate={status === 'confirming'
          ? {
            // 2. Conditional Dimensions based on isMobile
            width: isMobile ? 48 : 180,
            height: isMobile ? 150 : 48,
            borderRadius: 24,
            backgroundColor: "rgba(220, 38, 38, 0.15)",
            borderColor: "rgba(220, 38, 38, 0.5)"
          }
          : {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "transparent",
            borderColor: "rgba(255, 255, 255, 0.3)"
          }
        }
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {status === 'idle' ? (
            <motion.button
              key="reset-icon"
              layout="position"
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => { e.stopPropagation(); setStatus('confirming'); }}
              className="absolute inset-0 w-full h-full flex items-center justify-center text-white/80 hover:text-white"
            >
              <RotateCcw size={22} />
            </motion.button>
          ) : (
            <motion.div
              key="confirm-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              // 3. Flex Direction: Column on Mobile, Row on Desktop
              className={`flex items-center justify-between w-full h-full ${isMobile ? 'flex-col py-2' : 'flex-row px-2 pr-3'}`}
            >
              {/* Cancel Button (Top/Left) - Stays in original position */}
              <button
                onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}
                className="w-8 h-8 rounded-full bg-white/10 text-white/50 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all flex-shrink-0 z-20"
                title="Cancel"
              >
                <X size={16} strokeWidth={3} />
              </button>

              {/* Text Label */}
              <span
                className={`text-sm font-bold text-red-200 select-none whitespace-nowrap tracking-wide 
                  ${isMobile ? 'vertical-text py-2 rotate-180' : 'mx-2'} 
                `}
                style={isMobile ? { writingMode: 'vertical-rl' } : {}}
              >
                Reset?
              </span>

              {/* Confirm Button (Bottom/Right) */}
              <button
                onClick={(e) => { e.stopPropagation(); onReset(); setStatus('idle'); }}
                className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 hover:scale-110 transition-all shadow-md flex-shrink-0 z-20"
                title="Confirm"
              >
                <Check size={18} strokeWidth={3} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const LiquidStrictBtn = ({
  isStrict,
  onEnable,
  onDisable,
  isLocked,
  onMouseEnter,
  isExtensionConnected,
  mode,
  onMenuChange
}) => {
  const [status, setStatus] = useState('idle');
  const containerRef = useRef(null);
  const isMenuOpen = status === 'confirming';
  const browserType = useRef(getBrowserType()).current;

  const isMissing = !isExtensionConnected;
  const isBreak = mode !== 'focus';
  const showAllowed = isStrict && isBreak;

  useEffect(() => {
    if (onMenuChange) {
      onMenuChange(isMenuOpen);
    }
  }, [isMenuOpen, onMenuChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setStatus('idle');
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // --- STYLE LOGIC UPDATED ---
  // Default: Apply the white hover effect
  let btnBg = "hover:bg-white/10";
  // FIX: Changed to direct 'hover:text-white' for consistent brightness
  let btnText = "text-white/70 hover:text-white";
  let iconColor = "text-white/70 group-hover:text-white transition-colors"; // Explicit icon transition

  if (isMissing) {
    // Red Warning Style
    btnBg = "bg-red-500/10 border border-red-500/20 animate-pulse cursor-pointer hover:bg-red-500/20";
    btnText = "text-red-400 font-bold";
    iconColor = "text-red-400";
  } else if (showAllowed) {
    // Green Allowed Style
    btnBg = "bg-green-500/10 border border-green-500/20 hover:bg-green-500/20";
    btnText = "text-green-400";
    iconColor = "text-green-400";
  } else if (isStrict) {
    // Strict Active Style (Solid White)
    btnText = "text-white";
    iconColor = "text-white";
  }

  const shouldExpand = isMenuOpen || (isStrict && !isMissing);

  return (
    <div ref={containerRef} className="relative flex items-center">
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
            className="absolute bottom-full left-1/2 mb-4 w-80 bg-[#111]/95 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl flex flex-col gap-3 z-[60] origin-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${isMissing ? 'bg-red-500/10 text-red-400' : (isStrict ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400')}`}>
                {isMissing ? <Lock size={18} /> : (isStrict ? <Unlock size={18} /> : <Lock size={18} />)}
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-white">
                  {isMissing ? "Strict Mode" : (isStrict ? "Disable Strict Mode?" : "Enable Strict Mode?")}
                </span>
              </div>
            </div>

            {/* CONTENT */}
            {isMissing ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-white/70 leading-relaxed">
                  Strict Mode requires our free companion extension to block websites.
                </p>
                {browserType === 'webkit' ? (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                    <p className="text-xs text-white/50">Safari/WebKit is not currently supported.</p>
                  </div>
                ) : (
                  <>
                    <a
                      href={browserType === 'firefox' ? "https://addons.mozilla.org/firefox/downloads/file/4633776/079d159c8a564ccb9d72-1.0.0.xpi" : "https://www.dropbox.com/scl/fi/mvitnd6gv7zvxmwxxwe7w/altimer-companion-chromium.zip?rlkey=utl46iuck2qwof84d52pw6tvk&st=cvl1ifog&dl=1"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
                    >
                      <Download size={14} />
                      {browserType === 'firefox' ? "Add to Firefox" : "Download Extension"}
                    </a>
                  </>
                )}
                <button onClick={() => setStatus('idle')} className="w-full py-2 text-xs text-white/30 hover:text-white transition-colors">Close</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/70 leading-relaxed">
                  {isStrict
                    ? "This will permanently unblock sites for this session."
                    : "This will block distractions during Focus, but allow them during Breaks."}
                </p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setStatus('idle')} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 transition-colors uppercase tracking-wide">Cancel</button>
                  <button onClick={(e) => { e.stopPropagation(); isStrict ? onDisable() : onEnable(); setStatus('idle'); }} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-black transition-colors shadow-lg uppercase tracking-wide bg-white hover:bg-gray-200">
                    {isStrict ? "Turn Off" : "Enable"}
                  </button>
                </div>
              </>
            )}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111]/95 border-r border-b border-white/20 rotate-45 backdrop-blur-xl"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        layout
        onMouseEnter={onMouseEnter}
        onClick={(e) => {
          e.stopPropagation();
          if (!isMissing && isLocked && !isBreak) return;
          setStatus(prev => prev === 'idle' ? 'confirming' : 'idle');
        }}
        className={`relative p-2 rounded-full transition-all group flex items-center ${btnBg} ${btnText} ${isMenuOpen ? 'bg-white/10' : ''}`}
      >
        {isMissing
          ? <Lock size={20} className={iconColor} />
          : (showAllowed
            ? <Unlock size={20} className={iconColor} />
            : (isStrict ? <Lock size={20} className={iconColor} /> : <Unlock size={20} className={iconColor} />)
          )
        }

        <motion.span
          layout
          className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] 
            ${shouldExpand
              ? 'max-w-[150px] opacity-100 ml-2'
              : 'max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-2'
            }
          `}
        >
          {isMissing
            ? "Connect Extension"
            : (showAllowed ? "Websites Allowed" : (isStrict ? (isLocked ? 'Locked' : 'Strict On') : 'Strict Mode'))
          }
        </motion.span>
      </motion.button>
    </div>
  );
};


// --- APPLE-STYLE TOGGLE (No Text, Click-to-Flip) ---
const SegmentedToggle = ({ label, checked, onChange, id }) => (
  <div className="flex justify-between items-center w-full group py-2">
    <span className="text-sm text-white/70 group-hover:text-white transition-colors font-medium">{label}</span>

    <div className="flex bg-white/5 p-1 rounded-full w-14 h-8 relative flex-shrink-0">
      {[false, true].map((val) => {
        const isActive = checked === val;
        return (
          <button
            key={String(val)}
            // FIX: Always flip state, regardless of which side is clicked
            onClick={() => onChange(!checked)}
            className="relative flex-1 h-full rounded-full z-0 flex items-center justify-center outline-none"
          >
            {isActive && (
              <motion.div
                layoutId={`pill-${id}`}
                className={`absolute inset-0 rounded-full shadow-sm ${val ? 'bg-[#4ade80]' : 'bg-white/20'
                  }`}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  </div>
);

const PersonalityCard = ({ p, activeId, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = activeId === p.id;
  const isElon = p.id === 'elon';

  // Dynamic Styles
  const borderColor = isActive
    ? (isElon ? 'border-purple-500' : 'border-white')
    : (isHovered ? 'border-white/40' : 'border-white/10');

  const containerBg = p.isEmpty
    ? 'bg-white/5 border-dashed border-white/10' // Empty/Locked Look
    : (isActive ? 'bg-[#111]' : 'bg-[#0a0a0a]'); // Normal Look

  return (
    <motion.div
      onClick={p.isEmpty ? null : onClick} // Disable click if empty placeholder
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={!p.isEmpty ? { y: -8, scale: 1.02 } : {}}
      whileTap={!p.isEmpty ? { scale: 0.98 } : {}}
      className={`
        relative w-full aspect-[9/16] md:aspect-[3/4] rounded-[32px]
        border ${borderColor} ${containerBg} backdrop-blur-xl
        flex flex-col overflow-hidden cursor-pointer shadow-2xl
        transition-colors duration-300 group
      `}
    >
      {/* 1. TOP BANNER IMAGE */}
      <div className={`relative h-[45%] w-full overflow-hidden ${p.isEmpty ? 'opacity-30 grayscale' : ''}`}>
        {/* Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-b ${p.bannerGradient}`} />

        {/* Big Icon / Visual in Banner */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity duration-500 transform group-hover:scale-110">
          <p.icon size={80} strokeWidth={1} />
        </div>

        {/* Status Badge (Top Right) */}
        <div className="absolute top-4 right-4">
          {isActive && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg ${isElon ? 'bg-purple-500 text-white' : 'bg-white text-black'}`}>
              <CheckCircle2 size={12} strokeWidth={3} />
              <span>Active</span>
            </div>
          )}
          {p.isLocked && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-white/60 text-[10px] font-bold uppercase tracking-wider">
              <Lock size={12} />
              <span>Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. TEXT CONTENT (Bottom) */}
      <div className={`relative flex-1 p-6 md:p-8 flex flex-col ${p.isEmpty ? 'opacity-50' : ''}`}>

        {/* Title */}
        <h3 className={`text-2xl md:text-3xl font-serif-display mb-3 ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'} transition-colors`}>
          {p.title}
        </h3>

        {/* Description / Consequences */}
        <div className="flex-1">
          <p className="text-xs md:text-sm leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">
            {p.description}
          </p>
        </div>

        {/* Footer Info (Consequences Tags) */}
        {!p.isEmpty && (
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
            {p.tags.map((tag, i) => (
              <span key={i} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${tag.warn ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Mouse Glow (Subtle) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
};

const PersonalitiesCenter = ({ mode, isPro, onOpenPro, activePersonality, onSelectPersonality }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Logic: Show this ONLY in Focus mode
  if (mode !== 'focus') return null;

  const personalities = [
    {
      id: 'default',
      title: 'The Stoic',
      description: 'The standard experience. You control the flow. Pause when you need to, break when you want to.',
      icon: Brain,
      bannerGradient: 'from-gray-700 to-black',
      tags: [{ label: 'Flexible', warn: false }, { label: 'Manual Control', warn: false }],
      isLocked: false,
      isEmpty: false
    },
    {
      id: 'elon',
      title: 'Elon Musk',
      description: 'Strict Mode forced ON. If you pause, you lose progress. Breaks are randomly skipped. High intensity only.',
      icon: Zap,
      // Updated to a deep, rich violet-to-black fade
      bannerGradient: 'from-[#2e1065] to-black',
      tags: [{ label: 'Strict Mode', warn: true }, { label: 'Skips Breaks', warn: true }],
      isLocked: false,
      isEmpty: false
    },
    {
      id: 'mom',
      title: 'Your Mom',
      description: 'Coming Soon.',
      icon: Waves,
      bannerGradient: 'from-emerald-800 to-black',
      tags: [],
      isLocked: true,
      isEmpty: true // Renders as placeholder
    }
  ];

  const handleSelect = (p) => {
    if (p.isEmpty) return; // Do nothing for empty card

    if (p.isLocked) {
      onOpenPro();
      return;
    }

    onSelectPersonality(p.id);
    setTimeout(() => setIsOpen(false), 150);
  };

  const activePersonaObj = personalities.find(p => p.id === activePersonality) || personalities[0];
  const isElonActive = activePersonality === 'elon';
  const buttonLabel = activePersonality === 'default' ? 'Personalities' : activePersonaObj.title;

  return (
    <>
      {/* --- TRIGGER BUTTON --- */}
      <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isOpen && (
            <motion.div
              key="persona-pill"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <motion.button
                layoutId="personalities-pill"
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative group flex items-center gap-3 px-6 py-3 rounded-full 
                  shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-500 border
                  ${isElonActive
                    ? 'bg-black border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                    : 'bg-[#111]/80 border-white/10 hover:border-white/30'
                  }
                `}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${isElonActive ? 'from-purple-500/20 to-transparent' : 'from-white/10 to-transparent'}`} />
                <Brain size={18} className={`relative z-10 shrink-0 transition-colors ${isElonActive ? 'text-purple-400' : 'text-white/60 group-hover:text-white'}`} />
                <span className={`text-xs font-bold relative z-10 tracking-widest uppercase transition-colors whitespace-nowrap ${isElonActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                  {buttonLabel}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODAL (PORTAL) --- */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">

              {/* BACKDROP */}
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.5 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-black/70 z-0"
              />

              {/* CONTENT WRAPPER */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="relative z-10 w-full max-w-6xl h-full flex flex-col p-6 md:p-12 pointer-events-none"
              >

                {/* Header */}
                <div className="flex justify-between items-start mb-10 pointer-events-auto">
                  <div className="flex flex-col gap-2">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-5xl md:text-7xl font-serif-display text-white tracking-tight"
                    >
                      Pick your <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Poison.</span>
                    </motion.h2>
                  </div>
                  <CloseButton onClick={() => setIsOpen(false)} />
                </div>

                {/* Cards Grid - INCREASED PADDING TO FIX CLIPPING */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pointer-events-auto overflow-y-auto custom-scrollbar pb-32 pt-4 px-4">
                  {personalities.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + (i * 0.1), duration: 0.5, ease: "easeOut" }}
                      className="h-full"
                    >
                      <PersonalityCard
                        p={p}
                        activeId={activePersonality}
                        onClick={() => handleSelect(p)}
                      />
                    </motion.div>
                  ))}
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

const ExtraTimePopup = ({ minutes, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-black/80 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
          <Zap size={20} fill="black" />
        </div>
        <div>
          <h4 className="text-white font-bold text-sm">Break Skipped</h4>
          <p className="text-white/60 text-xs">Elon mode engaged. +{minutes}m potential focus.</p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const NoteSystemModals = ({
  notes,
  isLibraryOpen,
  closeLibrary,
  editingNote,
  setEditingNote,
  onSave,
  onDelete,
  onReorder,
  onSaveOrder,
  isPro,
  onOpenPro
}) => {
  // --- STATE ---
  const [editorTitle, setEditorTitle] = useState("");
  const [editorText, setEditorText] = useState("");
  const [editorColor, setEditorColor] = useState(NOTE_COLORS[0]);
  const [editorTags, setEditorTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(-1);

  const [selectedTag, setSelectedTag] = useState("All");
  const [draggingId, setDraggingId] = useState(null);


  // --- REFS ---
  const draggingIdRef = useRef(null);
  const containerRef = useRef(null);
  const lastSwapTime = useRef(0);
  const bodyInputRef = useRef(null);
  const tagInputRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // Limit Check Logic
  const isLimitReached = !isPro && notes.length >= 3;

  // --- HANDLERS ---
  const handleSave = () => {
    if (!editorText.trim() && !editorTitle.trim()) {
      if (editingNote && editingNote.id) onDelete(editingNote.id);
    } else {
      onSave({
        id: editingNote?.id || Date.now().toString(),
        title: editorTitle,
        text: editorText,
        color: editorColor,
        tags: editorTags,
        updatedAt: Date.now()
      });
    }
    setEditingNote(null);
    setShowSlashMenu(false);
  };

  const handleToggleLine = (note, index, newStatus) => {
    let lines = note.text.split('\n');
    if (lines[index]) {
      const line = lines[index];
      const newLine = newStatus
        ? line.replace(/^(\s*)\[ \]/, '$1[x]')
        : line.replace(/^(\s*)\[x\]/i, '$1[ ]');

      lines[index] = newLine;

      // Auto-sort logic
      if (/^(\s*)\[([ x])\]/i.test(newLine)) {
        let start = index;
        while (start > 0 && /^(\s*)\[([ x])\]/i.test(lines[start - 1])) start--;

        let end = index;
        while (end < lines.length - 1 && /^(\s*)\[([ x])\]/i.test(lines[end + 1])) end++;

        const group = lines.slice(start, end + 1);
        const isChecked = (l) => /^(\s*)\[x\]/i.test(l);

        group.sort((a, b) => {
          const aChecked = isChecked(a);
          const bChecked = isChecked(b);
          if (aChecked === bChecked) return 0;
          return aChecked ? 1 : -1;
        });

        lines.splice(start, group.length, ...group);
      }

      onSave({ ...note, text: lines.join('\n'), updatedAt: Date.now() });
    }
  };

  // --- SHORTCUTS ---
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showSlashMenu) { e.preventDefault(); e.stopImmediatePropagation(); setShowSlashMenu(false); return; }
        if (editingNote) {
          e.preventDefault(); e.stopImmediatePropagation();
          if (editorTitle.trim() || editorText.trim()) handleSave();
          else setEditingNote(null);
          return;
        }
        if (isLibraryOpen) { e.preventDefault(); e.stopImmediatePropagation(); closeLibrary(); }
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [editingNote, isLibraryOpen, editorTitle, editorText, editorColor, editorTags, showSlashMenu]);

  // --- SYNC EDITOR STATE ---
  useEffect(() => {
    if (editingNote) {
      setEditorTitle(editingNote.title || "");
      setEditorText(editingNote.text || "");
      setEditorColor(editingNote.color || NOTE_COLORS[0]);
      setEditorTags(editingNote.tags || []);
    } else {
      setEditorTitle("");
      setEditorText("");
      setEditorColor(NOTE_COLORS[0]);
      setEditorTags([]);
    }
  }, [editingNote]);

  const handleGlowMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const allExistingTags = [...new Set(notes.flatMap(n => n.tags || []))];
  const allTags = ["All", ...allExistingTags];
  const tagSuggestions = tagInput.trim()
    ? allExistingTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !editorTags.includes(t))
    : [];

  useEffect(() => { setActiveSuggestionIndex(0); }, [tagInput]);

  const handleAddTag = (tag) => {
    const cleanTag = tag.trim();
    if (cleanTag && !editorTags.includes(cleanTag)) { setEditorTags([...editorTags, cleanTag]); }
    setTagInput("");
  };

  const removeTag = (tagToRemove) => { setEditorTags(editorTags.filter(t => t !== tagToRemove)); };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) { if (tagInput.trim()) handleAddTag(tagInput.trim()); return; }
      if (tagSuggestions.length > 0 && activeSuggestionIndex >= 0) { handleAddTag(tagSuggestions[activeSuggestionIndex]); return; }
      if (tagInput.trim()) { handleAddTag(tagInput.trim()); } else { bodyInputRef.current?.focus(); }
    }
    if (e.key === 'Backspace' && tagInput === '') {
      if (editorTags.length > 0) { e.preventDefault(); const newTags = [...editorTags]; newTags.pop(); setEditorTags(newTags); }
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestionIndex(prev => Math.min(prev + 1, tagSuggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestionIndex(prev => Math.max(prev - 1, 0)); }
  };

  const handleTitleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); tagInputRef.current?.focus(); } };

  const insertMarkdown = (syntax) => {
    const textarea = bodyInputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const value = textarea.value;
    const previousLineBreak = value.lastIndexOf('\n', start - 1);
    const lineStart = previousLineBreak + 1;
    let insertion = "";
    if (syntax === 'list') insertion = "- ";
    if (syntax === 'task') insertion = "[ ] ";
    if (syntax === 'bold' || syntax === 'italic') {
      const marker = syntax === 'bold' ? '**' : '*';
      const end = textarea.selectionEnd;
      const selection = value.substring(start, end);
      const newText = value.substring(0, start) + marker + selection + marker + value.substring(end);
      setEditorText(newText);
      setTimeout(() => {
        textarea.focus();
        const offset = selection ? start + marker.length + selection.length + marker.length : start + marker.length;
        textarea.setSelectionRange(offset, offset);
      }, 0);
      return;
    }
    const newText = value.substring(0, lineStart) + insertion + value.substring(lineStart);
    setEditorText(newText);
    setTimeout(() => { textarea.focus(); const newPos = (start < lineStart) ? start : start + insertion.length; textarea.setSelectionRange(newPos, newPos); }, 0);
  };

  const SLASH_COMMANDS = [
    { id: 'task', label: 'Task List', icon: CheckSquare, action: 'task' },
    { id: 'list', label: 'Bullet List', icon: List, action: 'list' },
    { id: 'bold', label: 'Bold', icon: Bold, action: 'bold' },
    { id: 'italic', label: 'Italic', icon: Italic, action: 'italic' },
  ];
  const filteredCommands = SLASH_COMMANDS.filter(c => c.id.includes(slashQuery.toLowerCase()) || c.label.toLowerCase().includes(slashQuery.toLowerCase()));

  const executeSlashCommand = (command) => {
    const textarea = bodyInputRef.current;
    if (!textarea) return;
    const value = textarea.value;
    const beforeSlash = value.substring(0, slashIndex);
    const afterCursor = value.substring(textarea.selectionStart);
    setEditorText(beforeSlash + afterCursor);
    setShowSlashMenu(false);
    setSlashQuery("");
    setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = slashIndex; insertMarkdown(command.action); }, 0);
  };

  const handleBodyChange = (e) => {
    const newValue = e.target.value;
    setEditorText(newValue);
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastSlash = textBeforeCursor.lastIndexOf('/');
    if (lastSlash !== -1) {
      const charBeforeSlash = lastSlash > 0 ? textBeforeCursor[lastSlash - 1] : '\n';
      if (charBeforeSlash === ' ' || charBeforeSlash === '\n' || lastSlash === 0) {
        const query = textBeforeCursor.substring(lastSlash + 1);
        if (!query.includes(' ') && !query.includes('\n')) {
          setShowSlashMenu(true);
          setSlashIndex(lastSlash);
          setSlashQuery(query);
          return;
        }
      }
    }
    setShowSlashMenu(false);
  };

  const handleBodyKeyDown = (e) => {
    if (showSlashMenu) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands.length > 0) executeSlashCommand(filteredCommands[0]);
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowSlashMenu(false); return; }
    }
    if (e.key === 'Enter') {
      const textarea = bodyInputRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const value = textarea.value;
      const previousLineBreak = value.lastIndexOf('\n', start - 1);
      const currentLineStart = previousLineBreak + 1;
      const currentLine = value.substring(currentLineStart, start);
      const listMatch = currentLine.match(/^(\s*)(-|\[([ x])\])\s/);
      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1];
        const marker = listMatch[2];
        if (currentLine.trim() === marker || currentLine.trim() === marker + ']') {
          const newValue = value.substring(0, currentLineStart) + value.substring(start);
          setEditorText(newValue);
          setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = currentLineStart; }, 0);
          return;
        }
        const nextMarker = marker.startsWith('[') ? '[ ]' : '-';
        const insertion = `\n${indent}${nextMarker} `;
        const newValue = value.substring(0, start) + insertion + value.substring(start);
        setEditorText(newValue);
        setTimeout(() => {
          const newCursorPos = start + insertion.length;
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
      }
    }
  };

  // --- DRAG & LOGIC ---
  const handleDragStart = (id, e) => {
    isDraggingRef.current = true;
    setDraggingId(id);
    draggingIdRef.current = id;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!draggingIdRef.current || !containerRef.current) return;
    if (Date.now() - lastSwapTime.current < 250) return;
    const noteElements = Array.from(containerRef.current.querySelectorAll('[data-note-id]'));
    let targetId = null;
    for (let el of noteElements) {
      const id = el.getAttribute('data-note-id');
      if (id === draggingIdRef.current) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        targetId = id; break;
      }
    }
    if (targetId) {
      const fromIndex = notes.findIndex(n => n.id === draggingIdRef.current);
      const toIndex = notes.findIndex(n => n.id === targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const newOrder = [...notes];
        const temp = newOrder[fromIndex];
        newOrder[fromIndex] = newOrder[toIndex];
        newOrder[toIndex] = temp;
        onReorder(newOrder);
        lastSwapTime.current = Date.now();
      }
    }
  };

  const handleDragEnd = () => {
    setTimeout(() => { isDraggingRef.current = false; }, 50);
    setDraggingId(null);
    draggingIdRef.current = null;
    if (onSaveOrder) onSaveOrder();
  };

  useEffect(() => {
    const handleGlobalUp = () => { if (draggingIdRef.current) handleDragEnd(); };
    window.addEventListener('pointerup', handleGlobalUp);
    if (draggingId) window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [draggingId, notes]);

  const handleNoteTap = (e, note) => {
    setEditingNote(note);
  };

  const filteredNotes = selectedTag === "All" ? notes : notes.filter(n => n.tags && n.tags.includes(selectedTag));

  return (
    <AnimatePresence>
      {/* LIBRARY MODAL */}
      {isLibraryOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(16px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black/40"
          onClick={closeLibrary}
        >
          <div className="w-full flex flex-col items-center pt-12 md:pt-16 pb-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl md:text-4xl text-white font-serif-display tracking-wide mb-6">Notes</h2>
            <div className="flex gap-2 overflow-x-auto max-w-full px-6 no-scrollbar mask-gradient">
              {allTags.map(tag => (
                <TagPill key={tag} label={tag} active={selectedTag === tag} onClick={() => setSelectedTag(tag)} />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-20">
            <div className="max-w-5xl mx-auto" ref={containerRef}>
              <div className="flex flex-wrap gap-6">

                {/* ADD BUTTON or LOCKED BUTTON */}
                {isLimitReached ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square bg-white/5 border-2 border-dashed border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-colors rounded-sm flex items-center justify-center group cursor-pointer w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPro();
                    }}
                  >
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <Lock size={32} className="text-white/30 group-hover:text-yellow-400 transition-colors" />
                      <span className="text-xs uppercase tracking-widest text-white/30 group-hover:text-yellow-400 transition-colors font-medium">Unlock</span>
                      {/* COUNT FOR LOCKED STATE */}
                      <span className="text-[10px] font-mono text-white/30 font-medium">3 / 3</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onMouseMove={handleGlowMove}
                    className="relative aspect-square bg-white/5 border-2 border-dashed border-white/20 hover:border-white/50 transition-colors rounded-sm flex items-center justify-center group cursor-pointer w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      const initialTags = selectedTag !== "All" ? [selectedTag] : [];
                      setEditingNote({ tags: initialTags });
                    }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.1), transparent 40%)' }} />
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <Plus size={32} className="text-white/30 group-hover:text-white transition-colors" />
                      <span className="text-xs uppercase tracking-widest text-white/30 group-hover:text-white transition-colors font-medium">Create New</span>
                      {/* COUNT FOR ACTIVE STATE (FREE USERS) */}
                      {!isPro && (
                        <span className="text-[10px] font-mono text-white/30 font-medium mt-1">
                          {notes.length} / 3
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* NOTES GRID */}
                <AnimatePresence>
                  {filteredNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      layoutId={note.id}
                      layout="position"
                      data-note-id={note.id}

                      // --- DRAG PROPS ---
                      drag={selectedTag === "All"}
                      dragSnapToOrigin={true}
                      dragElastic={0.1}
                      dragMomentum={false}
                      onDragStart={(e) => handleDragStart(note.id, e)}

                      // --- EVENT HANDLERS ---
                      onMouseMove={handleGlowMove}

                      onTap={(e) => {
                        if (isDraggingRef.current) return;
                        if (e.target.closest('button') || e.target.closest('[data-layout-id]')) return;
                        handleNoteTap(e, note);
                      }}

                      onClick={(e) => e.stopPropagation()}

                      // --- STYLING ---
                      style={{ backgroundColor: note.color || '#ffeb3b', touchAction: 'none' }}
                      className={`aspect-square shadow-xl p-4 md:p-6 text-black relative group cursor-grab active:cursor-grabbing flex flex-col overflow-hidden w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)]`}

                      // --- ANIMATIONS ---
                      initial={{ opacity: 0, scale: 0.8 }}

                      animate={draggingId === note.id
                        ? { scale: 1.1, zIndex: 50, boxShadow: "0px 20px 40px rgba(0,0,0,0.6)", opacity: 1 }
                        : { scale: 1, zIndex: 0, boxShadow: "0px 10px 15px rgba(0,0,0,0.2)", opacity: 1 }
                      }

                      transition={{ type: "spring", stiffness: 400, damping: 30 }}

                      // --- EXIT ANIMATION ---
                      exit={{
                        scale: 0,
                        opacity: 0,
                        transition: {
                          duration: 0.35,
                          ease: "backIn"
                        }
                      }}
                    >
                      {/* Mouse Glow Effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-overlay" style={{ background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.4), transparent 40%)' }} />

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />

                      {/* Note Content */}
                      <div className="relative z-10 flex flex-col h-full pointer-events-none">
                        {note.title && <h4 className="font-bold text-sm md:text-base mb-2 line-clamp-1 select-none">{note.title}</h4>}
                        <div className="flex-1 overflow-y-auto no-scrollbar pointer-events-auto">
                          <RichTextRenderer
                            text={note.text}
                            className="text-xs md:text-sm"
                            onToggle={(index, status) => handleToggleLine(note, index, status)}
                          />
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {note.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded-md font-medium text-black/60">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* LIQUID DELETE BUTTON */}
                      <LiquidDeleteBtn onDelete={() => onDelete(note.id)} />

                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="absolute top-6 right-6 md:top-8 md:right-12 z-50">
            <CloseButton onClick={closeLibrary} />
          </div>
        </motion.div>
      )}

      {/* EDITOR MODAL */}
      {editingNote && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30"
          onClick={handleSave}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[85vw] md:w-[550px] aspect-square shadow-2xl relative flex flex-col p-6 md:p-8 overflow-hidden transition-colors duration-500 rounded-2xl max-h-[85vh]"
            style={{ backgroundColor: editorColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />

            <input autoFocus type="text" value={editorTitle} onChange={(e) => setEditorTitle(e.target.value)} onKeyDown={handleTitleKeyDown} placeholder="Title..." className="relative z-10 w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-black/80 placeholder-black/30 text-2xl md:text-3xl font-bold mb-2 p-0" />

            <div className="relative z-10 flex flex-wrap gap-2 mb-4 items-center min-h-[32px]">
              {editorTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-black/10 px-2 py-1 rounded-md text-xs font-bold text-black/70">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-black"><X size={10} /></button>
                </span>
              ))}
              <div className="relative">
                <input ref={tagInputRef} type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder={editorTags.length === 0 ? "Add tags..." : "+ tag"} className="bg-transparent border-none outline-none text-xs text-black/60 placeholder-black/30 w-32 focus:w-48 transition-all" />
                <AnimatePresence>
                  {tagSuggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 mt-2 bg-[#111]/90 backdrop-blur-md shadow-2xl rounded-xl overflow-hidden border border-white/10 z-[100] min-w-[180px]">
                      <div className="px-3 py-2 text-[10px] uppercase font-bold text-white/30 border-b border-white/5">Suggested</div>
                      {tagSuggestions.map((tag, i) => (
                        <div key={tag} onClick={() => handleAddTag(tag)} className={`px-4 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${i === activeSuggestionIndex ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10'}`}><span>#{tag}</span>{i === activeSuggestionIndex && <span className="text-[10px] opacity-50">Enter</span>}</div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {showSlashMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 bottom-24 left-8 right-8 bg-[#111]/90 backdrop-blur-md shadow-2xl rounded-xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 text-[10px] uppercase font-bold text-white/40 border-b border-white/5">Basic Blocks</div>
                  {filteredCommands.length > 0 ? filteredCommands.map((cmd, i) => (
                    <button key={cmd.id} onClick={() => executeSlashCommand(cmd)} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors ${i === 0 ? 'bg-white/5' : ''}`}>
                      <div className="w-8 h-8 rounded border border-white/10 flex items-center justify-center bg-white/10 text-white"><cmd.icon size={14} /></div>
                      <div className="flex flex-col"><span className="text-sm font-bold text-white/90">{cmd.label}</span><span className="text-[10px] text-white/40">Type /{cmd.id}</span></div>
                    </button>
                  )) : (<div className="px-4 py-3 text-xs text-white/40 italic">No matching commands</div>)}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 flex gap-1 mb-2 border-b border-black/10 pb-2">
              <button onClick={() => insertMarkdown('bold')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Bold"><Bold size={14} /></button>
              <button onClick={() => insertMarkdown('italic')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Italic"><Italic size={14} /></button>
              <div className="w-px bg-black/10 mx-1"></div>
              <button onClick={() => insertMarkdown('list')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Bullet List"><List size={14} /></button>
              <button onClick={() => insertMarkdown('task')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Task List"><CheckSquare size={14} /></button>
            </div>

            <textarea
              ref={bodyInputRef}
              value={editorText}
              onChange={handleBodyChange}
              onKeyDown={handleBodyKeyDown}
              placeholder="Write / for commands..."
              className="relative z-10 w-full flex-1 bg-transparent resize-none border-none outline-none focus:outline-none focus:ring-0 text-black/80 placeholder-black/30 text-base md:text-lg font-normal leading-relaxed font-sans custom-scrollbar p-0 font-mono"
            />

            <div className="relative z-20 flex justify-between items-center pt-4 mt-2 border-t border-black/10">
              <div className="flex gap-2">{NOTE_COLORS.map(color => (<button key={color} onClick={() => setEditorColor(color)} className={`w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${editorColor === color ? 'ring-2 ring-black/50 scale-110' : ''}`} style={{ backgroundColor: color }} />))}</div>
              <button onClick={handleSave} className="px-6 py-2 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:scale-105 transition-transform shadow-lg">Done</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
        <motion.div
          key="game-pill"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
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
                  transition={{ duration: 0.25, ease: "easeOut" }} // Optimized transition
                  className="w-full h-full max-w-5xl max-h-[90vh] bg-[#111] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SnakeGame onExit={() => setActiveGame(null)} timeLeft={timeLeft} />
                </motion.div>
              ) : activeGame === 'typing' ? (
                <TypingGame onExit={() => setActiveGame(null)} timeLeft={timeLeft} />
              ) : (
                // --- GAME MENU ---
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }} // Optimized transition
                  className="w-full max-w-5xl flex flex-col items-center max-h-full overflow-y-auto custom-scrollbar"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* ... (Existing Menu Content - No changes needed inside) ... */}
                  <div className="w-full flex justify-between items-center mb-12 px-4 shrink-0">
                    <div className="flex flex-col">
                      <h2 className="text-4xl md:text-5xl font-serif-display text-white mb-2">Arcade</h2>
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
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-[80] hidden md:block"
        >
          <div className="relative w-80 aspect-video shadow-2xl group">
            <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20 bg-black">
              <iframe
                ref={iframeRef}
                className="w-full h-full"
                // Added enablejsapi=1 to allow volume control
                src="https://www.youtube.com/embed/jfKfPfyJRdk?enablejsapi=1&autoplay=1&controls=0&mute=0&loop=1&playlist=jfKfPfyJRdk"
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
  currentStreak: 0,
  lastActiveDate: null
};

function MainApp() {
  const [userHandle, setUserHandle] = useState("");
  const [showLoginBtn, setShowLoginBtn] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [user, setUser] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(() => {
    const hasHandle = localStorage.getItem('zen_user_handle'); // <--- CHECK THIS
    return hasHandle ? 3 : (localStorage.getItem('pomodoro_user_name') ? 3 : 0);
  });
  const [isMigrating, setIsMigrating] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const DEFAULT_SETTINGS = { focus: 25, shortBreak: 5, longBreak: 15, autoStartBreaks: false, autoStartWork: false, pomosBeforeLongBreak: 4, background: 'https://images.unsplash.com/photo-1534996858221-380b92700493?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' };
  const [initialState] = useState(loadTimerState);
  const [mode, setMode] = useState(initialState?.mode || 'focus');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft || DEFAULT_SETTINGS.focus * 60);
  const [isActive, setIsActive] = useState(initialState?.isActive || false);
  const [focusMode, setFocusMode] = useState(false);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);

  // --- BUY ME A COFFEE ---
  const [isBmcDisabled, setIsBmcDisabled] = useState(() => {
    return localStorage.getItem('zen_bmc_disabled') === 'true';
  });

  const handleDisableBmc = () => {
    setIsBmcDisabled(true);
    localStorage.setItem('zen_bmc_disabled', 'true');
  };
  // --- CAFFEINE TRACKER ---
  const [showCaffeine, setShowCaffeine] = useState(false);

  // Check if extension is installed (Universal Method)
  useEffect(() => {
    const checkExtension = () => {
      // Check both html and body tags to be safe
      const onHtml = document.documentElement.getAttribute('data-altimer-extension-installed') === 'true';
      const onBody = document.body && document.body.getAttribute('data-altimer-extension-installed') === 'true';

      if (onHtml || onBody) {
        setIsExtensionConnected(true);
        return true;
      }
      return false;
    };

    // 1. Check immediately
    if (checkExtension()) return;

    // 2. Poll for a few seconds (in case extension loads slightly slower)
    const interval = setInterval(() => {
      if (checkExtension()) {
        clearInterval(interval);
      }
    }, 500);

    setTimeout(() => clearInterval(interval), 5000);
    return () => clearInterval(interval);
  }, []);

  // --- CACHE-FIRST STATE INITIALIZATION ---
  const [notes, setNotes] = useState(Storage.getNotes());

  const [isNoteLibraryOpen, setIsNoteLibraryOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // If null -> New Note

  const [settings, setSettings] = useState(() => Storage.getSettings(DEFAULT_SETTINGS));

  const [pomoCount, setPomoCount] = useState(0);
  const [hoveredDockIndex, setHoveredDockIndex] = useState(null);

  // Load Stats from Cache
  const [stats, setStats] = useState(() => {
    // Attempt to load today's stats from LS, otherwise default
    const local = localStorage.getItem('zen_stats_current');
    return local ? JSON.parse(local) : DEFAULT_STATS;
  });

  const [devMode, setDevMode] = useState(false);
  const [customBackgrounds, setCustomBackgrounds] = useState(() => { try { const saved = localStorage.getItem('zen_custom_bgs'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; } });
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [isPro, setIsPro] = useState(() => Storage.getProStatus());
  const [proModalSource, setProModalSource] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [unlockedAmbiences, setUnlockedAmbiences] = useState([]);
  const [ambienceSetupDone, setAmbienceSetupDone] = useState(false);
  const [isTallyHovered, setIsTallyHovered] = useState(false);
  const [activePersonality, setActivePersonality] = useState(() => {
    try {
      const saved = localStorage.getItem('zen_timer_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.activePersonality || 'default';
      }
    } catch (e) { console.error(e); }
    return 'default';
  });
  const [extraFocusPopup, setExtraFocusPopup] = useState({ visible: false, minutes: 0 });
  const skipStatsRef = useRef({ attempted: 0, skipped: 0 });

  // Restore Elon stats on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zen_timer_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.skipStats) {
          skipStatsRef.current = parsed.skipStats;
        }
      }
    } catch (e) { }
  }, []);
  const [elonRejectId, setElonRejectId] = useState(null);

  const [editingModeId, setEditingModeId] = useState(null);
  const [editInputValue, setEditInputValue] = useState("");

  const [isEditingSessions, setIsEditingSessions] = useState(false);
  const [sessionEditValue, setSessionEditValue] = useState("");

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

  const handleSelectPersonality = (id) => {
    const previousId = activePersonality;
    setActivePersonality(id);

    if (id === 'elon') {
      // Enable strict mode for Elon if extension is present
      if (isExtensionConnected) {
        setStrictMode(true);
      }
      // Only reset stats if we are starting a FRESH session (timer not running)
      if (!isActive) {
        skipStatsRef.current = { attempted: 0, skipped: 0 };
      }
    } else {
      // SWITCHING AWAY FROM ELON
      if (previousId === 'elon') {
        // ONLY turn off Strict Mode if the timer has NOT started yet.
        // If timer is running, Strict Mode stays sticky to prevent cheating.
        if (!isActive) {
          setStrictMode(false);
        }
      }
    }
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
  useEffect(() => {
    if (!user) return;

    const checkAndMigrateProfile = async () => {
      try {
        const publicRef = doc(db, "publicProfiles", user.uid);
        const userRef = doc(db, "users", user.uid);

        const [publicSnap, userSnap] = await Promise.all([
          getDoc(publicRef),
          getDoc(userRef)
        ]);

        // CASE 1: BRAND NEW USER
        if (!publicSnap.exists() && !userSnap.exists()) {
          console.log("Creating new user data...");
          // Initialize PRIVATE data 
          // FIX 2: DEFAULT_STATS is now defined above, so this won't crash
          await setDoc(userRef, {
            email: user.email,
            createdAt: Date.now(),
            stats: DEFAULT_STATS,
            settings: DEFAULT_SETTINGS,
            handle: null
          });

          setIsMigrating(false);
          setOnboardingStep(1);
          setShowLoginBtn(false);
          return;
        }

        // CASE 2: MIGRATION (Private data exists, but Public Profile missing)
        if (userSnap.exists() && !publicSnap.exists()) {
          console.log("Migrating legacy user...");
          const data = userSnap.data();
          const baseName = user.displayName || "User";
          // Use the helper you defined earlier for uniqueness
          const baseHandle = data.handle || await getUniqueHandle(baseName);

          await setDoc(publicRef, {
            uid: user.uid,
            displayName: baseName,
            photoURL: user.photoURL || null,
            handle: baseHandle,
            handle_lowercase: baseHandle.toLowerCase(),
            isPro: data.subscription?.plan === 'pro',
            stats: data.stats || DEFAULT_STATS, // Ensure fallback
          });

          if (!data.handle) {
            await setDoc(userRef, { handle: baseHandle }, { merge: true });
          }
        }

        // CASE 3: EXISTING USER
        if (publicSnap.exists() && userSnap.exists()) {
          const pubData = publicSnap.data();
          const privData = userSnap.data();
          if (!privData.handle && pubData.handle) {
            await setDoc(userRef, { handle: pubData.handle }, { merge: true });
          }
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
    // 1. Save to LocalStorage immediately (Keeps order if you refresh)
    Storage.saveNotesLocally(currentNotes);

    // 2. Save to DB
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { notes: currentNotes }, { merge: true });
      } catch (e) { console.error("Reorder failed", e); }
    }
  };

  const handleSaveNote = async (note) => {
    // 1. OPTIMISTIC UPDATE (Instant)
    // Logic to update the notes array in state...
    const exists = notes.some(n => n.id === note.id);
    const updatedNotes = exists
      ? notes.map(n => (n.id === note.id ? note : n))
      : [note, ...notes];

    setNotes(updatedNotes);

    // 2. SAVE TO LOCAL STORAGE (Safety)
    Storage.saveNotesLocally(updatedNotes);

    // 3. SYNC TO FIREBASE (Background)
    if (user) {
      try {
        // Direct write. No debounce needed because the user explicitly clicked "Done".
        await setDoc(doc(db, "users", user.uid), { notes: updatedNotes }, { merge: true });
      } catch (e) {
        console.error("Note sync failed:", e);
        // Optional: Add a "Retry" indicator to UI
      }
    }
  };



  const handleDeleteNote = async (noteId) => {
    // 1. Remove from Active Notes (Instant UI update, no "deleted: true" clutter)
    const updatedNotes = notes.filter(n => n.id !== noteId);

    // 2. Add to Trash Ledger (The Hit List)
    // We map ID -> Timestamp of deletion
    const localTrash = Storage.getTrash();
    const updatedTrash = { ...localTrash, [noteId]: Date.now() };

    setNotes(updatedNotes);

    // 3. Save Both to Local Storage
    Storage.saveNotesLocally(updatedNotes);
    Storage.saveTrashLocally(updatedTrash);

    // 4. Sync Both to Firestore
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), {
          notes: updatedNotes,
          trash: updatedTrash // <--- Sync the Hit List too
        }, { merge: true });
      } catch (e) {
        console.error("Delete failed", e);
      }
    }
  };

  // --- AUDIO REFS ---
  const musicAudioRef = useRef(new Audio());
  const ambienceRefs = useRef({});// NEW: Separate Engine for Ambience

  // --- AUDIO STATE ---
  const [volume, setVolume] = useState(0.5);

  // 1. MUSIC (Focus Tracks)
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);

  // 2. AMBIENCE (Rain, Wind, etc.) - NEW
  const [currentAmbience, setCurrentAmbience] = useState(null);
  const [isAmbiencePlaying, setIsAmbiencePlaying] = useState(false);
  const [ambienceLoading, setAmbienceLoading] = useState(false);
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
  const [friends, setFriends] = useState([]); // List of friend objects with live status
  const [friendUids, setFriendUids] = useState([]); // Just the IDs for listening
  const [viewingFriendStats, setViewingFriendStats] = useState(null); // User object of friend to view stats for
  const [friendConfig, setFriendConfig] = useState({}); // Stores { uid: { isPinned: true/false } }
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStrictMenuOpen, setIsStrictMenuOpen] = useState(false);
  const [isBmcMenuOpen, setIsBmcMenuOpen] = useState(false);

  // --- STRICT MODE STATE & LOGIC ---
  const [strictMode, setStrictMode] = useState(() => localStorage.getItem('zen_strict_mode') === 'true');
  const [showStrictConfirm, setShowStrictConfirm] = useState(false);
  const [showStrictWarning, setShowStrictWarning] = useState(false);
  const [showStrictDisableConfirm, setShowStrictDisableConfirm] = useState(false); // <--- NEW STATE
  const wasMusicPlayingRef = useRef(false);
  // --- STRICT MODE LOGIC (UPDATED: EXTENSION BASED) ---
  const strictModeRef = useRef(strictMode);

  // Keep Ref in sync & Sync with Extension
  useEffect(() => {
    strictModeRef.current = strictMode;
    // Sync whenever Strict Mode OR The Timer Mode changes
    syncWithExtension(isActive, strictMode, mode);
    localStorage.setItem('zen_strict_mode', strictMode);
  }, [strictMode, isActive, mode]); // <--- Added 'mode' dependency

  const enableStrictMode = () => {
    if (!isExtensionConnected) return; // Guard: Don't enable if extension missing
    setStrictMode(true);
    setShowStrictConfirm(false);
    // Note: We NO LONGER request fullscreen here. The extension handles blocking.
  };

  const handleStrictDisable = () => {
    setStrictMode(false);
    setShowStrictDisableConfirm(false);
    // Note: We NO LONGER exit fullscreen here.
  };

  // (We deleted handleStrictResume and the "Trap" useEffect because we don't need them anymore)
  const unsavedSecondsRef = useRef(0);
  const timerIntervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };


  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const playBtnRef = useRef(null);
  const endTimeRef = useRef(null);
  const audioRefs = useRef({});
  const accumulatedTimeRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const prevSettings = useRef(DEFAULT_SETTINGS);
  const lastStatSaveTime = useRef(Date.now());
  const lastRemoteUpdate = useRef(0); // To avoid echoing back remote changes
  const prevNotes = useRef([]);




  // --- FOCUS MODE STATE ---


  useEffect(() => {
    const sounds = { 'focus': '/sounds/timer-end.mp3', 'shortBreak': '/sounds/timer-end.mp3', 'longBreak': '/sounds/timer-end.mp3' };
    Object.keys(sounds).forEach(key => { const audio = new Audio(sounds[key]); audio.preload = 'auto'; audio.volume = 1.0; audioRefs.current[key] = audio; });
  }, []);
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
        if (showKeyboardHelp) { setShowKeyboardHelp(false); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (showAccount) { setShowAccount(false); return; }
        if (showStats) { setShowStats(false); return; }
        if (showFriends) { setShowFriends(false); return; }
        if (showMusic) { setShowMusic(false); return; }
        if (viewingFriendStats) { setViewingFriendStats(null); setShowStats(false); return; }
        if (isNoteLibraryOpen) { setIsNoteLibraryOpen(false); return; }

        // B. Close Confirmations
        if (showStrictConfirm) { setShowStrictConfirm(false); return; }
        if (showStrictWarning) { /* Strict warning usually blocks Esc, but we can allow dismissing if needed */ }
        if (showStrictDisableConfirm) { setShowStrictDisableConfirm(false); return; }
        if (showResetConfirm) { setShowResetConfirm(false); return; }

        // C. Blur Inputs / Edit Modes
        if (isInputFocused) {
          e.preventDefault();
          activeElement.blur();
          if (activeElement.id === 'session-name-input') { setIsEditingName(false); }
        }

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

      // Toggle Help
      if (e.shiftKey && e.key === '?') { e.preventDefault(); setShowKeyboardHelp(prev => !prev); return; }

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
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); setShowSettings(prev => !prev); }

    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);

  }, [
    // --- CRITICAL: ALL STATE VARIABLES MUST BE HERE ---
    isActive, onboardingStep, mode, timeLeft, settings,
    // Modals
    showSettings, showFriends, showKeyboardHelp, showResetConfirm,
    showAccount, showMusic, showStats, viewingFriendStats,
    showStrictConfirm, showStrictWarning, showStrictDisableConfirm,
    isNoteLibraryOpen, editingNote,
    // Music
    isMusicPlaying, currentTrack, volume,
    // Inputs
  ]);

  const playAlarm = (currentMode) => { const audio = audioRefs.current[currentMode]; if (audio) { audio.currentTime = 0; const playPromise = audio.play(); if (playPromise !== undefined) { playPromise.catch(error => { console.warn("Audio play failed, falling back to beep:", error); fallbackBeep(); }); } } else { fallbackBeep(); } };
  const fallbackBeep = () => { try { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 440; osc.type = 'sine'; gain.gain.value = 0.1; osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1); osc.stop(ctx.currentTime + 1); } } catch (e) { console.error("Audio fallback failed", e); } };


  // App.jsx

  const flushUnsavedTime = async () => {
    // We don't need to write to DB here. 
    // LocalStorage has already captured every second via the timer loop.
    // We just reset the ref to prevent double-counting if logic changes later.
    unsavedSecondsRef.current = 0;
  };


  // --- NEW: Sync Timer State Helper ---
  // App.jsx (~Line 2060)

  const syncTimerState = async (newState) => {
    if (!user) return;

    // --- HYBRID PIGGYBACK STRATEGY ---
    // Read the latest local stats directly from storage (avoids React Staleness)
    // We attach this to the public presence doc so friends can see "Today's Focus"
    // WITHOUT requiring a separate DB write.
    const currentStats = Storage.getTodayStats();

    const payload = {
      timerState: {
        ...newState,
        lastUpdated: Date.now()
      },
      // Piggyback stats here:
      todayStats: {
        focusTime: currentStats.dailyFocusTime || 0,
        breakTime: currentStats.dailyBreakTime || 0,
        sessions: currentStats.dailySessions || 0
      }
    };

    lastRemoteUpdate.current = payload.timerState.lastUpdated;

    try {
      // ONLY update Public Profile Status (Online/Offline/Focusing)
      await setDoc(doc(db, "publicProfiles", user.uid), {
        timerState: payload.timerState,
        stats: payload.todayStats // Flattened for easy access by friends
      }, { merge: true });

    } catch (e) {
      console.error("Sync failed", e);
    }
  };

  // --- UPDATED AUTH EFFECT ---
  useEffect(() => {
    const initAuth = async () => {
      // Magic Link Check (Same as before)
      const params = new URLSearchParams(window.location.search);
      const demoMode = params.get('demo');
      if (demoMode === 'caffeine' && !auth.currentUser) {
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
      } else if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);

      if (currentUser) {
        // 0. MAGIC LINK UPGRADE (Same as before)
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === 'caffeine') {
          // ... (Same demo logic as previous response) ...
          console.log("☕ Caffeine Clock Demo Mode Activated");
          window.history.replaceState({}, document.title, window.location.pathname);
          const batch = writeBatch(db);
          const userRef = doc(db, "users", currentUser.uid);
          batch.set(userRef, {
            subscription: { plan: 'pro', status: 'active', since: Date.now() },
            settings: DEFAULT_SETTINGS,
            handle: "@CaffeineClock"
          }, { merge: true });
          const publicRef = doc(db, "publicProfiles", currentUser.uid);
          batch.set(publicRef, {
            uid: currentUser.uid,
            displayName: "Caffeine Clock Team",
            handle: "@CaffeineClock",
            handle_lowercase: "@caffeineclock",
            isPro: true,
            stats: DEFAULT_STATS
          }, { merge: true });
          await batch.commit();
          setIsPro(true);
          setUserHandle("@CaffeineClock");
          localStorage.setItem('zen_user_handle', "@CaffeineClock");
          localStorage.setItem('pomodoro_user_name', "Caffeine Clock");
          setOnboardingStep(3);
          setShowLoginBtn(false);
          setShowCaffeine(true);
          setDataLoaded(true);
          return;
        }

        // --- 1. GUEST USER LOGIC (FIXED) ---
        if (currentUser.isAnonymous) {
          console.log("Guest session active.");
          // IMPORTANT: Remove any handle from local storage so UI knows they are guest
          localStorage.removeItem('zen_user_handle');
          localStorage.setItem('pomodoro_user_name', "Guest");

          // Skip Onboarding immediately (Guests don't pick handles)
          setOnboardingStep(3);
          setShowLoginBtn(false);
          Storage.syncPendingData(db, currentUser);
          setDataLoaded(true);
          return;
        }

        // --- 2. REGISTERED USER LOGIC ---
        const firstName = currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'User';

        // Check DB for existing handle (The definitive source)
        try {
          const publicRef = doc(db, "publicProfiles", currentUser.uid);
          const publicSnap = await getDoc(publicRef);
          const dbHandle = publicSnap.exists() ? publicSnap.data().handle : null;

          if (dbHandle) {
            // User HAS a handle -> Go to Dashboard
            localStorage.setItem('zen_user_handle', dbHandle);

            setOnboardingStep(3); // Skip onboarding
            setShowLoginBtn(false);
          } else {
            // User HAS NO handle -> Go to Handle Step (1)
            // This happens for new Google sign-ups
            setIsMigrating(false);
            // Suggest handle based on name
            const suggested = currentUser.displayName
              ? currentUser.displayName.replace(/\s+/g, '').toLowerCase().slice(0, 10)
              : "user";
            // We set this via prop or local state if OnboardingFlow reads it, 
            // but for now relying on OnboardingFlow's internal suggestion logic is fine.

            setOnboardingStep(1); // Force Handle Creation
            setShowLoginBtn(false);
          }
        } catch (e) {
          console.error("Auth check failed:", e);
        }

        Storage.syncPendingData(db, currentUser);

      } else {
        // --- 3. NO USER ---
        setGreetingText("Hello, stranger");
        setShowLoginBtn(true);
        if (onboardingStep !== 3) {
          setOnboardingStep(0);
        }
        setDataLoaded(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- SOCIAL: Friends Logic (UPDATED) ---

  const [friendRequests, setFriendRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [socialView, setSocialView] = useState('list'); // <--- ADD THIS STATE

  // 1. Listen to friends
  useEffect(() => {
    if (!user) return;
    const friendsRef = collection(db, "users", user.uid, "friends");
    const unsub = onSnapshot(friendsRef, (snapshot) => {
      const config = {};
      const uids = [];
      snapshot.forEach(doc => {
        uids.push(doc.id);
        config[doc.id] = { isPinned: doc.data().isPinned || false };
      });
      setFriendUids(uids);
      setFriendConfig(config);
    });
    return () => unsub();
  }, [user]);

  // 2. Listen to Friend Requests
  useEffect(() => {
    if (!user) return;
    const requestsRef = collection(db, "users", user.uid, "friendRequests");
    const unsub = onSnapshot(requestsRef, (snapshot) => {
      const reqs = [];
      snapshot.forEach(doc => { reqs.push({ uid: doc.id, ...doc.data() }); });
      setFriendRequests(reqs);
    });
    return () => unsub();
  }, [user]);

  // 3. Listen to BLOCKED users
  useEffect(() => {
    if (!user) return;
    const blockedRef = collection(db, "users", user.uid, "blocked");
    const unsub = onSnapshot(blockedRef, (snapshot) => {
      const blocked = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        blocked.push({
          uid: doc.id,
          displayName: data.displayName || "Unknown User",
          photoURL: data.photoURL || null,
          email: data.email || null
        });
      });
      setBlockedUsers(blocked);
    });
    return () => unsub();
  }, [user]);

  // 4. Friend Profiles Listener
  useEffect(() => {
    if (!user || friendUids.length === 0) { setFriends([]); return; }
    const unsubscribers = [];
    const currentFriendsData = {};

    friendUids.forEach(friendId => {
      const unsub = onSnapshot(doc(db, "publicProfiles", friendId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();

          let isOnline = false;
          let isActive = false;
          let statusText = "Offline";
          let mode = 'focus';
          let timeLeft = 0;

          if (data.timerState) {
            // ... inside the useEffect for friend profiles ...

            const now = Date.now();
            const GRACE_PERIOD = 5 * 60 * 1000; // 5 Minutes

            // ... when parsing data ...
            if (data.timerState) {
              const ts = data.timerState; // Shorthand
              const lastUpdate = ts.lastUpdated || 0;
              const isDataStale = (now - lastUpdate) > GRACE_PERIOD;

              // SCENARIO 1: Timer is Running (Active)
              if (ts.isActive) {
                // We trust the end time. Even if they close the tab, 
                // the session is valid until the clock runs out.
                if (ts.targetEndTime > now) {
                  isOnline = true;
                  isActive = true;
                  mode = ts.mode;
                  timeLeft = Math.ceil((ts.targetEndTime - now) / 1000);
                  statusText = `${mode === 'focus' ? 'Focus' : 'Break'} • ${Math.floor(timeLeft / 60)}m`;
                } else {
                  // Timer finished naturally, but user hasn't touched app in a while
                  // We show them as "Idle" (Online but away)
                  isOnline = true;
                  isActive = false;
                  statusText = "Idle";
                }
              }
              // SCENARIO 2: Timer is Paused/Stopped
              else {
                if (isDataStale) {
                  // It has been > 5 mins since they paused.
                  // They probably closed the tab. Mark as OFFLINE.
                  isOnline = false;
                  statusText = "Offline";
                } else {
                  // They paused recently (within 5 mins). They are still here.
                  isOnline = true;
                  isActive = false;
                  statusText = "Paused";
                }
              }
            }
          }

          currentFriendsData[friendId] = {
            uid: friendId,
            displayName: data.displayName || "Unknown",
            photoURL: data.photoURL,
            handle: data.handle,
            isOnline,
            isActive,
            statusText,
            mode,
            timeLeft,
            isPinned: friendConfig[friendId]?.isPinned || false,
            isPro: data.isPro || false
          };

          setFriends(Object.values(currentFriendsData));
        }
      });
      unsubscribers.push(unsub);
    });

    // Local tick to update countdowns smoothly without DB reads
    const interval = setInterval(() => {
      setFriends(prev => prev.map(f => (f.isActive && f.timeLeft > 0 ? {
        ...f,
        timeLeft: f.timeLeft - 1,
        statusText: `${f.mode === 'focus' ? 'Focus' : 'Break'} • ${Math.floor((f.timeLeft - 1) / 60)}m`
      } : f)));
    }, 1000);

    return () => { unsubscribers.forEach(u => u()); clearInterval(interval); };
  }, [user, friendUids, friendConfig]);

  // --- ACTIONS ---

  const handleSendRequest = useCallback(async (targetUser) => {
    if (!user) return { success: false, error: "Not logged in" };
    if (targetUser.uid === user.uid) return { success: false, error: "You can't add yourself." };

    try {
      const friendRef = doc(db, "users", user.uid, "friends", targetUser.uid);
      const friendSnap = await getDoc(friendRef);
      if (friendSnap.exists()) return { success: false, error: "Already friends." };

      const incomingReqRef = doc(db, "users", user.uid, "friendRequests", targetUser.uid);
      const incomingSnap = await getDoc(incomingReqRef);

      if (incomingSnap.exists()) {
        const batch = writeBatch(db);
        batch.set(doc(db, "users", user.uid, "friends", targetUser.uid), { addedAt: Date.now() });
        batch.set(doc(db, "users", targetUser.uid, "friends", user.uid), { addedAt: Date.now() });
        batch.delete(incomingReqRef);
        batch.delete(doc(db, "users", targetUser.uid, "friendRequests", user.uid));
        await batch.commit();
        return { success: true, message: "You are now friends!" };
      }

      const reqRef = doc(db, "users", targetUser.uid, "friendRequests", user.uid);
      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) return { success: false, error: "Request already sent." };

      await setDoc(reqRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        isPro: isPro,
        timestamp: Date.now()
      });
      return { success: true };
    } catch (e) {
      if (e.code === 'permission-denied') return { success: false, error: "Unable to send (User may have blocked you)." };
      return { success: false, error: "Failed to send request." };
    }
  }, [user, isPro]);

  const handleCheckOutgoingRequest = useCallback(async (targetUserId) => {
    if (!user) return false;
    try {
      const reqRef = doc(db, "users", targetUserId, "friendRequests", user.uid);
      const snap = await getDoc(reqRef);
      return snap.exists();
    } catch (e) { return false; }
  }, [user]);

  const handleBlockUser = useCallback(async (targetUser) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);

      const uid = targetUser.uid || targetUser;
      const displayName = targetUser.displayName || "Unknown User";
      const photoURL = targetUser.photoURL || null;
      const email = targetUser.email || null;

      const blockRef = doc(db, "users", user.uid, "blocked", uid);
      batch.set(blockRef, { timestamp: Date.now(), displayName, photoURL, email });

      batch.delete(doc(db, "users", user.uid, "friends", uid));
      batch.delete(doc(db, "users", uid, "friends", user.uid));
      batch.delete(doc(db, "users", user.uid, "friendRequests", uid));
      batch.delete(doc(db, "users", uid, "friendRequests", user.uid));

      await batch.commit();

      setFriends(prev => prev.filter(f => f.uid !== uid));
      setFriendRequests(prev => prev.filter(req => req.uid !== uid));
    } catch (e) { console.error("Block failed:", e); }
  }, [user]);

  const handleUnblockUser = useCallback(async (blockedUserId) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "users", user.uid, "blocked", blockedUserId));
      batch.delete(doc(db, "users", user.uid, "friends", blockedUserId));
      await batch.commit();
      setBlockedUsers(prev => prev.filter(b => b.uid !== blockedUserId));
      setFriends(prev => prev.filter(f => f.uid !== blockedUserId));
    } catch (e) { console.error("Unblock failed:", e); }
  }, [user]);

  const handleAcceptRequest = useCallback(async (requester) => {
    if (!user) return;
    const batch = writeBatch(db);
    batch.set(doc(db, "users", user.uid, "friends", requester.uid), { addedAt: Date.now() });
    batch.set(doc(db, "users", requester.uid, "friends", user.uid), { addedAt: Date.now() });
    batch.delete(doc(db, "users", user.uid, "friendRequests", requester.uid));
    await batch.commit();
  }, [user]);

  const handleDeclineRequest = useCallback(async (requesterId) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "friendRequests", requesterId));
  }, [user]);

  const handleRemoveFriend = useCallback(async (friendId) => {
    if (!user) return;
    setFriends(prev => prev.filter(f => f.uid !== friendId));
    const batch = writeBatch(db);
    batch.delete(doc(db, "users", user.uid, "friends", friendId));
    batch.delete(doc(db, "users", friendId, "friends", user.uid));
    await batch.commit();
  }, [user]);

  const handleTogglePin = useCallback(async (friendId, currentStatus) => {
    if (!user) return;
    const friendRef = doc(db, "users", user.uid, "friends", friendId);
    await setDoc(friendRef, { isPinned: !currentStatus }, { merge: true });
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

    // AUTO-PREFIX @ LOGIC
    const termLower = term.toLowerCase();
    let handleQuery = termLower;
    if (!handleQuery.startsWith('@')) {
      handleQuery = '@' + handleQuery;
    }

    const profilesRef = collection(db, "publicProfiles");

    const senderHandle = stats.handle || user.handle || "@user";

    // Query 1: By Handle
    const q1 = query(profilesRef, where("handle_lowercase", ">=", handleQuery), where("handle_lowercase", "<=", handleQuery + '\uf8ff'), limit(5));
    // Query 2: By Display Name
    const q2 = query(profilesRef, where("displayName", ">=", term), where("displayName", "<=", term + '\uf8ff'), limit(5));

    try {
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const resultsMap = new Map();
      // Exclude blocked users logic here...
      const blockedSet = new Set(blockedUsers.map(b => b.uid));

      [...snap1.docs, ...snap2.docs].forEach(doc => {
        const docId = doc.id;
        if (docId !== user.uid && !blockedSet.has(docId)) {
          const data = doc.data();
          resultsMap.set(docId, {
            uid: docId,
            displayName: data.displayName,
            photoURL: data.photoURL,
            handle: data.handle, // Return the handle
            isPro: data.isPro,
            streak: data.streak || 0,
            todayFocusTime: data.todayFocusTime || 0,
            timerState: data.timerState // Include timer state if useful
          });
        }
      });
      return Array.from(resultsMap.values());
    } catch (e) {
      console.error("Search error:", e);
      return [];
    }
  }, [user, blockedUsers]);

  // --- End Social Logic ---

  // --- UPDATED SYNC EFFECT (FIXED) ---
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // --- FIX 1: DEFINE MISSING VARIABLES HERE ---
          const serverNotes = data.notes || [];
          const localNotes = Storage.getNotes() || [];

          // --- BASIC USER INFO ---
          setUserHandle(data.handle || "");
          const userIsPro = data.subscription?.plan === 'pro';

          // 1. Update State
          setIsPro(userIsPro);

          // 2. Renew the Offline Lease (Updates timestamp to Now)

          // Load Trash Ledgers
          const serverTrash = data.trash || {};
          const localTrash = Storage.getTrash();

          // A. MERGE TRASH (Union)
          const mergedTrash = { ...serverTrash, ...localTrash };
          Object.keys(localTrash).forEach(id => {
            if (serverTrash[id] && serverTrash[id] > localTrash[id]) {
              mergedTrash[id] = serverTrash[id];
            }
          });

          // B. MERGE NOTES
          const mergedNotesMap = new Map();
          serverNotes.forEach(note => mergedNotesMap.set(note.id, note));

          localNotes.forEach(localNote => {
            const serverNote = mergedNotesMap.get(localNote.id);
            if (!serverNote || (localNote.updatedAt || 0) > (serverNote.updatedAt || 0)) {
              mergedNotesMap.set(localNote.id, localNote);
            }
          });

          // C. EXECUTE THE HIT LIST (Kill Zombies)
          Object.keys(mergedTrash).forEach(deletedId => {
            const note = mergedNotesMap.get(deletedId);
            if (note) {
              const deleteTime = mergedTrash[deletedId];
              const noteTime = note.updatedAt || 0;
              if (deleteTime > noteTime) {
                mergedNotesMap.delete(deletedId);
              } else {
                delete mergedTrash[deletedId];
              }
            }
          });

          // D. GARBAGE COLLECTION
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
          const now = Date.now();
          Object.keys(mergedTrash).forEach(id => {
            if (now - mergedTrash[id] > THIRTY_DAYS_MS) {
              delete mergedTrash[id];
            }
          });

          const finalNotes = Array.from(mergedNotesMap.values());

          // E. SAVE EVERYTHING
          if (JSON.stringify(finalNotes) !== JSON.stringify(localNotes)) {
            setNotes(finalNotes);
            Storage.saveNotesLocally(finalNotes);
          }
          Storage.saveTrashLocally(mergedTrash);

          // --- 2. SMART SETTINGS SYNC ---
          if (data.settings) {
            const remoteSettings = data.settings;
            const localSettings = Storage.getSettings(DEFAULT_SETTINGS);
            const remoteTime = remoteSettings.updatedAt || 0;
            const localTime = localSettings.updatedAt || 0;

            if (remoteTime > localTime) {
              const merged = { ...DEFAULT_SETTINGS, ...remoteSettings };
              setSettings(merged);
              Storage.saveSettingsLocally(merged);
              prevSettings.current = merged;
            }
          }

          // --- 4. STATS LOGIC ---
          const serverStats = { ...DEFAULT_STATS, ...(data.stats || {}) };
          const localStats = JSON.parse(localStorage.getItem('zen_stats_current') || '{}');
          const todayId = formatDateId(new Date());
          let finalStats = { ...serverStats };

          if (localStats.date === todayId) {
            finalStats.dailyFocusTime = localStats.dailyFocusTime || 0;
            finalStats.dailyBreakTime = localStats.dailyBreakTime || 0;
            finalStats.dailySessions = localStats.dailySessions || 0;
          }

          const today = new Date();
          let lastActiveDate = finalStats.lastActiveDate
            ? (finalStats.lastActiveDate.toDate ? finalStats.lastActiveDate.toDate() : new Date(finalStats.lastActiveDate))
            : null;

          if (lastActiveDate && !isSameDay(lastActiveDate, today)) {
            if (localStats.date !== todayId) {
              finalStats.dailyFocusTime = 0;
              finalStats.dailyBreakTime = 0;
              finalStats.dailySessions = 0;
            }
          }

          setStats(finalStats);
          localStorage.setItem('zen_cache_stats', JSON.stringify(finalStats));

          // --- 5. OPTIMIZED STREAK ---
          if (data.streak !== undefined) {
            Storage.syncServerStreak(data.streak || 0, data.lastActive || 0);
          }
        }
        setDataLoaded(true);
      });

      // --- FIX 2: Correct closing of IF block and RETURN ---
      return () => unsub();
    }
  }, [user]);
  // --- OPTIMIZED SAVE LOGIC (Critical Changes Only) ---
  useEffect(() => {
    if (!user || !dataLoaded) return;

    // Helper to compare objects deeply
    const isDifferent = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

    // Check for Critical Changes (Notes, Settings, Session Name)
    // We do NOT check 'stats' here anymore. Stats are handled by flushUnsavedTime().
    const notesChanged = JSON.stringify(notes) !== JSON.stringify(prevNotes.current);
    const hasCriticalChanges = notesChanged || isDifferent(settings, prevSettings.current);

    if (hasCriticalChanges) {
      const saveData = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const today = new Date();

        // 1. Save Private Data (Settings, Notes, Session Name)
        // We include 'stats' here just to keep the document complete, 
        // but we aren't "pushing" the live timer update here.
        const payload = {
          notes,
          settings,
          lastUpdated: today,
          stats // This just syncs whatever the current state is, mostly for backup
        };

        await setDoc(userDocRef, payload, { merge: true });

        // Update Refs so we don't save again until the next change
        prevNotes.current = notes;
        prevSettings.current = settings;
      };

      // Debounce slightly to prevent rapid-fire saves while typing a note
      const handler = setTimeout(saveData, 2000);
      return () => clearTimeout(handler);
    }
  }, [notes, settings, user, dataLoaded]);


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

  useEffect(() => {
    const audio = musicAudioRef.current;

    const updateProgress = () => setMusicProgress(audio.currentTime);
    const updateDuration = () => setMusicDuration(audio.duration);
    const handleEnded = () => setIsMusicPlaying(false);
    const handleWaiting = () => setMusicLoading(true);
    const handleCanPlay = () => setMusicLoading(false);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handleCanPlay);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handleCanPlay);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

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
  }, []);

  // 3. Wrap changeAmbienceVolume in useCallback
  const changeAmbienceVolume = useCallback((id, newVol) => {
    const audio = ambienceRefs.current[id];
    if (audio) audio.volume = newVol;

    setAmbienceState(prev => ({
      ...prev,
      [id]: { ...prev[id], volume: newVol }
    }));
  }, []);

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
      await signOut(auth);

      // 1. Clear User Identity Data
      localStorage.removeItem('pomodoro_user_name');
      localStorage.removeItem('zen_user_handle');

      // 2. Clear caches (Recommended so next user starts fresh)
      localStorage.removeItem('zen_cache_settings');
      localStorage.removeItem('zen_cache_notes');
      localStorage.removeItem('zen_cache_session_name');
      localStorage.removeItem('zen_cache_stats');

      // 3. Reset UI State
      // We ONLY need to reset the step. 
      // The OnboardingFlow component will mount and automatically 
      // show "Hello, stranger" and the login buttons itself.
      setIsMigrating(false);
      setOnboardingStep(0);

    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };




  // --- SYNC WORKER (Smart Rollover) ---
  useEffect(() => {
    if (!user) return;

    // Trigger sync ONLY when:
    // 1. App mounts (handled by dependency on 'stats.date' implicitly or separate auth check)
    // 2. The date changes (Rollover at midnight)
    // This satisfies "batchwrite next day" without constant polling.
    const attemptSync = async () => {
      if (Storage.hasPendingData()) {
        console.log("[App] Rollover/Load detected. Syncing pending stats...");
        await Storage.syncPendingData(db, user);
      }
    };

    attemptSync();
  }, [user, stats.date]); // Runs on mount + when date flips

  // --- TIMER INTERVAL & TRANSITION LOGIC (Ghost-Proof) ---
  useEffect(() => {
    // 1. Safety Clear: Stop any existing timer immediately
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (isActive) {
      // Initialize the "Wall Clock" (Ref) so all timers share the same baseline
      lastTickRef.current = Date.now();

      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
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
        const diff = endTimeRef.current - now;
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
          // We add exactly 1000ms chunks to keep rhythm perfect
          lastTickRef.current += (secondsPassed * 1000);

          // 2. Update Local Storage (The Ledger)
          const updatedStats = Storage.updateLocalStats(secondsPassed, mode);

          // 3. Add to Server Buffer
          unsavedSecondsRef.current += secondsPassed;

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
            if (!devMode) {
              setStats(prev => ({ ...prev, dailySessions: prev.dailySessions + 1 }));
            }
            if (strictMode) document.exitFullscreen().catch(() => { });

            // 1. DETERMINE INTENDED NEXT MODE
            let intendedNextMode = 'shortBreak';
            let intendedTimeLeft = settings.shortBreak * 60;

            if (pomoCount + 1 >= settings.pomosBeforeLongBreak) {
              intendedNextMode = 'longBreak';
              intendedTimeLeft = settings.longBreak * 60;
            }

            // 2. ELON MUSK LOGIC (Skip Break Check)
            let skipBreak = false;

            if (activePersonality === 'elon') {
              skipStatsRef.current.attempted += 1;
              const { attempted, skipped } = skipStatsRef.current;

              // Only skip if we haven't hit 50% yet
              if ((skipped / attempted) < 0.5) {
                // 50% Random chance
                if (Math.random() > 0.5) {
                  skipBreak = true;
                  skipStatsRef.current.skipped += 1;
                }
              }
            }

            if (skipBreak) {
              // ELON MODE: SKIP BREAK
              // We go straight back to FOCUS
              nextMode = 'focus';
              nextTimeLeft = settings.focus * 60;
              if (settings.autoStartWork) nextIsActive = true;
              // Even if autoStartWork is off, Elon implies intensity, maybe force it?
              // Let's stick to settings or force true:
              nextIsActive = true; // Elon forces the next session

              // Trigger Popup
              setExtraFocusPopup({ visible: true, minutes: Math.floor(intendedTimeLeft / 60) });
              setTimeout(() => setExtraFocusPopup({ visible: false, minutes: 0 }), 5000);

            } else {
              // NORMAL BEHAVIOR
              nextMode = intendedNextMode;
              nextTimeLeft = intendedTimeLeft;
              if (settings.autoStartBreaks) nextIsActive = true;
            }

          } else if (mode === 'shortBreak') {
            // ... (existing shortBreak end logic) ...
            setPomoCount(prev => prev + 1);
            nextMode = 'focus';
            if (strictMode) document.documentElement.requestFullscreen().catch(() => { });
            nextTimeLeft = settings.focus * 60;
            if (settings.autoStartWork) nextIsActive = true;

          } else if (mode === 'longBreak') {
            // ... (existing longBreak end logic) ...
            setPomoCount(0);
            nextMode = 'focus';
            if (strictMode) document.documentElement.requestFullscreen().catch(() => { });
            nextTimeLeft = settings.focus * 60;
            if (settings.autoStartWork) nextIsActive = true;
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
        }
      }, 100); // 100ms resolution is fine for checking updates
    } else {
      endTimeRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, mode, settings, pomoCount, devMode, strictMode]);

  useEffect(() => {
    if (isActive && endTimeRef.current) {
      localStorage.setItem('zen_timer_state', JSON.stringify({
        mode,
        isActive: true,
        targetEndTime: endTimeRef.current,
        timestamp: Date.now(),
        // ADDED PERSISTENCE:
        activePersonality,
        skipStats: skipStatsRef.current
      }));
    }
  }, [isActive, mode, activePersonality]); // Added activePersonality to dependency array

  useEffect(() => {
    if (!isActive) {
      localStorage.setItem('zen_timer_state', JSON.stringify({
        mode,
        isActive: false,
        timeLeft,
        timestamp: Date.now(),
        // ADDED PERSISTENCE:
        activePersonality,
        skipStats: skipStatsRef.current
      }));
    }
  }, [isActive, mode, timeLeft, activePersonality]);

  const isInitialMount = useRef(true);
  const prevDurationRef = useRef(settings[mode] * 60);
  useEffect(() => { if (isInitialMount.current) { isInitialMount.current = false; return; } const newDuration = settings[mode] * 60; if (!isActive) { if (timeLeft === prevDurationRef.current) { setTimeLeft(newDuration); } } prevDurationRef.current = newDuration; }, [mode, settings[mode]]);

  // --- UPDATED TOGGLE TIMER ---
  const toggleTimer = () => {
    // 1. Flush: effectively does nothing now (Silent)
    if (isActive) flushUnsavedTime();

    const newIsActive = !isActive;
    setIsActive(newIsActive);

    // 2. Extension Sync (Browser API only, no DB)
    syncWithExtension(newIsActive, strictMode, mode);

    if (newIsActive) {
      lastHeartbeatRef.current = Date.now();
    }

    // 3. Prepare Payload
    let stateToSync = {
      isActive: newIsActive,
      mode,
      timeLeft,
      // If starting, set target. If pausing, nullify target.
      targetEndTime: newIsActive ? Date.now() + timeLeft * 1000 : null
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
    unsavedSecondsRef.current = 0;
    accumulatedTimeRef.current = 0;

    // 2. Reset Timer State
    setIsActive(false);
    setMode('focus');
    setTimeLeft(settings['focus'] * 60);
    setPomoCount(0);
    endTimeRef.current = null;

    // 3. Sync "Reset" state to DB (so friends see you are Idle)
    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: 'focus',
      timeLeft: settings['focus'] * 60,
      lastUpdated: Date.now()
    });

    // 4. Close the modal
    setShowResetConfirm(false);
  };

  const handleModeChange = (newMode) => {
    flushUnsavedTime();
    accumulatedTimeRef.current = 0;
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(settings[newMode] * 60);

    // Sync Mode Change
    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: newMode,
      timeLeft: settings[newMode] * 60,
    });
  };

  const isTimerRunning = isActive || (timeLeft < settings[mode] * 60 && timeLeft > 0);

  const handleSettingsSave = async (newSettings) => {
    // 1. ADD TIMESTAMP (The "Version Control")
    // This marks these settings as the latest version
    const settingsWithTimestamp = {
      ...newSettings,
      updatedAt: Date.now()
    };

    // 2. Save to Local Storage IMMEDIATELY (The Authority)
    Storage.saveSettingsLocally(settingsWithTimestamp);

    // 3. Update React State
    setSettings(settingsWithTimestamp);
    setShowSettings(false);

    // 4. Calculate Timer Adjustments (Logic unchanged)
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
        const payload = {
          settings: settingsWithTimestamp, // <--- Send stamped settings
          timerState: {
            isActive: true,
            targetEndTime: newTargetEndTime,
            mode: mode,
            timeLeft: newTimeLeft,
            lastUpdated: Date.now()
          }
        };
        lastRemoteUpdate.current = payload.timerState.lastUpdated;

        await setDoc(doc(db, "users", user.uid), payload, { merge: true });

        // --- PIGGYBACK STATS (Live Updates) ---
        const todayStats = Storage.getTodayStats();
        const fullHistory = Storage.getFullHistory();
        const currentStreak = Storage.calculateStreak(fullHistory);

        await setDoc(doc(db, "publicProfiles", user.uid), {
          timerState: payload.timerState,
          lastActive: Date.now(),
          todayFocusTime: todayStats.dailyFocusTime || 0,
          streak: currentStreak
        }, { merge: true });
      }

    } else {
      // --- B. TIMER IS PAUSED ---
      const newDurationSeconds = newSettings[mode] * 60;
      setTimeLeft(newDurationSeconds);
      endTimeRef.current = null;

      if (user) {
        const payload = {
          settings: settingsWithTimestamp, // <--- Send stamped settings
          timerState: {
            isActive: false,
            targetEndTime: null,
            mode: mode,
            timeLeft: newDurationSeconds,
            lastUpdated: Date.now()
          }
        };
        lastRemoteUpdate.current = payload.timerState.lastUpdated;

        await setDoc(doc(db, "users", user.uid), payload, { merge: true });

        // --- PIGGYBACK STATS (Live Updates) ---
        const todayStats = Storage.getTodayStats();
        const fullHistory = Storage.getFullHistory();
        const currentStreak = Storage.calculateStreak(fullHistory);

        await setDoc(doc(db, "publicProfiles", user.uid), {
          timerState: payload.timerState,
          lastActive: Date.now(),
          todayFocusTime: todayStats.dailyFocusTime || 0,
          streak: currentStreak
        }, { merge: true });
      }
    }
  };

  const handleBackgroundChange = (bgSrc) => {
    // 1. Prepare New Settings with Timestamp
    // We must stamp this so the app knows this is the "Latest Version"
    const newSettings = {
      ...settings,
      background: bgSrc,
      updatedAt: Date.now()
    };

    // 2. Save to Local Storage IMMEDIATELY
    // This ensures that if they reload 1 second later, the background persists.
    Storage.saveSettingsLocally(newSettings);

    // 3. Update React State (Visuals)
    setSettings(newSettings);

    // 4. (Optional) Force a Cloud Sync if you want it to happen instantly
    // The existing 'useEffect' will catch this state change and sync to Firebase 
    // automatically in ~1 second, so we don't strictly need to force it here.
  };
  const handleAddCustomBackground = (newBg) => { setCustomBackgrounds(prev => [...prev, newBg]); };
  const handleDeleteCustomBackground = (bgId) => { const bgToDelete = customBackgrounds.find(b => b.id === bgId); if (bgToDelete && settings.background === bgToDelete.src) { setSettings(prev => ({ ...prev, background: '' })); } setCustomBackgrounds(prev => prev.filter(bg => bg.id !== bgId)); };
  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  useEffect(() => {
    // 1. Define your icons here
    const modeIcons = {
      focus: '🎯',      // Focus
      shortBreak: '🧘', // Short Break
      longBreak: '🧘'   // Long Break
    };

    if (isActive) {
      // 2. Get the icon based on current mode
      const icon = modeIcons[mode] || '';

      // 3. Update title: "⚡ 24:59 | altimer"
      document.title = `${icon} ${formatTime(timeLeft)} | altimer`;
    } else {
      // Optional: You could show "⏸️ Paused" or just the app name
      document.title = "altimer";
    }

    return () => {
      document.title = "altimer";
    };
  }, [timeLeft, isActive, mode]);

  const dashboardFriends = friends.filter(f => f.isOnline || f.isPinned);
  const isSessionInProgress = timeLeft !== settings.focus * 60;
  const isStrictLocked = strictMode && mode === 'focus' && isSessionInProgress;

  return (
    <div className="h-[100dvh] md:min-h-screen bg-black text-white flex flex-col md:block relative overflow-hidden">
      <GlobalStyles />
      {settings.background && (
        isVideo(settings.background) ? (
          <div className="fixed inset-0 z-0 overflow-hidden">
            <video
              src={settings.background}
              autoPlay loop muted playsInline disablePictureInPicture
              // Fixes:
              // 1. brightness/contrast: Fixes Chrome's washed-out colors to match Firefox
              // 2. translateZ: Forces GPU layer to prevent flickering
              style={{
                filter: 'brightness(0.9) contrast(1.1)',
                transform: 'translateZ(0)'
              }}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000"
            style={{ backgroundImage: `url(${settings.background})` }}
          />
        )
      )}

      {/* 2. OVERLAY LAYER (z-1) */}
      {/* We use an inline style for background to ensure the browser paints the alpha channel correctly */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none transition-colors duration-1000 ease-in-out"
        style={{
          backgroundColor: focusMode
            ? 'rgba(0, 0, 0, 0.5)'  // Focus Mode (Brighter)
            : 'rgba(0, 0, 0, 0.55)' // Default (Darker - increased slightly for Chrome)
        }}
      />
      {!settings.background && (<div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-0" />)}

      {/* --- ONBOARDING FLOW (Step 0 & 1) --- */}
      {onboardingStep < 3 && (
        <OnboardingFlow
          db={db}
          auth={auth}
          provider={provider}
          user={user}
          isMigrating={isMigrating}
          onComplete={() => setOnboardingStep(3)}
        />
      )}

      {/* --- STEP 1: HANDLE ONBOARDING (FIXED ALIGNMENT & REDIRECT) --- */}
      {onboardingStep < 3 && (
        <OnboardingFlow
          db={db}
          auth={auth}
          provider={provider}
          user={user}
          isMigrating={isMigrating}
          onComplete={() => setOnboardingStep(3)} // This transitions to Dashboard
        />
      )}

      {/* --- MAIN DASHBOARD (Responsive Redesign) --- */}
      <div className={`h-full w-full flex flex-col md:block transition-all duration-1500 ease-out ${onboardingStep === 3 ? 'opacity-100 delay-200' : 'opacity-0'}`}>

        {/* --- MOBILE HEADER: Logo & Settings --- */}
        <div className={`md:hidden flex justify-between items-center w-full p-6 z-20 flex-shrink-0 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>
          <div className="flex items-center gap-2">
            <RevealLogo src="/logo/altimerwhite.png" className="w-10 h-10" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMusic(true)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isMusicPlaying ? 'text-white animate-pulse' : 'text-white'}`}>
              <Music size={22} />
            </button>
            <button onClick={() => setShowFriends(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <Users size={22} />
            </button>

            {/* --- FIXED: Removed overflow-hidden so the ring shows --- */}
            <button
              onClick={() => setIsUnifiedModalOpen(true)}
              className="relative ml-2 w-8 h-8"
            >
              <Avatar photoURL={user?.photoURL} name={user?.displayName} size="full" isPro={isPro} />
            </button>

          </div>
        </div>

        {/* --- DESKTOP HEADER: Settings & Stats --- */}
        <div className={`hidden md:flex flex-col items-end absolute top-8 right-12 z-20 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>
          <div className="flex items-center gap-4">

            {/* 2. PROFILE ICON (Opens Unified Modal) */}
            {/* --- FIXED: Removed overflow-hidden so the ring shows --- */}
            <button
              onClick={() => setIsUnifiedModalOpen(true)}
              className="relative group w-9 h-9 transition-transform hover:scale-105 active:scale-95"
            >
              <Avatar photoURL={user?.photoURL} name={user?.displayName} size="full" isPro={isPro} />
            </button>

          </div>
        </div>

        {/* --- DESKTOP FOOTER LEFT: DOCK & FRIENDS --- */}
        <div className={`hidden md:flex flex-col items-start absolute bottom-8 left-12 z-50 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>

          {/* Live Friend Indicators (Above the Dock) */}
          {dashboardFriends.length > 0 && (
            <div className="flex flex-col gap-2 mb-4 items-start pl-1">
              {dashboardFriends.map(f => (
                <button
                  key={f.uid}
                  onClick={() => handleViewFriendStats(f)}
                  className="group flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full animate-fade-in-up hover:bg-white/10 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${f.isOnline ? (f.isActive ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-yellow-500') : 'bg-gray-500'}`} />
                  <span className="text-xs font-medium text-white flex items-center gap-1">
                    {f.displayName}
                    {f.isPinned && <Pin size={10} className="text-white/50 fill-white/50" />}
                  </span>
                  <span className="text-xs text-white/50 overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] max-w-0 opacity-0 -ml-1 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-0 group-hover:border-l group-hover:border-white/10 group-hover:pl-2">
                    {f.statusText}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* THE DYNAMIC DOCK (With Bending Dividers) */}
          <motion.div
            layout
            onMouseLeave={() => setHoveredDockIndex(null)} // Reset when leaving entire dock
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex items-center gap-0 p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl"
          >

            {/* 1. FRIENDS BUTTON (Index 0) */}
            <motion.button
              layout
              onMouseEnter={() => setHoveredDockIndex(0)}
              onClick={() => setShowFriends(true)}
              className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white group flex items-center"
            >
              <Users size={20} />
              <motion.span layout className="text-sm font-medium overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
                Friends
              </motion.span>
            </motion.button>

            {/* DIVIDER 1 (Between 0 and 1) */}
            <BendingDivider
              activeSide={hoveredDockIndex === 0 ? 'left' : hoveredDockIndex === 1 ? 'right' : null}
              isDimmed={isMusicPlaying}
            />

            {/* 2. MUSIC BUTTON (Index 1) */}
            <motion.div
              layout
              role="button"
              onMouseEnter={() => setHoveredDockIndex(1)}
              onClick={() => setShowMusic(true)}
              className={`relative p-2 rounded-full transition-colors group flex items-center ${isMusicPlaying ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <Music size={20} className={isMusicPlaying ? 'animate-[spin_3s_linear_infinite]' : ''} />

              <motion.div layout className="flex items-center overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
                {isMusicPlaying ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePauseMusic(); }}
                    className="ml-2 px-2 py-0.5 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200"
                  >
                    <Pause size={10} fill="black" />
                  </button>
                ) : (
                  <span className="text-sm font-medium ml-2">Music</span>
                )}
              </motion.div>
            </motion.div>

            {/* DIVIDER 2 (Between 1 and 2) */}
            <BendingDivider
              // 4. UPDATE THIS CONDITION
              // Checks if hovered OR if menu is locked open
              activeSide={hoveredDockIndex === 1 ? 'left' : (hoveredDockIndex === 2 || isStrictMenuOpen) ? 'right' : null}
              isDimmed={isMusicPlaying || strictMode}
            />

            {/* 3. STRICT MODE BUTTON (Index 2) */}
            <LiquidStrictBtn
              isStrict={strictMode}
              onEnable={enableStrictMode}
              onDisable={handleStrictDisable}
              onMouseEnter={() => setHoveredDockIndex(2)}
              isLocked={isStrictLocked}
              isExtensionConnected={isExtensionConnected}
              mode={mode}
              onMenuChange={setIsStrictMenuOpen}
            />

            {/* DIVIDER 3 (Between Strict and Caffeine) */}
            <BendingDivider
              activeSide={
                // Left neighbor: Strict Mode (Index 2)
                (hoveredDockIndex === 2 || isStrictMenuOpen) ? 'left'
                  // Right neighbor: Caffeine (Index 3) - FIXED INDEX CHECK
                  : (hoveredDockIndex === 3) ? 'right'
                    : null
              }
              isDimmed={strictMode}
            />

            {/* 4. CAFFEINE TRACKER (Index 3 - FIXED) */}
            <motion.button
              layout
              onMouseEnter={() => setHoveredDockIndex(3)} // <--- FIXED: WAS 4, NOW 3
              onClick={() => setShowCaffeine(true)}
              className={`relative p-2 rounded-full transition-colors group flex items-center ${showCaffeine ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <Coffee size={20} className={showCaffeine ? 'text-yellow-400' : ''} />
              <motion.span
                layout
                className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] 
                  ${showCaffeine ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2'}
                `}
              >
                Caffeine
              </motion.span>
            </motion.button>

          </motion.div>
        </div>

        {/* --- DESKTOP LOGO (Changed) --- */}
        <div className={`hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-1000 ease-out delay-500 ${onboardingStep === 3 ? uiOpacityClass : 'opacity-0 pointer-events-none'}`}>
          <RevealLogo src="/logo/altimerwhite.png" className="w-14 h-14" />
        </div>


        {/* --- TIMER SECTION (Main) --- */}

        <main className="flex-1 flex flex-col items-center justify-center min-h-0 w-full px-4 pt-16 pb-40 md:pb-0 relative md:absolute md:inset-0 z-10 md:pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center animate-fade-in-up w-full max-w-full relative">

            {/* --- MODE SWITCHER (Updated with Inline Edit & Centered Text) --- */}
            <div className="flex items-center justify-center mb-2 h-10 w-full max-w-md">
              {[{ id: 'focus', label: 'Focus' }, { id: 'shortBreak', label: 'Short Break' }, { id: 'longBreak', label: 'Long Break' }].map((m) => {
                const isCurrent = mode === m.id;
                const isEditing = editingModeId === m.id; // Check if this pill is being edited

                // ELON LOGIC: Restrict breaks
                const isElonRestricted = activePersonality === 'elon' && m.id !== 'focus';
                const isRejecting = elonRejectId === m.id;

                const totalSeconds = settings[m.id] * 60;
                const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

                let containerClass = `relative h-full rounded-full transition-all overflow-hidden flex items-center justify-center whitespace-nowrap min-w-0 `;

                if (isActive) {
                  // Timer Running State
                  if (isCurrent) { containerClass += "flex-[100] bg-white/10 mx-0 cursor-default border border-transparent duration-1000 ease-in-out"; }
                  else { containerClass += "flex-[0.001] px-0 mx-0 opacity-0 border border-transparent duration-1000 ease-in-out"; }
                } else {
                  // Timer Stopped State
                  containerClass += "flex-1 mx-1 md:mx-1.5 duration-300 ease-out ";

                  if (isCurrent) {
                    containerClass += "bg-white text-black font-medium border border-white cursor-default group "; // Added 'group' for hover effects
                  } else if (isElonRestricted) {
                    containerClass += "bg-transparent text-white/20 border border-transparent cursor-not-allowed grayscale ";
                  } else {
                    containerClass += "bg-transparent text-white/50 border border-transparent hover:border-white/20 hover:text-white cursor-pointer ";
                  }
                }

                return (
                  <motion.button
                    key={m.id}
                    layout
                    onClick={(e) => {
                      e.stopPropagation();

                      // 1. ELON REJECTION LOGIC
                      if (isElonRestricted) {
                        setElonRejectId(m.id);
                        setTimeout(() => setElonRejectId(null), 600);
                        return;
                      }

                      // 2. INLINE EDIT LOGIC (Only if timer stopped)
                      if (!isActive) {
                        if (isCurrent) {
                          // Already active? Enter Edit Mode
                          setEditInputValue(settings[m.id].toString());
                          setEditingModeId(m.id);
                        } else {
                          // Not active? Switch Mode
                          handleModeChange(m.id);
                        }
                      }
                    }}
                    className={containerClass}
                    disabled={isActive && !isRejecting}

                    // REJECTION ANIMATION
                    animate={isRejecting ? {
                      x: [0, -5, 5, -5, 5, 0],
                      boxShadow: [
                        "0px 0px 0px 0px rgba(168, 85, 247, 0)",
                        "0px 0px 20px 2px rgba(168, 85, 247, 0.6)",
                        "0px 0px 0px 0px rgba(168, 85, 247, 0)"
                      ],
                      borderColor: [
                        "rgba(255,255,255,0)",
                        "rgba(168, 85, 247, 0.8)",
                        "rgba(255,255,255,0)"
                      ]
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Progress Bar Background */}
                    <div className={`absolute inset-y-0 left-0 bg-white transition-all duration-1000 ease-linear will-change-[width] ${isActive && isCurrent ? 'opacity-100' : 'opacity-0'}`} style={{ width: `${isActive && isCurrent ? progress : 0}%` }} />

                    {/* CONTENT: Either Input or Label */}
                    {isEditing ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-20 flex items-center justify-center w-full h-full"
                      >
                        <input
                          autoFocus
                          type="number"
                          min="1"
                          max="120"
                          // FIXED: Hides spinners on Chrome/Safari/Firefox
                          className="bg-transparent border-none outline-none text-center font-bold text-black w-12 p-0 m-0 focus:ring-0 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={editInputValue}
                          onChange={(e) => setEditInputValue(e.target.value)}
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitInlineEdit();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingModeId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs font-medium text-black/50 ml-0.5">m</span>
                      </motion.div>
                    ) : (
                      // LABEL CONTAINER
                      <span className={`relative z-10 font-medium flex items-center justify-center gap-1 ${isCurrent ? 'mix-blend-difference text-white' : ''}`}>

                        {/* 1. LOCK ICON */}
                        {isElonRestricted && <Lock size={10} className={isRejecting ? "text-purple-400" : "text-white/20"} />}

                        {/* 2. THE LABEL */}
                        <span className="whitespace-nowrap">{m.label}</span>

                        {/* 3. EDIT ICON (Sliding Reveal) */}
                        {!isActive && isCurrent && (
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
            {/* --- CYCLE TALLY INDICATOR (Updated) --- */}
            <div
              className="flex items-center justify-center gap-3 mb-2 h-8 cursor-default min-w-[100px]"
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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md"
                >
                  <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Intervals:</span>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    max="16"
                    // FIXED: Hides spinners here too
                    className="bg-transparent border-none outline-none text-center font-bold text-white w-8 p-0 m-0 focus:ring-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={sessionEditValue}
                    onChange={(e) => setSessionEditValue(e.target.value)}
                    onBlur={commitSessionEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitSessionEdit();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsEditingSessions(false);
                      }
                    }}
                  />
                </motion.div>
              ) : (
                // ... (Existing Tally Dots Rendering Logic remains unchanged) ...
                Array.from({ length: settings.pomosBeforeLongBreak }).map((_, i) => {
                  // ... copy your existing map content for dots here ...
                  const isCompleted = i < pomoCount;
                  const isCurrent = i === pomoCount;
                  const shouldExpand = isCurrent && isTallyHovered;
                  return (
                    <div key={i} className={`relative rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${shouldExpand ? 'w-16 h-7 bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : (isCompleted || isCurrent) ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/20'}`}>
                      {isCurrent && (<span className={`absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-black whitespace-nowrap leading-none transition-all duration-300 ${shouldExpand ? 'opacity-100 scale-100 delay-75' : 'opacity-0 scale-50'}`}>{i + 1} / {settings.pomosBeforeLongBreak}</span>)}
                    </div>
                  );
                })
              )}
            </div>

            {/* --- TIMER --- */}
            <div className="font-clock text-[20vw] md:text-[10rem] lg:text-[12rem] leading-none tracking-normal select-none tabular-nums text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {formatTime(timeLeft)}
            </div>

            {/* --- CONTROLS --- */}
            <div className="flex items-center gap-6 mt-8 md:mt-10 w-full justify-center z-50">
              <button ref={playBtnRef} onClick={toggleTimer} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_0_40px_rgba(255,255,255,0.2)] md:hover:scale-110 md:shadow-[0_0_40px_rgba(255,255,255,0.1)]">
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

            <ExtraTimePopup visible={extraFocusPopup.visible} minutes={extraFocusPopup.minutes} />

            <GameCenter
              mode={mode}
              timeLeft={timeLeft}
              background={settings.background}
              isPro={isPro}
              onOpenPro={() => setProModalSource('arcade')} // Pass 'arcade' source
            />

            <PersonalitiesCenter
              mode={mode}
              isPro={isPro}
              onOpenPro={() => setProModalSource('personalities')}
              // --- ADD THESE TWO LINES: ---
              activePersonality={activePersonality}
              onSelectPersonality={handleSelectPersonality}
            />

          </div>
        </main>

        {/* --- STICKY NOTE WIDGET CONTAINER --- */}
        {/* Find the div wrapping StickyNoteWidget */}
        <div className={`
    w-full flex justify-center z-20 transition-all duration-700 ease-in-out 
    md:absolute md:top-8 md:left-12 md:w-auto md:justify-start
    md:transition-opacity md:duration-700 md:ease-in-out 
    ${onboardingStep === 3
            ? uiOpacityClass // <--- SIMPLIFIED: Just use the global tracker
            : 'opacity-0 pointer-events-none'
          }
`}>
          <StickyNoteWidget
            notes={notes}
            onOpenLibrary={() => setIsNoteLibraryOpen(true)}
            isLibraryOpen={isNoteLibraryOpen} // Kept for logic within widget
            onSave={handleSaveNote}
          />
        </div>
      </div >

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
        onOpenPro={() => setProModalSource('settings')}
      />

      <FriendProfileModal
        isOpen={showStats} // Using showStats state to trigger this
        onClose={() => {
          setShowStats(false);
          setViewingFriendStats(null);
        }}
        friend={viewingFriendStats}
      />


      <MiniLofiPlayer isPlaying={isLofiPlaying} onToggle={toggleLofi} volume={volume} />
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
        isLofiPlaying={isLofiPlaying}
        onToggleLofi={toggleLofi}

        // --- NEW PROPS ---
        isPro={isPro}
        unlockedAmbiences={unlockedAmbiences}
        ambienceSetupDone={ambienceSetupDone}
        onSaveAmbienceSelection={handleSaveAmbienceSelection}
        onOpenPro={() => setProModalSource('ambience')}
        onStopAllAmbience={stopAllAmbience}
      // -----------------
      />
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

      <CaffeineTracker
        isOpen={showCaffeine}
        onClose={() => setShowCaffeine(false)}
      />

      <SocialModal
        isOpen={showFriends}
        onClose={() => {
          setShowFriends(false);
          setSocialView('list');
        }}
        initialView={socialView}
        user={user}
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
      />

      <NoteSystemModals
        notes={notes}
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
    </div >
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}