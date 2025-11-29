import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, X, Plus, Music, SkipForward, SkipBack, Check, Trash2, BarChart2, Zap, Coffee, Flame, CheckSquare, Clock, Sparkles, Loader2, RotateCw, GripVertical, ArrowRight, Pencil, LogIn, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, UserPlus, Circle, Pin, UserMinus, Maximize, Minimize, AlertTriangle, ShieldAlert, Lock, Unlock, Volume2, Bold, Italic, List, StickyNote as StickyNoteIcon, VolumeX, LogOut, GripHorizontal } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously, } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot, Timestamp, collection, query, where, getDocs, orderBy, getDoc, limit, deleteDoc, increment } from "firebase/firestore";
import { AnimatePresence, motion, useDragControls } from 'framer-motion';

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

const BACKGROUND_OPTIONS = [
  { id: 'canyonnight', src: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?q=80&w=1920&auto=format&fit=crop' },

  { id: 'greenforest', src: 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },

  { id: 'mars', src: 'https://cdn.pixabay.com/video/2021/02/13/65129-512069341_medium.mp4' },
  { id: 'earth', src: 'https://images.unsplash.com/photo-1534996858221-380b92700493?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'noensunset', src: 'https://cdn.pixabay.com/video/2020/04/13/35889-407193331_large.mp4' },
  { id: 'lightinthefall', src: 'https://cdn.pixabay.com/video/2022/08/10/127433-738466676_medium.mp4' },
];

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

const isYesterday = (d1, d2) => {
  const yesterday = new Date(d2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d1, yesterday);
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@700&display=swap');
    @import url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/css/dseg.min.css');
    
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

const SpinningLogo = ({ src, className }) => {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleMouseEnter = () => {
    if (!isSpinning) {
      setIsSpinning(true);
    }
  };

  return (
    <img
      src={src}
      alt="Zen Logo"
      className={`${className} ${isSpinning ? 'logo-spin-active' : ''}`}
      onMouseEnter={handleMouseEnter}
      onAnimationEnd={() => setIsSpinning(false)}
    />
  );
};

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex justify-between items-center w-full group">
    <span className="text-sm text-white/70 group-hover:text-white transition-colors">{label}</span>
    <div className={`toggle-switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <div className="toggle-knob"></div>
    </div>
  </div>
);

const StaggeredText = ({ text, className, delayStart = 0 }) => {
  const words = text.split(" ");
  return (
    <span className={`inline-flex flex-wrap justify-center gap-x-2 ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="word-animate" style={{ animationDelay: `${delayStart + (i * 0.15)}s` }}>{word}</span>
      ))}
    </span>
  );
};



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

// Helper Component for consistent avatars
// 1. IMPROVED AVATAR COMPONENT (With Referrer Fix)
const Avatar = ({ photoURL, name, size = "md", isPinned = false, isPro = false }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => { setImageError(false); }, [photoURL]);

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    full: "w-full h-full"
  };

  return (
    // Added 'group' to container for potential hover effects
    <div className={`relative flex-shrink-0 ${sizeClasses[size]} select-none group`}>

      {/* --- PRO GLOW EFFECT (Layer 0) --- */}
      {/* 1. -inset-1: Pushes the ring 4px outside the image.
          2. blur-sm: Softens the edges for a "glow" look. 
          3. animate-[spin_3s...]: Rotates the gradient.
      */}
      {isPro && (
        <div className="absolute -inset-1 rounded-full overflow-hidden z-0">
          <div className="w-full h-full animate-[spin_3s_linear_infinite] rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, #FDE047 180deg, transparent 360deg)',
              opacity: 0.8
            }}
          />
        </div>
      )}

      {/* --- MAIN IMAGE CONTAINER (Layer 10) --- */}
      {/* Z-10 ensures image sits ON TOP of the glow */}
      <div className={`relative z-10 w-full h-full rounded-full overflow-hidden bg-[#111] ${isPro ? 'border-2 border-transparent bg-clip-padding' : 'border border-white/10'}`}>
        {photoURL && !imageError ? (
          <img
            src={photoURL}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-white/80 uppercase">
            {name ? name.charAt(0) : '?'}
          </div>
        )}
      </div>

      {/* --- PIN INDICATOR (Layer 20) --- */}
      {isPinned && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center border border-black shadow-sm z-20">
          <Pin size={8} className="text-black fill-black" />
        </div>
      )}
    </div>
  );
};

// 1. Accept 'user' prop
const ProCelebrationModal = ({ isPro, user }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isPro) {
      const hasSeenCelebration = localStorage.getItem('zen_pro_celebration_seen');
      if (!hasSeenCelebration) {
        const timer = setTimeout(() => setIsOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isPro]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('zen_pro_celebration_seen', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
            className="relative w-full max-w-sm p-8 bg-[#0a0a0a] border border-yellow-500/30 rounded-3xl text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-yellow-500/10 blur-[50px] pointer-events-none" />

            {/* --- UPDATED ICON: USER PROFILE PIC --- */}
            <div className="relative z-10 w-24 h-24 mx-auto mb-6 rounded-full border-4 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.4)] overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-yellow-500 flex items-center justify-center text-black font-bold text-3xl">
                  {user?.displayName ? user.displayName.charAt(0) : 'P'}
                </div>
              )}
            </div>
            {/* --------------------------------------- */}

            <h2 className="relative z-10 text-3xl font-serif-display text-white mb-2">
              Welcome to <span className="text-yellow-400">Pro</span>
            </h2>

            {/* --- UPDATED TEXT --- */}
            <p className="relative z-10 text-white/60 text-sm mb-8 leading-relaxed px-2">
              Since the owner is your friend, you do get some prowess.
            </p>

            {/* --- UPDATED BUTTON TEXT --- */}
            <button
              onClick={handleDismiss}
              className="relative z-10 w-full py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-sm uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-yellow-500/20"
            >
              Thanks Divyansh
            </button>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Remember to update the prop list: { ..., isPro }
const AccountModal = ({ isOpen, onClose, user, stats, onSignOut, isPro }) => {
  const [activeTab, setActiveTab] = useState('today');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyData, setHistoryData] = useState({});

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            layout
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#111] border border-white/10 rounded-3xl w-[95vw] md:w-full md:max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* LEFT COLUMN */}
            <motion.div layout className="w-full md:w-[320px] border-b md:border-b-0 md:border-r border-white/10 bg-white/5 p-8 flex flex-col items-center justify-center text-center relative">
              <button onClick={onClose} className="absolute top-4 left-4 md:hidden text-white/50 hover:text-white"><X size={20} /></button>

              {/* --- AVATAR WITH PRO RING --- */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 mb-6 relative group">
                <Avatar
                  photoURL={user?.photoURL}
                  name={user?.displayName}
                  size="full"
                  isPro={isPro} // <--- PASSED HERE
                />
                <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
              {/* --------------------------- */}

              <h2 className="text-2xl font-bold text-white mb-1">{user?.displayName || "Guest User"}</h2>
              <p className="text-white/40 text-xs mb-8 font-mono">{user?.email || "No email linked"}</p>

              {/* PRO BADGE (Optional visual reinforcement) */}
              {isPro && (
                <div className="mb-6 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={10} /> PRO MEMBER
                </div>
              )}

              <div className="w-full space-y-3">
                <button onClick={onSignOut} className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 group">
                  <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
                </button>
              </div>
              <div className="mt-auto pt-8 text-white/20 text-[10px] font-mono">MINDGRIND ID: {user?.uid?.slice(0, 8)}...</div>
            </motion.div>

            {/* RIGHT COLUMN (Same as before) */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
              <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                <div className="flex gap-6">
                  <button onClick={() => setActiveTab('today')} className={`text-sm font-medium transition-colors border-b-2 pb-0.5 ${activeTab === 'today' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>Today</button>
                  <button onClick={() => setActiveTab('history')} className={`text-sm font-medium transition-colors border-b-2 pb-0.5 ${activeTab === 'history' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>History</button>
                </div>
                <button onClick={onClose} className="hidden md:block text-white/50 hover:text-white"><X size={20} /></button>
              </div>

              <motion.div layout className="overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'history' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-8"
                  >
                    <CalendarView
                      historyData={getEffectiveHistory()}
                      currentMonth={currentMonth}
                      setCurrentMonth={setCurrentMonth}
                      onSelectDate={setSelectedDate}
                      selectedDate={selectedDate}
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <StatCard label={activeTab === 'today' ? "Focus Time" : "Focus"} value={formatDetailedDuration(finalStats.dailyFocusTime || 0)} icon={Zap} />
                  <StatCard label="Break Time" value={formatDetailedDuration(finalStats.dailyBreakTime || 0)} icon={Coffee} />
                  <StatCard label="Sessions" value={finalStats.dailySessions || 0} icon={Clock} />
                  {activeTab === 'today' && <StatCard label="Current Streak" value={`${finalStats.currentStreak || 0} d`} icon={Flame} />}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
// --- FRIEND PROFILE MODAL (Read Only, No Email, Smooth Transition) ---
const FriendProfileModal = ({ isOpen, onClose, friend }) => {
  const [activeTab, setActiveTab] = useState('today');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyData, setHistoryData] = useState({});
  const [stats, setStats] = useState({ dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0, currentStreak: 0 });

  useEffect(() => {
    if (isOpen && friend) {
      const userDocRef = doc(db, "users", friend.uid);
      const unsubUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStats({
            dailyFocusTime: data.stats?.dailyFocusTime || 0,
            dailyBreakTime: data.stats?.dailyBreakTime || 0,
            dailySessions: data.stats?.dailySessions || 0,
            currentStreak: data.stats?.currentStreak || 0
          });
        }
      });

      if (activeTab === 'history') {
        const historyRef = collection(db, 'users', friend.uid, 'history');
        const q = query(historyRef, orderBy('date', 'desc'));
        getDocs(q).then(snapshot => {
          const data = {};
          snapshot.forEach(doc => { data[doc.id] = doc.data(); });
          setHistoryData(data);
        });
      }
      return () => unsubUser();
    }
  }, [isOpen, friend, activeTab]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            layout
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#111] border border-white/10 rounded-3xl w-[95vw] md:w-full md:max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* LEFT COLUMN: FRIEND PROFILE */}
            <motion.div layout className="w-full md:w-[320px] border-b md:border-b-0 md:border-r border-white/10 bg-white/5 p-8 flex flex-col items-center justify-center text-center relative">
              <button onClick={onClose} className="absolute top-4 left-4 md:hidden text-white/50 hover:text-white"><X size={20} /></button>

              <div className="w-32 h-32 rounded-full p-1 mb-6 relative flex items-center justify-center">
                {/* --- UPDATED AVATAR --- */}
                <Avatar
                  photoURL={friend?.photoURL}
                  name={friend?.displayName}
                  size="full"
                  isPro={friend?.isPro} // <--- READ FROM FRIEND
                />
                {/* ---------------------- */}

                {friend?.isOnline && (
                  <div className="absolute inset-[-6px] rounded-full animate-[spin_8s_linear_infinite] pointer-events-none">
                    <div
                      className={`absolute top-1/2 -right-[1px] w-4 h-4 rounded-full border-2 border-[#111] shadow-[0_0_15px_currentColor] transition-colors ${friend.isActive ? 'bg-green-500 text-green-500' : 'bg-yellow-500 text-yellow-500'}`}
                      style={{ transform: 'translate(50%, -50%)' }}
                    />
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">{friend?.displayName}</h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
                <div className={`w-1.5 h-1.5 rounded-full ${friend?.isOnline ? (friend.isActive ? 'bg-green-500' : 'bg-yellow-500') : 'bg-gray-500'}`} />
                <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">{friend?.statusText || "Offline"}</span>
              </div>
              <div className="mt-auto pt-8 text-white/20 text-[10px] font-mono">FRIEND ID: {friend?.uid?.slice(0, 8)}...</div>
            </motion.div>

            {/* RIGHT COLUMN: STATS */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
              <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                <div className="flex gap-6">
                  <button onClick={() => setActiveTab('today')} className={`text-sm font-medium transition-colors border-b-2 pb-0.5 ${activeTab === 'today' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>Today</button>
                  <button onClick={() => setActiveTab('history')} className={`text-sm font-medium transition-colors border-b-2 pb-0.5 ${activeTab === 'history' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>History</button>
                </div>
                <button onClick={onClose} className="hidden md:block text-white/50 hover:text-white"><X size={20} /></button>
              </div>

              <motion.div layout className="overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'history' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8">
                    <CalendarView historyData={getEffectiveHistory()} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} onSelectDate={setSelectedDate} selectedDate={selectedDate} />
                  </motion.div>
                )}
                <div className={`grid grid-cols-2 gap-4`}>
                  <StatCard label={activeTab === 'today' ? "Focus Time" : "Focus"} value={formatDetailedDuration(finalStats.dailyFocusTime || 0)} icon={Zap} />
                  <StatCard label="Break Time" value={formatDetailedDuration(finalStats.dailyBreakTime || 0)} icon={Coffee} />
                  <StatCard label="Sessions" value={finalStats.dailySessions || 0} icon={Clock} />
                  {activeTab === 'today' && <StatCard label="Current Streak" value={`${finalStats.currentStreak || 0} d`} icon={Flame} />}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
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


const SocialModal = ({ isOpen, onClose, user, friends, onAddFriend, onRemoveFriend, onTogglePin, onViewStats, onSearchUsers }) => {
  // ... (Search logic remains the same) ...
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [rawSearchResults, setRawSearchResults] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSearchText("");
      setRawSearchResults([]);
      setSearchPerformed(false);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchText.trim()) {
        setRawSearchResults([]);
        setSearchPerformed(false);
        return;
      }
      setIsSearching(true);
      const results = await onSearchUsers(searchText);
      setIsSearching(false);
      setRawSearchResults(results);
      setSearchPerformed(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText, onSearchUsers]);

  const filteredSearchResults = rawSearchResults.filter(result =>
    !friends.some(friend => friend.uid === result.uid)
  );

  const handleAddResult = async (email) => {
    const result = await onAddFriend(email);
    if (result.success) {
      setSearchText("");
      setRawSearchResults([]);
      setSearchPerformed(false);
      setSuccessMsg(`Added friend successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const sortedFriends = [...friends].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return 0;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-[95vw] md:w-full md:max-w-md shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar mx-2 md:mx-0 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-white">Friends</h3>
              <button onClick={onClose} className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1 text-white/50 hover:text-white active:text-white/70"><X size={20} /></button>
            </div>

            {/* Search Section */}
            <div className="mb-4 relative">
              <div className="relative z-10">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by Name or Email..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                />
                <div className="absolute right-2 top-2 p-1.5 text-white/30">
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                </div>
              </div>
              {isSearching && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden rounded-b-xl">
                  <motion.div
                    className="h-full bg-white/50"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  />
                </div>
              )}
            </div>

            {successMsg && <p className="text-green-400 text-xs mb-4 ml-1">{successMsg}</p>}

            {searchText && searchPerformed && !isSearching && filteredSearchResults.length === 0 && (
              <div className="mb-6 text-center py-4 border border-white/5 rounded-xl bg-white/5">
                <p className="text-white/40 text-xs">No new users found.</p>
              </div>
            )}

            {filteredSearchResults.length > 0 && (
              <div className="mb-6 animate-fade-in">
                <h4 className="text-xs uppercase tracking-widest text-white/40 mb-2 font-medium">Found Users</h4>
                <div className="flex flex-col gap-2">
                  {filteredSearchResults.map(result => (
                    <div key={result.uid} className="bg-white/10 border border-white/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar photoURL={result.photoURL} name={result.displayName} size="md" />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{result.displayName}</span>
                          <span className="text-[10px] text-white/50">{result.email}</span>
                        </div>
                      </div>
                      <button onClick={() => handleAddResult(result.email)} className="px-3 py-1.5 bg-white text-black text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors tracking-wide">
                        ADD FRIEND
                      </button>
                    </div>
                  ))}
                </div>
                <div className="w-full h-px bg-white/10 my-4"></div>
              </div>
            )}

            {/* Friends List */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs uppercase tracking-widest text-white/40 mb-2 font-medium">Your Circle ({friends.length})</h4>
              {friends.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm">No friends yet. Have you even got any?</div>
              ) : (
                sortedFriends.map((friend) => (
                  <div
                    key={friend.uid}
                    onClick={() => onViewStats(friend)}
                    className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 rounded-xl p-3 flex items-center justify-between transition-all group cursor-pointer relative"
                  >
                    <div className="flex items-center gap-3 pointer-events-none">
                      {/* --- UPDATED AVATAR --- */}
                      <Avatar
                        photoURL={friend.photoURL}
                        name={friend.displayName}
                        size="md"
                        isPinned={friend.isPinned}
                        isPro={friend.isPro} // <--- READ FROM FRIEND OBJECT
                      />
                      {/* ---------------------- */}
                      <div>
                        <div className="text-sm font-medium text-white leading-none mb-1 flex items-center gap-2">
                          {friend.displayName}
                        </div>
                        <div className="text-[10px] text-white/50 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${friend.isOnline ? (friend.isActive ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-yellow-500') : 'bg-gray-600'}`}></span>
                          {friend.statusText}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onTogglePin(friend.uid, friend.isPinned)}
                        className={`p-2 rounded-lg transition-colors ${friend.isPinned ? 'text-white' : 'text-white/20 hover:text-white hover:bg-white/10'}`}
                        title={friend.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin size={16} className={friend.isPinned ? "fill-white" : ""} />
                      </button>
                      <button
                        onClick={() => { if (confirm("Remove this friend?")) onRemoveFriend(friend.uid); }}
                        className="p-2 rounded-lg transition-colors text-white/20 hover:text-red-400 hover:bg-red-500/10"
                        title="Remove Friend"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleCloseAction}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-4 md:p-8 rounded-2xl md:rounded-3xl w-[95vw] md:w-full md:max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] md:max-h-[85vh] no-scrollbar mx-2 md:mx-0" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 md:mb-8"><h3 className="text-xl md:text-2xl font-medium text-white tracking-tight">Settings</h3><button onClick={handleCloseAction} className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center p-2 text-white/50 hover:text-white active:text-white/70 rounded-full hover:bg-white/10 transition-colors"><X size={24} /></button></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6">
                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">Timer Configuration</h4>

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

                <SegmentedToggle id="autoStartBreaks" label="Auto-start Breaks" checked={!!localSettings.autoStartBreaks} onChange={(v) => handleToggle('autoStartBreaks', v)} />
                <SegmentedToggle id="autoStartWork" label="Auto-start Work" checked={!!localSettings.autoStartWork} onChange={(v) => handleToggle('autoStartWork', v)} />

                {user && user.uid === 'cmxtLQPCqkfhkhNQZ04ZlXjCPbV2' && (
                  <>
                    <div className="w-full h-px bg-white/10 my-2"></div>
                    <SegmentedToggle id="devMode" label="Dev Mode (No Stats)" checked={devMode} onChange={setDevMode} />
                  </>
                )}

              </div>

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

                      {/* Active Indicator */}
                      {localSettings.background === bg.src && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="bg-white text-black rounded-full p-1 shadow-lg">
                            <Check size={12} strokeWidth={4} />
                          </div>
                        </div>
                      )}

                      {isVideo(bg.src) && (
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white/90 uppercase tracking-widest border border-white/10 z-10 pointer-events-none">
                          Video
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
            {/* Footer removed as requested previously */}
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



// --- NOTIFICATION SYSTEM ---
const UPDATES = [
  {
    id: 'zen_update_strict_v1', // New Strict Mode notification
    title: "Strict Mode",
    description: "Lock in your focus. Blocks tab switching and fullscreen exits.",
    icon: Unlock,
    color: "text-red-400",
    bg: "bg-red-500/10"
  },
  {
    id: 'stickynotes', // New Strict Mode notification
    title: "Sticky Notes",
    description: "Sticky notes are here to replace task list. Add, tag, format, rearrange them all you like!",
    icon: StickyNoteIcon,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10"
  },
  {
    id: 'lofigirlupdate', // Keeps history consistent
    title: "Lofi Girl is here!",
    description: "Study with Lofi Girl by turning on Music > Lofi Girl",
    icon: Music,
    color: "text-red-400",
    bg: "bg-red-500/10"
  },
];

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

const MUSIC_TRACKS = [

  {
    id: 'lofi',
    title: 'Lofi Study',
    src: 'https://archive.org/download/track1_202511/track1.mp3',
    cover: 'https://i.pinimg.com/736x/9c/76/23/9c7623f7939be1725435bef4dea604f8.jpg'
  },

  {
    id: 'binaural',
    title: 'Binaural Beats',
    src: 'https://archive.org/download/track2_202511/track1.mp3',
    cover: 'https://i.pinimg.com/736x/96/03/ce/9603cee1ddcce4c184587c66532fbc63.jpg'
  },

  {
    id: 'ambient',
    title: 'Deep Focus Ambient',
    src: 'https://archive.org/download/track2_202511/track2.mp3',
    cover: 'https://i.pinimg.com/736x/e2/4e/0d/e24e0d3d5f5f07c562f08a5ebfc4c776.jpg'
  },
];

const MusicModal = ({
  isOpen, onClose,
  currentTrack, isPlaying, onPlay, onPause,
  isLoading, progress, duration, onSeek,
  volume, onVolumeChange,
  isLofiPlaying, onToggleLofi
}) => {
  const [activeTab, setActiveTab] = useState('library');
  const [view, setView] = useState('list');
  const prevVolumeRef = useRef(0.5);

  useEffect(() => {
    if (isOpen && isLofiPlaying) setActiveTab('lofi');
  }, [isOpen, isLofiPlaying]);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolumeRef.current || 0.5);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const totalSeconds = Math.floor(time);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-[90vw] md:w-[26rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              {activeTab === 'library' && view === 'player' ? (
                <button onClick={() => setView('list')} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors flex items-center gap-1">
                  <ChevronLeft size={20} /> <span className="text-xs uppercase tracking-widest">Back</span>
                </button>
              ) : (
                <h3 className="text-xl font-medium text-white flex items-center gap-2"><Music size={20} /> Music</h3>
              )}
              <button onClick={onClose} className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1 text-white/50 hover:text-white active:text-white/70"><X size={20} /></button>
            </div>

            {/* TAB SWITCHER (SLIDING PILL ANIMATION) */}
            <div className="flex bg-white/5 p-1 rounded-full mb-6 flex-shrink-0 relative">
              {['library', 'lofi'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="relative flex-1 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full transition-colors z-0"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-tab-pill"
                        className={`absolute inset-0 rounded-full shadow-lg ${tab === 'lofi' ? 'bg-red-500 shadow-red-500/20' : 'bg-white'
                          }`}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 transition-colors duration-200 ${isActive
                      ? (tab === 'lofi' ? 'text-white' : 'text-black')
                      : 'text-white/40 hover:text-white'
                      }`}>
                      {tab === 'library' ? 'Focus Sounds' : 'Lofi Girl'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* CONTENT AREA */}
            <div className="relative w-full flex-1 min-h-[360px] overflow-hidden">
              <AnimatePresence mode="wait">

                {/* --- TAB 1: LIBRARY --- */}
                {activeTab === 'library' && (
                  <motion.div
                    key="library"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    {view === 'list' ? (
                      <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-4">
                        {MUSIC_TRACKS.map((track) => {
                          const isActive = currentTrack?.id === track.id;
                          return (
                            <div
                              key={track.id}
                              onClick={() => { onPlay(track); setView('player'); }}
                              className={`group flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer ${isActive ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}`}
                            >
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                                {track.cover ? (
                                  <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Music size={16} className="text-white/20" /></div>
                                )}
                                {isActive && isPlaying && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="flex gap-0.5 items-end h-3">
                                      <span className="w-0.5 bg-white h-2 animate-[bounce_0.8s_infinite]"></span>
                                      <span className="w-0.5 bg-white h-3 animate-[bounce_1.1s_infinite]"></span>
                                      <span className="w-0.5 bg-white h-1.5 animate-[bounce_0.9s_infinite]"></span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>{track.title}</h4>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">{isActive && isPlaying ? 'Now Playing' : 'Ambient'}</p>
                              </div>
                              {isActive && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); isPlaying ? onPause() : onPlay(track); }}
                                  className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-all z-10"
                                >
                                  {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // PLAYER VIEW
                      <div className="flex flex-col items-center justify-center text-center h-full">
                        <div className="w-48 h-48 rounded-2xl overflow-hidden mb-6 shadow-2xl border border-white/10 relative group bg-white/5">
                          {currentTrack?.cover ? (
                            <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Music size={48} className="text-white/20" /></div>
                          )}
                        </div>
                        <div className="mb-6 w-full px-4">
                          <h4 className="text-lg font-medium text-white truncate">{currentTrack?.title || "Select a track"}</h4>
                          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Focus Sound</p>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full flex items-center gap-3 mb-6 px-2">
                          <span className="text-[10px] text-white/40 font-mono w-8 text-right">{formatTime(progress)}</span>
                          <div className="flex-1 relative h-6 flex items-center group">
                            <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-white transition-all duration-100 ease-out" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
                            </div>
                            <input type="range" min="0" max={duration || 100} step="0.1" value={progress} onChange={(e) => onSeek(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          </div>
                          <span className="text-[10px] text-white/40 font-mono w-8 text-left">{formatTime(duration)}</span>
                        </div>
                        {/* Controls */}
                        <div className="flex items-center justify-center gap-8 w-full px-4">
                          <button onClick={() => isPlaying ? onPause() : (currentTrack && onPlay(currentTrack))} disabled={!currentTrack} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                            {isLoading ? <Loader2 size={24} className="animate-spin text-black" /> : (isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />)}
                          </button>
                          <div className="flex items-center gap-2 w-28">
                            <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors flex-shrink-0 outline-none" title={volume === 0 ? "Unmute" : "Mute"}>
                              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <div className="flex-1 relative h-6 flex items-center group">
                              <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-white transition-all duration-100 ease-out" style={{ width: `${volume * 100}%` }} />
                              </div>
                              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* --- TAB 2: LOFI GIRL (REMOTE CONTROLLER) --- */}
                {activeTab === 'lofi' && (
                  <motion.div
                    key="lofi"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                  >
                    {/* Visual Indicator (Updated to Red) */}
                    <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 relative overflow-hidden">
                      {/* Simple Pulse Effect */}
                      {isLofiPlaying && (
                        <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                      )}
                      <div className="relative z-10 flex items-center justify-center w-full h-full">
                        <ImageIcon size={32} className="text-red-500" />
                      </div>
                    </div>

                    <h4 className="text-xl font-medium text-white mb-2">Lofi Girl Radio</h4>
                    <p className="text-white/50 text-xs leading-relaxed mb-8 max-w-[200px] mx-auto">
                      Lofi Girl will appear at the bottom right. All hail Lofi Girl!
                    </p>

                    {/* Toggle Button (Updated to Red) */}
                    <button
                      onClick={onToggleLofi}
                      className={`px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 ${isLofiPlaying
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      {isLofiPlaying ? 'Turn Off' : 'Turn On'}
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
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
    return <div className="relative w-40 h-40 md:w-48 md:h-48" />;
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
const RichTextRenderer = ({ text, className = "", onToggle }) => (
  <div className={`font-sans text-black/90 ${className}`}>
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

const LiquidCloseBtn = ({ onClose }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'confirming'

  // Auto-reset if not confirmed within 3 seconds
  useEffect(() => {
    let timer;
    if (status === 'confirming') {
      timer = setTimeout(() => setStatus('idle'), 3000);
    }
    return () => clearTimeout(timer);
  }, [status]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (status === 'idle') {
      setStatus('confirming');
    } else {
      onClose();
    }
  };

  return (
    <motion.button
      layout
      onClick={handleClick}
      initial={false}
      animate={status === 'confirming'
        ? { width: 80, height: 32, borderRadius: 16, backgroundColor: "#b91c1c" } // Darker Red (Red-700) on confirm
        : { width: 32, height: 32, borderRadius: 16, backgroundColor: "#ef4444" } // Bright Red (Red-500) on idle
      }
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute top-2 right-2 border border-white/10 flex items-center justify-center overflow-hidden z-[100] shadow-lg group/btn"
    >
      <AnimatePresence mode="popLayout">
        {status === 'idle' ? (
          <motion.div
            key="icon"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center justify-center"
          >
            <X size={14} className="text-white font-bold" strokeWidth={3} />
          </motion.div>
        ) : (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-1"
          >
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Close?</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// --- APPLE-STYLE SEGMENTED TOGGLE (Defined Outside to fix animation glitches) ---
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

const NoteSystemModals = ({
  notes,
  isLibraryOpen,
  closeLibrary,
  editingNote,
  setEditingNote,
  onSave,
  onDelete,
  onReorder,
  onSaveOrder
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

  // Refs
  const draggingIdRef = useRef(null);
  const containerRef = useRef(null);
  const lastSwapTime = useRef(0);
  const bodyInputRef = useRef(null);
  const tagInputRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

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

  // --- CHECKBOX TOGGLE HANDLER (FOR LIBRARY VIEW) ---
  const handleToggleLine = (note, index, newStatus) => {
    let lines = note.text.split('\n');
    if (lines[index]) {
      const line = lines[index];
      // Toggle [ ] <-> [x]
      const newLine = newStatus
        ? line.replace(/^(\s*)\[ \]/, '$1[x]')
        : line.replace(/^(\s*)\[x\]/i, '$1[ ]');

      lines[index] = newLine;

      // --- AUTO-SORT LOGIC ---
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
      // -------------------------------

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

  // --- SPOTLIGHT EFFECT ---
  const handleGlowMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // --- TAG & SLASH LOGIC ---
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

  // --- MARKDOWN UTILS ---
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

  // --- SLASH COMMANDS ---
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

  // --- NOTE TAP LOGIC ---
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

                {/* ADD BUTTON */}
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
                  </div>
                </motion.div>

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

                          {/* UPDATED: Pass toggle handler for checkboxes */}
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
            <button onClick={closeLibrary} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X size={24} /></button>
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

            <textarea ref={bodyInputRef} value={editorText} onChange={handleBodyChange} onKeyDown={handleBodyKeyDown} placeholder="Write / for commands..." className="relative z-10 w-full flex-1 bg-transparent resize-none border-none outline-none focus:outline-none focus:ring-0 text-black/80 placeholder-black/30 text-base md:text-lg font-medium leading-relaxed font-sans custom-scrollbar p-0 font-mono" />

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

// A visible, compliant mini-player for Desktop
// A visible, compliant mini-player for Desktop
const MiniLofiPlayer = ({ isPlaying, onToggle }) => {
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
          {/* Main Wrapper */}
          <div className="relative w-80 aspect-video shadow-2xl group">

            {/* 1. VIDEO CONTAINER (Clipped) */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20 bg-black">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/jfKfPfyJRdk?si=VOqYg_-rlvqd_dMH&autoplay=1&controls=1&mute=0&loop=1&modestbranding=1"
                title="Lofi Girl Mini"
                frameBorder="0"
                disablePictureInPicture
                // Ensure 'picture-in-picture' is missing from allow list
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              />
            </div>

            {/* 2. LIQUID CLOSE BUTTON (Sitting on top, unclipped) */}
            <LiquidCloseBtn onClose={onToggle} />

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  // ... inside App component

  const handleReorderNotes = (newOrder) => {
    setNotes(newOrder);
  };

  const saveNotesOrder = async (currentNotes) => {
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { notes: currentNotes }, { merge: true });
      } catch (e) { console.error("Reorder failed", e); }
    }
  };

  const handleSaveNote = async (note) => {
    // 1. Check if note exists
    const exists = notes.some(n => n.id === note.id);

    let updatedNotes;

    if (exists) {
      // UPDATE IN PLACE (Preserves Order)
      updatedNotes = notes.map(n => (n.id === note.id ? note : n));
    } else {
      // NEW NOTE (Add to top)
      updatedNotes = [note, ...notes];
    }

    setNotes(updatedNotes);

    // Sync to Firestore
    if (user) {
      await setDoc(doc(db, "users", user.uid), { notes: updatedNotes }, { merge: true });
    }
  };



  const handleDeleteNote = async (noteId) => {
    // Filter out the note to delete
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);

    // Sync to Firestore
    if (user) {
      await setDoc(doc(db, "users", user.uid), { notes: updatedNotes }, { merge: true });
    }
  };
  const [isLofiPlaying, setIsLofiPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [user, setUser] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [greetingText, setGreetingText] = useState(() => { const cachedName = localStorage.getItem('pomodoro_user_name'); return cachedName ? `Welcome back, ${cachedName}` : "Hello, stranger"; });
  const [isDeletingName, setIsDeletingName] = useState(false);
  const [isTypingName, setIsTypingName] = useState(false);
  const [showLoginBtn, setShowLoginBtn] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const DEFAULT_SETTINGS = { focus: 25, shortBreak: 5, longBreak: 15, autoStartBreaks: false, autoStartWork: false, pomosBeforeLongBreak: 4, background: 'https://images.unsplash.com/photo-1534996858221-380b92700493?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' };
  const [initialState] = useState(loadTimerState);
  const [mode, setMode] = useState(initialState?.mode || 'focus');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft || DEFAULT_SETTINGS.focus * 60);
  const [isActive, setIsActive] = useState(initialState?.isActive || false);
  const [sessionName, setSessionName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [notes, setNotes] = useState([]);
  const [isNoteLibraryOpen, setIsNoteLibraryOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // If null -> New Note
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [pomoCount, setPomoCount] = useState(0);
  const [hoveredDockIndex, setHoveredDockIndex] = useState(null);

  const [devMode, setDevMode] = useState(false);
  const [customBackgrounds, setCustomBackgrounds] = useState(() => { try { const saved = localStorage.getItem('zen_custom_bgs'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; } });
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const musicAudioRef = useRef(new Audio());
  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = volume;
    }
  }, [volume]);
  // --- SOCIAL STATE ---
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState([]); // List of friend objects with live status
  const [friendUids, setFriendUids] = useState([]); // Just the IDs for listening
  const [viewingFriendStats, setViewingFriendStats] = useState(null); // User object of friend to view stats for
  const [friendConfig, setFriendConfig] = useState({}); // Stores { uid: { isPinned: true/false } }
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- STRICT MODE STATE & LOGIC ---
  const [strictMode, setStrictMode] = useState(() => localStorage.getItem('zen_strict_mode') === 'true');
  const [showStrictConfirm, setShowStrictConfirm] = useState(false);
  const [showStrictWarning, setShowStrictWarning] = useState(false);
  const [showStrictDisableConfirm, setShowStrictDisableConfirm] = useState(false); // <--- NEW STATE
  const wasMusicPlayingRef = useRef(false);
  const strictModeRef = useRef(strictMode);
  const modeRef = useRef(mode);

  // Keep Refs in sync
  useEffect(() => {
    strictModeRef.current = strictMode;
    localStorage.setItem('zen_strict_mode', strictMode);
  }, [strictMode]);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // The Strict Mode "Trap" Listeners
  useEffect(() => {
    const triggerWarning = () => {
      // Pause Timer
      setIsActive(false);
      // Pause Music if playing
      if (musicAudioRef.current) musicAudioRef.current.pause();
      // Show Warning
      setShowStrictWarning(true);
    };

    const handleVisibilityChange = () => {
      // Trigger ONLY if: Hidden + Strict Mode ON + In Focus Mode
      if (document.hidden && strictModeRef.current && modeRef.current === 'focus') {
        triggerWarning();
      }
    };

    const handleFullscreenChange = () => {
      // Trigger ONLY if: Exited Fullscreen + Strict Mode ON + In Focus Mode
      if (!document.fullscreenElement && strictModeRef.current && modeRef.current === 'focus') {
        triggerWarning();
      }
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Initial check on mount (e.g. reload)
    if (strictMode && mode === 'focus' && onboardingStep === 3 && !document.fullscreenElement) {
      triggerWarning();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []); // Empty dependency array, relies on Refs

  const enableStrictMode = () => {
    setStrictMode(true);
    setShowStrictConfirm(false);
    if (mode === 'focus') {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
    }
  };

  const handleStrictResume = () => {
    document.documentElement.requestFullscreen().catch(e => console.log(e));
    setIsActive(true);

    // RESUME MUSIC (If it was playing before)
    if (wasMusicPlayingRef.current && musicAudioRef.current) {
      musicAudioRef.current.play().catch(e => console.log("Resume music failed", e));
    }

    setShowStrictWarning(false);
  };

  const handleStrictDisable = () => {
    setStrictMode(false);
    setShowStrictWarning(false);
    setShowStrictDisableConfirm(false);

    // INSTANTLY EXIT FULLSCREEN
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log("Exit fullscreen failed", e));
    }
  };

  const unsavedSecondsRef = useRef(0);
  const timerIntervalRef = useRef(null);

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
  const sessionInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const endTimeRef = useRef(null);
  const audioRefs = useRef({});
  const accumulatedTimeRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const prevSettings = useRef(DEFAULT_SETTINGS);
  const prevSessionName = useRef('');
  const lastStatSaveTime = useRef(Date.now());
  const lastRemoteUpdate = useRef(0); // To avoid echoing back remote changes
  const prevNotes = useRef([]);

  const DEFAULT_STATS = {
    dailyFocusTime: 0,
    dailyBreakTime: 0,
    dailySessions: 0,
    currentStreak: 0,
    lastActiveDate: null
  };
  const [stats, setStats] = useState(DEFAULT_STATS);

  // --- FOCUS MODE STATE ---
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const sounds = { 'focus': '/sounds/timer-end.mp3', 'shortBreak': '/sounds/timer-end.mp3', 'longBreak': '/sounds/timer-end.mp3' };
    Object.keys(sounds).forEach(key => { const audio = new Audio(sounds[key]); audio.preload = 'auto'; audio.volume = 1.0; audioRefs.current[key] = audio; });
  }, []);
  useEffect(() => { localStorage.setItem('zen_custom_bgs', JSON.stringify(customBackgrounds)); }, [customBackgrounds]);
  // --- GLOBAL KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyPress = (e) => {
      // 1. Ignore if modifier keys are pressed (Ctrl, Alt, Meta)
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

        // D. Close Note Editor
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

      // O: Edit Session Name
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setIsEditingName(true);
        // Timeout to allow render
        setTimeout(() => {
          const input = document.getElementById('session-name-input');
          if (input) { input.focus(); input.select(); }
        }, 50);
      }
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
    isEditingName, // If you use these inside the handler
  ]);

  const playAlarm = (currentMode) => { const audio = audioRefs.current[currentMode]; if (audio) { audio.currentTime = 0; const playPromise = audio.play(); if (playPromise !== undefined) { playPromise.catch(error => { console.warn("Audio play failed, falling back to beep:", error); fallbackBeep(); }); } } else { fallbackBeep(); } };
  const fallbackBeep = () => { try { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 440; osc.type = 'sine'; gain.gain.value = 0.1; osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1); osc.stop(ctx.currentTime + 1); } } catch (e) { console.error("Audio fallback failed", e); } };


  const flushUnsavedTime = async () => {
    const amount = unsavedSecondsRef.current;
    if (amount === 0 || !user) return;

    // Reset immediately to prevent double-counting
    unsavedSecondsRef.current = 0;

    const userRef = doc(db, "users", user.uid);
    try {
      await setDoc(userRef, {
        stats: {
          // Atomic increment: This adds to the server value safely
          dailyFocusTime: mode === 'focus' ? increment(amount) : increment(0),
          dailyBreakTime: mode !== 'focus' ? increment(amount) : increment(0)
        },
        lastUpdated: new Date()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to sync time:", e);
      // If fail, put the time back in the buffer
      unsavedSecondsRef.current += amount;
    }
  };


  // --- NEW: Sync Timer State Helper ---
  const syncTimerState = async (newState) => {
    if (!user) return;
    const payload = {
      timerState: {
        ...newState,
        lastUpdated: Date.now()
      }
    };
    lastRemoteUpdate.current = payload.timerState.lastUpdated;
    await setDoc(doc(db, "users", user.uid), payload, { merge: true });
  };

  useEffect(() => {
    const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } };
    initAuth();
    const storedName = localStorage.getItem('pomodoro_user_name');
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); setIsAuthChecking(false);
      if (currentUser) {
        const firstName = currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'User';
        localStorage.setItem('pomodoro_user_name', firstName);

        // --- SOCIAL: Ensure email is saved for discovery ---
        if (currentUser.email) {
          await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL
          }, { merge: true });
        }

        if (storedName) { setShowLoginBtn(false); setTimeout(() => { setOnboardingStep(3); }, 2000); } else { if (onboardingStep === 0) { handleNameTransition(firstName); } }
      } else {
        if (storedName) { setGreetingText("Hello, stranger"); setShowLoginBtn(true); localStorage.removeItem('pomodoro_user_name'); } else { setGreetingText("Hello, stranger"); setShowLoginBtn(true); }
        setSessionName(""); setDataLoaded(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- SOCIAL: Friends Logic (UPDATED) ---

  // 1. Listen to my friends list AND their metadata (pinned status)
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

  // 2. Listen to friend profiles and merge with Pin status
  useEffect(() => {
    if (!user || friendUids.length === 0) {
      setFriends([]);
      return;
    }

    const unsubscribers = [];
    const currentFriendsData = {};

    friendUids.forEach(friendId => {
      const unsub = onSnapshot(doc(db, "users", friendId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Process Real-time Status
          let isOnline = false;
          let isActive = false;
          let statusText = "Offline";
          let mode = 'focus';
          let timeLeft = 0;

          if (data.timerState) {
            const now = Date.now();
            const lastUpdated = data.timerState.lastUpdated;
            if (now - lastUpdated < 300000) { // 5 mins
              isOnline = true;
              mode = data.timerState.mode;
              if (data.timerState.isActive) {
                isActive = true;
                const target = data.timerState.targetEndTime;
                timeLeft = Math.max(0, Math.ceil((target - now) / 1000));
                statusText = `${mode === 'focus' ? 'Focusing' : 'Break'} • ${Math.floor(timeLeft / 60)}m`;
              } else {
                statusText = "Paused";
              }
            } else {
              statusText = "Away";
            }
          }

          currentFriendsData[friendId] = {
            uid: friendId,
            displayName: data.displayName || "Unknown Friend",
            email: data.email,
            photoURL: data.photoURL,
            isOnline,
            isActive,
            statusText,
            mode,
            timeLeft,
            // Merge Pinned Status
            isPinned: friendConfig[friendId]?.isPinned || false
          };

          setFriends(Object.values(currentFriendsData));
        }
      });
      unsubscribers.push(unsub);
    });

    // 3. Local Timer for Friends (Countdown smoothly)
    const interval = setInterval(() => {
      setFriends(prevFriends => {
        return prevFriends.map(f => {
          if (f.isActive && f.timeLeft > 0) {
            const newTime = f.timeLeft - 1;
            const mins = Math.floor(newTime / 60);
            const secs = newTime % 60;
            const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
            return {
              ...f,
              timeLeft: Math.max(0, newTime),
              statusText: `${f.mode === 'focus' ? 'Focusing' : 'Break'} • ${timeString}`
            };
          }
          return f;
        });
      });
    }, 1000);

    return () => {
      unsubscribers.forEach(u => u());
      clearInterval(interval);
    };
  }, [user, friendUids, friendConfig]);

  // REPLACE your existing handleAddFriend function with this:

  const handleAddFriend = async (email) => {
    if (!user) return { success: false, error: "Not logged in" };

    // 1. Sanitize input: remove spaces and force lowercase
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return { success: false, error: "Please enter an email" };

    try {
      console.log(`Searching for user with email: "${cleanEmail}"`); // Debug log

      // 2. Query the users collection
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", cleanEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn("Query returned no results.");
        return { success: false, error: "User not found. Ask them to log in again to sync their email." };
      }

      const friendDoc = snapshot.docs[0];
      const friendId = friendDoc.id;

      // 3. Prevent adding yourself
      if (friendId === user.uid) {
        return { success: false, error: "You can't add yourself as a friend." };
      }

      // 4. Check if already friends (Optional check to prevent overwriting/redundancy)
      const friendRef = doc(db, "users", user.uid, "friends", friendId);
      const friendSnap = await getDoc(friendRef);
      if (friendSnap.exists()) {
        return { success: false, error: "User is already in your friends list." };
      }

      // 5. Add to friends collection
      await setDoc(friendRef, {
        addedAt: Date.now()
      });

      return { success: true };
    } catch (e) {
      console.error("Add Friend Error:", e);
      // Check specifically for permission errors
      if (e.code === 'permission-denied') {
        return { success: false, error: "Database permission denied. Check Firestore Rules." };
      }
      return { success: false, error: "Error adding friend. See console for details." };
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "friends", friendId));
    } catch (e) {
      console.error("Error removing friend", e);
    }
  };
  const handleViewFriendStats = (friend) => {
    setViewingFriendStats(friend);
    setShowStats(true);
    setShowFriends(false);
  };
  // --- NEW: Toggle Pin Function ---
  const handleTogglePin = async (friendId, currentStatus) => {
    if (!user) return;
    const friendRef = doc(db, "users", user.uid, "friends", friendId);
    await setDoc(friendRef, { isPinned: !currentStatus }, { merge: true });
  };

  // --- UPDATED: Robust Search (Name Casing + Email Prefix) ---
  const handleSearchUsers = useCallback(async (queryText) => {
    if (!queryText) return [];
    const term = queryText.trim();

    const termLower = term.toLowerCase();
    const termUpper = term.toUpperCase();
    const termCapitalized = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();

    const usersRef = collection(db, "users");
    const resultsMap = new Map();

    const queries = [];

    // 1. Email Search
    queries.push(query(usersRef,
      where("email", ">=", termLower),
      where("email", "<=", termLower + '\uf8ff'),
      limit(5)
    ));

    // 2. Name Search: As Typed
    queries.push(query(usersRef,
      where("displayName", ">=", term),
      where("displayName", "<=", term + '\uf8ff'),
      limit(5)
    ));

    // 3. Name Search: ALL CAPS
    if (term !== termUpper) {
      queries.push(query(usersRef,
        where("displayName", ">=", termUpper),
        where("displayName", "<=", termUpper + '\uf8ff'),
        limit(5)
      ));
    }

    // 4. Name Search: Capitalized
    if (term !== termCapitalized && termCapitalized !== termUpper) {
      queries.push(query(usersRef,
        where("displayName", ">=", termCapitalized),
        where("displayName", "<=", termCapitalized + '\uf8ff'),
        limit(5)
      ));
    }

    try {
      const snapshots = await Promise.all(queries.map(q => getDocs(q)));

      snapshots.forEach(snap => {
        snap.forEach(doc => {
          if (doc.id !== user.uid) {
            resultsMap.set(doc.id, { uid: doc.id, ...doc.data() });
          }
        });
      });

      return Array.from(resultsMap.values());

    } catch (e) {
      console.error("Search error", e);
      return [];
    }
  }, [user]); // <--- Dependency ensures function stays stable unless user changes

  // --- End Social Logic ---

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // --- 1. PRO STATUS CHECK ---
          const userIsPro = data.subscription?.plan === 'pro';
          setIsPro(userIsPro);
          // ---------------------------

          // 2. LOAD NOTES
          let loadedNotes = data.notes || [];
          setNotes(loadedNotes);

          // 3. SYNC TIMER LOGIC
          if (data.timerState) {
            const remote = data.timerState;
            if (remote.lastUpdated > lastRemoteUpdate.current) {
              lastRemoteUpdate.current = remote.lastUpdated;
              setMode(remote.mode);
              setSessionName(remote.sessionName);

              if (remote.isActive) {
                const now = Date.now();
                const target = remote.targetEndTime;
                const remaining = Math.max(0, Math.ceil((target - now) / 1000));

                if (remaining > 0) {
                  setTimeLeft(remaining);
                  setIsActive(true);
                  endTimeRef.current = target;
                } else {
                  setIsActive(false);
                  setTimeLeft(0);
                  endTimeRef.current = null;
                }
              } else {
                setIsActive(false);
                setTimeLeft(remote.timeLeft);
                endTimeRef.current = null;
              }
            }
          }

          // 4. STATS & DAILY RESET LOGIC
          const loadedStats = { ...DEFAULT_STATS, ...(data.stats || {}) };
          const today = new Date();
          let currentStreak = loadedStats.currentStreak;
          let lastActiveDate = loadedStats.lastActiveDate ? (loadedStats.lastActiveDate.toDate ? loadedStats.lastActiveDate.toDate() : new Date(loadedStats.lastActiveDate)) : null;

          let shouldResetDaily = false;

          if (lastActiveDate) {
            if (!isSameDay(lastActiveDate, today)) {
              shouldResetDaily = true;
              if (!isYesterday(today, lastActiveDate)) {
                currentStreak = 0;
              }
            }
          } else {
            shouldResetDaily = true;
            currentStreak = 0;
          }

          if (shouldResetDaily) {
            if (loadedStats.dailyFocusTime > 0) {
              const archiveDate = lastActiveDate || new Date(Date.now() - 86400000);
              const dateId = formatDateId(archiveDate);
              const historyRef = doc(db, "users", user.uid, "history", dateId);
              setDoc(historyRef, { ...loadedStats, date: archiveDate }, { merge: true });
            }
            loadedStats.dailyFocusTime = 0;
            loadedStats.dailyBreakTime = 0;
            loadedStats.dailySessions = 0;
          }

          setStats(prevStats => {
            const newStats = { ...loadedStats, currentStreak };
            if (!shouldResetDaily) {
              if (prevStats.dailyFocusTime > newStats.dailyFocusTime) newStats.dailyFocusTime = prevStats.dailyFocusTime;
              if (prevStats.dailyBreakTime > newStats.dailyBreakTime) newStats.dailyBreakTime = prevStats.dailyBreakTime;
            }
            return newStats;
          });

          // 5. LOAD SETTINGS
          const mergedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
          setSettings(mergedSettings);
          if (data.sessionName && !sessionName) setSessionName(data.sessionName);

          prevSettings.current = mergedSettings;
          prevSessionName.current = data.sessionName || "";

          // Fixed: Update prevNotes ref
          prevNotes.current = loadedNotes;
        }
        setDataLoaded(true);
      });
      return () => unsub();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !dataLoaded) return;

    const isDifferent = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

    // FIXED: Compare 'notes' with 'prevNotes.current'
    const notesChanged = JSON.stringify(notes) !== JSON.stringify(prevNotes.current);
    const hasCriticalChanges = notesChanged || isDifferent(settings, prevSettings.current) || sessionName !== prevSessionName.current;

    const timeSinceLastStatSave = Date.now() - lastStatSaveTime.current;
    const shouldSaveStats = timeSinceLastStatSave > 60000; // Save every minute

    if (hasCriticalChanges || shouldSaveStats) {
      const saveData = async () => {
        const userDocRef = doc(db, "users", user.uid);

        const today = new Date();
        let newStats = { ...stats };
        let lastActiveDate = newStats.lastActiveDate ? (newStats.lastActiveDate.toDate ? newStats.lastActiveDate.toDate() : new Date(newStats.lastActiveDate)) : null;

        if (!lastActiveDate || !isSameDay(lastActiveDate, today)) {
          if (lastActiveDate && isYesterday(today, lastActiveDate)) {
            newStats.currentStreak += 1;
          } else if (!lastActiveDate || !isSameDay(lastActiveDate, today)) {
            newStats.currentStreak = 1;
          }
          newStats.lastActiveDate = today;
          setStats(newStats);
        }

        const payload = {
          notes, // Saving notes
          settings,
          sessionName,
          lastUpdated: today,
          stats: newStats
        };

        await setDoc(userDocRef, payload, { merge: true });

        // FIXED: Update the prevNotes ref
        prevNotes.current = notes;
        prevSettings.current = settings;
        prevSessionName.current = sessionName;

        if (shouldSaveStats) { lastStatSaveTime.current = Date.now(); }
      };
      const handler = setTimeout(saveData, 1000);
      return () => clearTimeout(handler);
    }
  }, [notes, settings, sessionName, user, dataLoaded, stats]);

  useEffect(() => {
    if (!isActive && user && dataLoaded) {
      const saveFinal = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const today = new Date();
        const payload = { notes, settings, sessionName, lastUpdated: today, stats };
        await setDoc(userDocRef, payload, { merge: true });
        lastStatSaveTime.current = Date.now();
      };
      saveFinal();
    }
  }, [isActive]); // notes/settings/stats are read from closure, which is fine here

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

  // 1. Play Local Music (Stops Lofi if running)
  const handlePlayMusic = (track) => {
    // Always stop Lofi first
    if (isLofiPlaying) {
      setIsLofiPlaying(false);
    }

    if (currentTrack?.id === track.id) {
      // Resume existing track
      musicAudioRef.current.play();
      setIsMusicPlaying(true);
    } else {
      // Start new track
      setCurrentTrack(track);
      setMusicLoading(true);
      musicAudioRef.current.src = track.src;
      musicAudioRef.current.load();
      musicAudioRef.current.play().catch(e => console.error("Play failed", e));
      setIsMusicPlaying(true);
    }
  };

  // 2. Pause Local Music (Standard)
  const handlePauseMusic = () => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    setIsMusicPlaying(false);
  };

  // 3. Toggle Lofi (Stops Local Music if starting Lofi)
  const toggleLofi = () => {
    if (isLofiPlaying) {
      // Turn off Lofi
      setIsLofiPlaying(false);
    } else {
      // Turn on Lofi -> Stop Local Music first
      handlePauseMusic();
      setIsLofiPlaying(true);
    }
  };
  const handleSeekMusic = (time) => {
    musicAudioRef.current.currentTime = time;
    setMusicProgress(time);
  };

  const handleNameTransition = async (newName) => { setShowLoginBtn(false); await new Promise(r => setTimeout(r, 800)); setIsDeletingName(true); const currentText = "Hello, stranger"; const prefix = "Hello, "; for (let i = currentText.length; i >= prefix.length; i--) { setGreetingText(currentText.substring(0, i)); await new Promise(r => setTimeout(r, 80)); } setIsDeletingName(false); setIsTypingName(true); const targetText = prefix + newName; for (let i = prefix.length; i <= targetText.length; i++) { setGreetingText(targetText.substring(0, i)); await new Promise(r => setTimeout(r, 120)); } setIsTypingName(false); await new Promise(r => setTimeout(r, 1200)); setOnboardingStep(1); };
  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('pomodoro_user_name');
      window.location.reload();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  const finishSessionInput = (e) => {
    if (e.key === 'Enter') {
      // Skip the "Let's go specific" step entirely
      // Skip the morph animation
      setOnboardingStep(3);
    }
  }
  useEffect(() => { if (onboardingStep === 1) setTimeout(() => sessionInputRef.current?.focus(), 50); }, [onboardingStep]);


  useEffect(() => {
    // 1. Safety Clear: Ensure no rogue timers exist
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    let lastTickTime = Date.now();

    if (isActive) {
      if (!endTimeRef.current) { endTimeRef.current = Date.now() + timeLeft * 1000; }
      lastTickTime = Date.now();

      // 2. Start new timer and assign to Ref
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const diff = endTimeRef.current - now;
        const secondsRemaining = Math.max(0, Math.ceil(diff / 1000));

        setTimeLeft(prev => {
          if (prev !== secondsRemaining) return secondsRemaining;
          return prev;
        });

        // Sync heartbeat to server every minute
        if (now - lastHeartbeatRef.current > 60000) {
          lastHeartbeatRef.current = now;
          syncTimerState({
            isActive: true,
            targetEndTime: endTimeRef.current,
            mode: mode,
            timeLeft: secondsRemaining,
            sessionName: sessionName
          });
        }

        // --- PRECISE TIME TRACKING ---
        const delta = now - lastTickTime;
        accumulatedTimeRef.current += delta;

        const elapsedSeconds = Math.floor(accumulatedTimeRef.current / 1000);

        if (elapsedSeconds > 0) {
          accumulatedTimeRef.current -= (elapsedSeconds * 1000);

          // Buffer for DB
          if (!devMode) {
            unsavedSecondsRef.current += elapsedSeconds;
          }

          // Update UI
          setStats(prevStats => {
            const newStats = { ...prevStats };
            if (mode === 'focus') {
              newStats.dailyFocusTime += elapsedSeconds;
            } else {
              newStats.dailyBreakTime += elapsedSeconds;
            }
            return newStats;
          });
        }

        lastTickTime = now;

        // Timer Finished Logic
        if (secondsRemaining <= 0) {
          setIsActive(false);
          endTimeRef.current = null;
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

          // CRITICAL: Flush any remaining seconds when timer ends
          flushUnsavedTime();

          playAlarm(mode);

          if (mode === 'focus') {
            // --- 1. STATS LOGIC (PRESERVED) ---
            if (!devMode) {
              // Update sessions count locally
              setStats(prev => ({ ...prev, dailySessions: prev.dailySessions + 1 }));
              // We don't need to sync sessions count here, the flushUnsavedTime handled the seconds,
              // and the next save loop will handle the session count.
            }

            // --- 2. STRICT MODE: EXIT FULLSCREEN ON BREAK ---
            if (strictMode) {
              document.exitFullscreen().catch(e => console.log("Auto-exit fullscreen failed", e));
            }
            // ------------------------------------------------

            const newPomoCount = pomoCount + 1;
            setPomoCount(newPomoCount);
            if (newPomoCount >= settings.pomosBeforeLongBreak) {
              setMode('longBreak');
              setTimeLeft(settings.longBreak * 60);
              setPomoCount(0);
              if (settings.autoStartBreaks) setIsActive(true);
            } else {
              setMode('shortBreak');
              setTimeLeft(settings.shortBreak * 60);
              if (settings.autoStartBreaks) setIsActive(true);
            }
          } else {
            // --- 3. STRICT MODE: ENTER FULLSCREEN ON FOCUS ---
            setMode('focus');
            if (strictMode) {
              document.documentElement.requestFullscreen().catch(e => console.log("Enter fullscreen failed", e));
            }
            // -------------------------------------------------

            setTimeLeft(settings.focus * 60);
            if (settings.autoStartWork) setIsActive(true);
          }

          // Sync completion state to server
          syncTimerState({
            isActive: false,
            targetEndTime: null,
            mode: mode === 'focus' ? (pomoCount + 1 >= settings.pomosBeforeLongBreak ? 'longBreak' : 'shortBreak') : 'focus',
            timeLeft: 0,
            sessionName
          });
        }
      }, 100);
    } else {
      endTimeRef.current = null;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, mode, settings, pomoCount, devMode, strictMode]); // Added strictMode to dependencies

  useEffect(() => { if (isActive && endTimeRef.current) { localStorage.setItem('zen_timer_state', JSON.stringify({ mode, isActive: true, targetEndTime: endTimeRef.current, timestamp: Date.now() })); } }, [isActive, mode]);
  useEffect(() => { if (!isActive) { localStorage.setItem('zen_timer_state', JSON.stringify({ mode, isActive: false, timeLeft, timestamp: Date.now() })); } }, [isActive, mode, timeLeft]);

  useEffect(() => {
    let syncInterval;
    if (isActive) {
      syncInterval = setInterval(() => {
        flushUnsavedTime();
      }, 60000); // Run every 10 seconds
    }
    return () => clearInterval(syncInterval);
  }, [isActive, mode, user]);

  const isInitialMount = useRef(true);
  const prevDurationRef = useRef(settings[mode] * 60);
  useEffect(() => { if (isInitialMount.current) { isInitialMount.current = false; return; } const newDuration = settings[mode] * 60; if (!isActive) { if (timeLeft === prevDurationRef.current) { setTimeLeft(newDuration); } } prevDurationRef.current = newDuration; }, [mode, settings[mode]]);

  // --- UPDATED TOGGLE TIMER ---
  const toggleTimer = () => {
    if (isActive) flushUnsavedTime();

    const newIsActive = !isActive;
    setIsActive(newIsActive);

    if (newIsActive) {
      lastHeartbeatRef.current = Date.now();
    }

    let stateToSync = {
      isActive: newIsActive,
      mode,
      sessionName,
      timeLeft
    };

    if (newIsActive) {
      const target = Date.now() + timeLeft * 1000;
      endTimeRef.current = target;
      stateToSync.targetEndTime = target;
    } else {
      stateToSync.targetEndTime = null;
    }

    syncTimerState(stateToSync);
  };

  const handleRequestReset = () => { setShowResetConfirm(true); };

  const handleConfirmReset = () => {
    // FIX: Only save pending time if the timer is CURRENTLY running.
    // If it's paused, we assume we already saved when you clicked pause.
    // We discard any "ghost" seconds to prevent the stats from jumping unexpectedly.
    if (isActive) {
      flushUnsavedTime();
    } else {
      unsavedSecondsRef.current = 0; // Discard buffer if paused
    }

    accumulatedTimeRef.current = 0; // Clear partial milliseconds on full reset

    setIsActive(false);
    setMode('focus');
    setTimeLeft(settings['focus'] * 60);
    setPomoCount(0);
    endTimeRef.current = null;
    setShowResetConfirm(false);

    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: 'focus',
      timeLeft: settings['focus'] * 60,
      sessionName
    });
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
      sessionName
    });
  };

  const isTimerRunning = isActive || (timeLeft < settings[mode] * 60 && timeLeft > 0);

  const handleSettingsSave = (newSettings) => {
    // 1. Calculate the difference for the CURRENT mode (e.g., did we change Focus from 25 -> 30?)
    const oldDuration = settings[mode];
    const newDuration = newSettings[mode];
    const deltaMinutes = newDuration - oldDuration; // e.g., +5 or -5 or 0

    // 2. Update local state
    setSettings(newSettings);
    setShowSettings(false);

    if (isActive) {
      // --- A. TIMER IS RUNNING ---
      // We do NOT stop the timer. We dynamicallly adjust it.

      let newTargetEndTime = endTimeRef.current;
      let newTimeLeft = timeLeft;

      if (deltaMinutes !== 0) {
        // Convert minutes to ms and adjust the Target End Time
        const msToAdd = deltaMinutes * 60 * 1000;
        newTargetEndTime = endTimeRef.current + msToAdd;
        endTimeRef.current = newTargetEndTime;

        // Adjust visual countdown immediately
        newTimeLeft = timeLeft + (deltaMinutes * 60);
        setTimeLeft(newTimeLeft);
      }

      // Sync the ADJUSTED timer to Firestore (so mobile/other tabs see the jump)
      if (user) {
        const payload = {
          settings: newSettings, // Save new settings
          timerState: {
            isActive: true,
            targetEndTime: newTargetEndTime,
            mode: mode,
            timeLeft: newTimeLeft,
            sessionName,
            lastUpdated: Date.now()
          }
        };
        // Update Ref to prevent loop
        lastRemoteUpdate.current = payload.timerState.lastUpdated;
        setDoc(doc(db, "users", user.uid), payload, { merge: true });
      }

    } else {
      // --- B. TIMER IS PAUSED/STOPPED ---
      // Reset the display to the new duration
      const newDurationSeconds = newSettings[mode] * 60;
      setTimeLeft(newDurationSeconds);
      endTimeRef.current = null;

      // Sync the RESET timer to Firestore
      if (user) {
        const payload = {
          settings: newSettings,
          timerState: {
            isActive: false,
            targetEndTime: null,
            mode: mode,
            timeLeft: newDurationSeconds,
            sessionName,
            lastUpdated: Date.now()
          }
        };
        lastRemoteUpdate.current = payload.timerState.lastUpdated;
        setDoc(doc(db, "users", user.uid), payload, { merge: true });
      }
    }
  };

  const handleBackgroundChange = (bgSrc) => { setSettings(prev => ({ ...prev, background: bgSrc })); };
  const handleAddCustomBackground = (newBg) => { setCustomBackgrounds(prev => [...prev, newBg]); };
  const handleDeleteCustomBackground = (bgId) => { const bgToDelete = customBackgrounds.find(b => b.id === bgId); if (bgToDelete && settings.background === bgToDelete.src) { setSettings(prev => ({ ...prev, background: '' })); } setCustomBackgrounds(prev => prev.filter(bg => bg.id !== bgId)); };
  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };
  useEffect(() => { if (isEditingName && nameInputRef.current) nameInputRef.current.focus(); }, [isEditingName]);

  useEffect(() => {
    if (isActive) {
      document.title = `${formatTime(timeLeft)} | MindGrind`;
    } else {
      // Reset title when paused or stopped
      document.title = "MindGrind";
    }

    // Cleanup function to ensure title resets when component unmounts
    return () => {
      document.title = "MindGrind";
    };
  }, [timeLeft, isActive]);

  const dashboardFriends = friends.filter(f => f.isOnline || f.isPinned);

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

      <div className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center transition-all duration-1000 ${onboardingStep === 0 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <h1 className="relative z-10 font-serif-display italic text-4xl md:text-6xl text-white tracking-tight min-h-[80px] flex items-center"><span>{(!isDeletingName && !isTypingName && (greetingText === "Hello, stranger" || greetingText.startsWith("Welcome back"))) ? <StaggeredText text={greetingText} /> : greetingText}</span>{(isDeletingName || isTypingName) && <span className="inline-block w-[2px] h-8 md:h-12 bg-white ml-1 cursor-blink"></span>}</h1>
        {showLoginBtn && onboardingStep === 0 && (<div className="absolute bottom-20 md:bottom-32 animate-fade-in opacity-0" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}><button onClick={handleLogin} className="group flex items-center gap-3 px-6 py-3 border border-white/20 rounded-full hover:bg-white/10 transition-all hover:border-white/50"><GoogleLogo /><span className="text-sm tracking-widest uppercase text-white/80 group-hover:text-white">Sign in with Google</span></button></div>)}
      </div>

      <div className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-center transition-all duration-700 ${onboardingStep === 1 ? 'opacity-100 blur-enter pointer-events-auto' : 'opacity-0 blur-exit pointer-events-none'}`}>
        <div className="w-full max-w-xl px-8 flex flex-col items-center gap-8"><h2 className="font-serif-display text-3xl md:text-4xl text-white/90 text-center leading-tight">{onboardingStep === 1 && <StaggeredText text="What are we working on?" />}</h2><div className="w-full animate-fade-in" style={{ animationDelay: '0.5s' }}><input ref={sessionInputRef} type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} onKeyDown={finishSessionInput} placeholder="Type here..." className="w-full bg-transparent border-b-2 border-white/20 py-4 text-center text-2xl md:text-3xl text-white focus:outline-none focus:border-white/60 transition-colors font-light" /><p className="text-white/40 text-sm mt-2 flex justify-center items-center gap-2">Press <span className="border border-white/20 px-2 py-0.5 rounded text-xs">Enter</span> to continue</p></div></div>
      </div>

      {/* --- MAIN DASHBOARD (Responsive Redesign) --- */}
      <div className={`h-full w-full flex flex-col md:block transition-all duration-1500 ease-out ${onboardingStep === 3 ? 'opacity-100 delay-200' : 'opacity-0'}`}>

        {/* --- MOBILE HEADER: Logo & Settings (Changed) --- */}
        <div className={`md:hidden flex justify-between items-center w-full p-6 z-20 flex-shrink-0 transition-opacity duration-700 ease-in-out ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
          <div className="flex items-center gap-2">
            <SpinningLogo src="/logo/white.png" className="w-14 h-14 object-contain" />
          </div>
          <div className="flex items-center gap-3">
            {/* --- ADD THIS BUTTON --- */}
            <button onClick={() => setShowMusic(true)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isMusicPlaying ? 'text-white animate-pulse' : 'text-white'}`}>
              <Music size={22} />
            </button>
            {/* ----------------------- */}
            <button onClick={() => setShowFriends(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <Users size={22} />
            </button>
            <button onClick={() => setShowAccount(true)} className="rounded-full overflow-hidden ml-2 w-8 h-8">
              <Avatar photoURL={user?.photoURL} name={user?.displayName} size="full" isPro={isPro} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <Settings size={22} />
            </button>
          </div>
        </div>

        {/* --- DESKTOP HEADER: Settings & Stats (Quote Removed) --- */}
        <div className={`hidden md:flex flex-col items-end absolute top-8 right-12 z-20 transition-opacity duration-700 ease-in-out ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
          <div className="flex items-center gap-4">

            {/* 1. SETTINGS ICON (Now on the Left) */}
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <Settings size={20} />
            </button>

            {/* 2. ACCOUNT ICON (Now on the Right - Profile Pic) */}
            <button onClick={() => setShowAccount(true)} className="relative group rounded-full overflow-hidden w-9 h-9">
              <Avatar photoURL={user?.photoURL} name={user?.displayName} size="full" isPro={isPro} />
            </button>

          </div>
        </div>

        {/* --- DESKTOP FOOTER LEFT: DOCK & FRIENDS --- */}
        <div className={`hidden md:flex flex-col items-start absolute bottom-8 left-12 z-50 transition-opacity duration-700 ease-in-out ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>

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
              activeSide={hoveredDockIndex === 1 ? 'left' : hoveredDockIndex === 2 ? 'right' : null}
              isDimmed={isMusicPlaying || strictMode}
            />

            {/* 3. STRICT MODE BUTTON (Index 2) */}
            <motion.button
              layout
              onMouseEnter={() => setHoveredDockIndex(2)}
              onClick={() => {
                if (!strictMode) { setShowStrictConfirm(true); return; }
                const fullDuration = settings.focus * 60;
                if (mode === 'focus' && timeLeft !== fullDuration) { return; }
                setShowStrictDisableConfirm(true);
              }}
              className={`relative p-2 rounded-full transition-colors group flex items-center ${strictMode ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              {strictMode ? <Lock size={20} /> : <Unlock size={20} />}
              <motion.span layout className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${strictMode ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2'}`}>
                {strictMode ? (mode === 'focus' ? 'Strict On' : 'Strict (Break)') : 'Strict Mode'}
              </motion.span>
            </motion.button>

          </motion.div>
        </div>

        {/* --- DESKTOP LOGO (Changed) --- */}
        <div className={`hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-1000 ease-out delay-500 ${onboardingStep === 3 ? (focusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-700' : 'opacity-100') : 'opacity-0 pointer-events-none'}`}>
          <SpinningLogo src="/logo/white.png" className="w-28 h-28 object-contain cursor-pointer" />
        </div>


        {/* --- TIMER SECTION (Main) --- */}

        <main className="flex-1 flex flex-col items-center justify-center min-h-0 w-full px-4 pt-16 pb-40 md:pb-0 relative md:absolute md:inset-0 z-10 md:pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center animate-fade-in-up w-full max-w-full">
            <div className="mb-4 md:mb-6 group relative">
              {isEditingName ? (<input id="session-name-input" ref={nameInputRef} type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} onBlur={() => setIsEditingName(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false); }} className="bg-transparent border-b border-white/50 text-center text-white/80 text-xl md:text-xl focus:outline-none font-light tracking-wide min-w-[200px] w-auto" />) : (<div onClick={() => setIsEditingName(true)} className="relative flex items-center justify-center gap-2 cursor-pointer text-white/50 hover:text-white transition-colors py-1"><span className="text-xl md:text-xl font-light tracking-wide text-center">{sessionName || "Deep Work Session"}</span><Pencil size={14} className="opacity-0 group-hover:opacity-100 absolute -right-6 transition-opacity" /></div>)}
            </div>

            <div className="flex items-center justify-center mb-4 md:mb-8 h-10 w-full max-w-md">
              {[{ id: 'focus', label: 'Focus' }, { id: 'shortBreak', label: 'Short Break' }, { id: 'longBreak', label: 'Long Break' }].map((m) => {
                const isCurrent = mode === m.id;
                const totalSeconds = settings[m.id] * 60;
                const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
                let containerClass = `relative h-full rounded-full transition-all ${isActive ? 'duration-1000 ease-in-out' : 'duration-300 ease-out'} overflow-hidden flex items-center justify-center whitespace-nowrap min-w-0 `;
                if (isActive) { if (isCurrent) { containerClass += "flex-[100] bg-white/10 mx-0 cursor-default border border-transparent"; } else { containerClass += "flex-[0.001] px-0 mx-0 opacity-0 border border-transparent"; } } else { containerClass += "flex-1 mx-1 md:mx-1.5 cursor-pointer "; if (isCurrent) { containerClass += "bg-white text-black font-medium border border-white"; } else { containerClass += "bg-transparent text-white/50 border border-transparent hover:border-white/20 hover:text-white"; } }
                return (
                  <button key={m.id} onClick={() => !isActive && handleModeChange(m.id)} className={containerClass} disabled={isActive}>
                    <div className={`absolute inset-y-0 left-0 bg-white transition-all duration-1000 ease-linear will-change-[width] ${isActive && isCurrent ? 'opacity-100' : 'opacity-0'}`} style={{ width: `${isActive && isCurrent ? progress : 0}%` }} />
                    <span className={`relative z-10 transition-opacity duration-300 ${isActive ? 'opacity-0' : 'opacity-100 delay-200'}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="font-clock text-[20vw] md:text-[10rem] lg:text-[12rem] leading-none tracking-normal select-none tabular-nums text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{formatTime(timeLeft)}</div>

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

              <button onClick={handleRequestReset} className="w-12 h-12 rounded-full border border-white/30 text-white/80 hover:text-white hover:border-white flex items-center justify-center transition-all duration-300 active:scale-90 md:hover:scale-110 md:hover:-rotate-180">
                <RotateCcw size={22} />
              </button>
            </div>

          </div>
        </main>

        {/* --- STICKY NOTE WIDGET CONTAINER --- */}
        <div className={`
    w-full flex justify-center z-20 transition-all duration-700 ease-in-out 
    
    /* DESKTOP POSITIONING */
    md:absolute md:top-8 md:left-12 md:w-auto md:justify-start
    
    /* DESKTOP VISIBILITY FIX: Only apply the fade-out/hover logic on desktop (md:) */
    md:transition-opacity md:duration-700 md:ease-in-out 
    ${onboardingStep === 3
            ? (focusMode
              // IF FOCUS MODE IS ON: Hide completely, then reveal on hover
              ? 'md:opacity-0 md:hover:opacity-100 opacity-100'
              // IF FOCUS MODE IS OFF: Stay visible
              : 'opacity-100')
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
      <AccountModal
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
        user={user}
        stats={stats}
        onSignOut={handleSignOut} // Make sure handleSignOut is defined in App
      />
      <FriendProfileModal
        isOpen={showStats} // Using showStats state to trigger this
        onClose={() => {
          setShowStats(false);
          setViewingFriendStats(null);
        }}
        friend={viewingFriendStats}
      />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={handleSettingsSave} onBackgroundChange={handleBackgroundChange} user={user} isTimerRunning={isTimerRunning} devMode={devMode} setDevMode={setDevMode} customBackgrounds={customBackgrounds} onAddCustomBackground={handleAddCustomBackground} onDeleteCustomBackground={handleDeleteCustomBackground} />

      <MiniLofiPlayer isPlaying={isLofiPlaying} onToggle={toggleLofi} />

      <MusicModal
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
        isLofiPlaying={isLofiPlaying}
        onToggleLofi={toggleLofi}
      />
      {/* --------------------- */}

      {/* --- ADD STRICT MODE MODALS HERE --- */}
      <StrictConfirmationModal
        isOpen={showStrictConfirm}
        onClose={() => setShowStrictConfirm(false)}
        onConfirm={enableStrictMode}
      />
      <StrictWarningModal
        isOpen={showStrictWarning}
        onResume={handleStrictResume}
        onDisable={handleStrictDisable}
      />
      <StrictDisableModal
        isOpen={showStrictDisableConfirm}
        onClose={() => setShowStrictDisableConfirm(false)}
        onConfirm={handleStrictDisable}
      />
      {/* ----------------------------------- */}

      {onboardingStep === 3 && (
        <ProCelebrationModal
          isPro={isPro}
          user={user} // <--- Pass user here so the modal can show the pic
        />
      )}

      <NotificationCenter />


      <SocialModal
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        user={user}
        friends={friends}
        onAddFriend={handleAddFriend}
        onViewStats={handleViewFriendStats}
        onTogglePin={handleTogglePin}        // <--- NEW
        onSearchUsers={handleSearchUsers}
        onRemoveFriend={handleRemoveFriend} // <--- NEW
      />

      <ConfirmationModal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} onConfirm={handleConfirmReset} title="Reset Timer?" message="This will reset the current timer back to the beginning." warning="⚠️ Warning: This will also reset your completed Pomodoros tally for this session." />
      <KeyboardHelpModal isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />

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
      />
    </div>
  );
}