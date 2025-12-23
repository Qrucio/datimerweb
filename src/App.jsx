import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUnreadMessages } from './hooks/useUnreadMessages';
import { useVideo } from './contexts/VideoContext';
import { Play, Pause, RotateCcw, Settings, X, Plus, Music, SkipForward, SkipBack, Check, Trash2, BarChart2, Zap, Coffee, Flame, CheckSquare, Clock, Sparkles, Loader2, RotateCw, GripVertical, ArrowRight, ArrowDown, Pencil, LogIn, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, UserPlus, Circle, Pin, UserMinus, Maximize, Minimize, AlertTriangle, ShieldAlert, Lock, Unlock, Volume2, Bold, Italic, List, StickyNote as StickyNoteIcon, VolumeX, LogOut, GripHorizontal, CloudRain, CloudLightning, Wind, Waves, Tent, Trees, Train, Keyboard, Headphones, Radio, Gamepad2, ChevronUp, ChevronDown, Ban, Bell, Download, Brain, Video, CheckCircle2, Crown, TrendingUp, Coins } from 'lucide-react';
import { supabase } from './lib/supabase';
import { usePiP } from './hooks/usePiP';
import { PictureInPicture2 } from 'lucide-react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { createPortal } from 'react-dom';
import CloseButton from './components/ui/CloseButton';
import { Storage } from './utils/storage';
import UnifiedSettingsModal from './components/modals/UnifiedSettingsModal';
import { CommandMenu } from './components/CommandMenu';
import OnboardingFlow from './components/OnboardingFlow';
import SocialModal from './components/modals/SocialModal';
import IntentionWizard from './components/IntentionWizard';
import HoloNote from './components/HoloNote';
import HoloGrainBackground from './components/HoloGrainBackground';
import SmartIntervention from './components/SmartIntervention';
import BreakCheckIn from './components/BreakCheckIn'; // NEW
import MusicModal from './components/modals/MusicModal';
import VaultModal from './components/modals/VaultModal';
import SocialProfileModal from './components/modals/SocialProfileModal';
import Avatar from './components/Avatar';
import { BACKGROUND_OPTIONS, AMBIENT_SOUNDS, MUSIC_TRACKS, ALARM_SOUNDS } from './utils/data';
import SnakeGame, { SnakeIcon } from './components/games/SnakeGame';
import TypingGame from './components/games/TypingGame';
import CalendarPanel from './components/notes/CalendarPanel';
import TaskReminderSystem from './components/TaskReminderSystem';
import CountdownTimer from './components/CountdownTimer';
import { VideoManager } from './components/video/VideoManager';
import VideoPipWindow from './components/video/VideoPipWindow';
import FriendsDock from './components/social/FriendsDock';
import './components/video/video-styles.css';
import { FlowTag } from './components/ui/FlowTag';
import WalletIndicator from './components/gamification/WalletIndicator';
import ReleaseNotesPage from './pages/ReleaseNotesPage';
// GoogleGenerativeAI import removed per user request
// import CaffeineTracker from './components/CaffeineTracker';
// for the sake of the comment 
// let's get it

const CHROME_ID = "jedfahaahenadaohjcppmoghhepiigdp";
const FIREFOX_ID = "altimercompanion@qruciatus.com";

const ELON_MSG = [
  "Break skipped. Mars awaits.",
  "No break. Go hardcore.",
  "Skipped. Production hell.",
  "Break denied. Build the future.",
  "Skipped. 100 hour work weeks.",
  "No rest. Be extremely hardcore.",
  "Break skipped. Accelerate.",
  "Denied. Physics doesn't compromise.",
  "Skipped. History is written now."
];

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
// --- FIREBASE CONFIG REMOVED ---
// App now uses Supabase (initialized in ./lib/supabase.js)

const apiKey = import.meta.env.VITE_APP_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;


// Helper for raw fetch calls to Gemini
const callGeminiAPI = async (prompt) => {
  if (!apiKey) {
    console.error("Gemini API Key missing. Checked: VITE_APP_GEMINI_API_KEY, VITE_GEMINI_API_KEY");
    return "Error: Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.";
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Failed: ${response.status}`, errText);
      return `Error: AI Service Failed (${response.status}). Check console for details.`;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Gemini Response Empty:", data);
      return "Error: AI returned no content.";
    }

    // Check if the response was filtered (Safety settings)
    if (data.promptFeedback?.blockReason) {
      return "Error: Request blocked by safety filters.";
    }

    return text;

  } catch (error) {
    console.error("Gemini Network Error:", error);
    return `Error: Network Connection Failed. (${error.message})`;
  }
};

const getGeminiAdvice = async (context) => {
  const prompt = `
        You are a supportive, wise productivity coach named "The Ether". 
        
        Context:
        - Intention: "${context.intention}"
        - Reason(s) context: ${context.reasons.join(', ')} (or user query: ${context.userQuery || 'N/A'})
        - Current Emotion: ${context.emotion}
        - Session Progress: Focused for ${context.timeFocused}m (out of ${context.duration}m planned).
        
        Task:
        1. Write a short, empathetic message (1-2 sentences) directly addressing their specific feelings and situation. make it feel personal and warm.
        2. Suggest ONE concrete, easy next step.
        3. Wrap the actionable command in [Action: ...] format at the end.
        
        Valid Actions:
        - [Action: Resume] (If they just need encouragement or want to restart work)
        - [Action: Set Focus 15m] (If they are tired/overwhelmed, suggest a shorter burst)
        - [Action: Set Break 5m] (If they need a rest)
        - [Action: Switch to 50/10] (If they need rhythm)
        
        Example Output:
        "It's completely normal to feel drained when tackling such a complex task. Rest is productive too. [Action: Set Break 5m]"
        `;

  const result = await callGeminiAPI(prompt);

  // If result starts with "Error:", pass it through so user sees it.
  if (result && result.startsWith("Error:")) {
    return result;
  }

  // Fallback ONLY if result is somehow null but not an error string (shouldn't happen with above logic)
  return result || `I hear that you're feeling ${context.reasons[0] || "stuck"}. It happens. Take a moment. [Action: Resume]`;
};



const generateSessionPlan = async (task, timeString) => {
  const prompt = `
        Act as a productivity expert. User wants to work on: "${task}" for "${timeString}".
        Suggest the optimal settings in JSON format:
        {
            "focus": number (minutes, 25 or 50 mostly),
            "shortBreak": number (5 or 10),
            "sessions": number (count)
        }
        Do not output anything else.
        `;
  const text = await callGeminiAPI(prompt);
  if (!text) return null;

  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI plan", e);
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
      const { mode, isActive, targetEndTime, timeLeft, pomoCount } = JSON.parse(saved);
      if (isActive && targetEndTime) {
        const remaining = Math.ceil((targetEndTime - Date.now()) / 1000);
        return remaining > 0
          ? { mode, isActive: true, timeLeft: remaining, pomoCount: pomoCount || 0 }
          : { mode, isActive: false, timeLeft: 0, pomoCount: pomoCount || 0 };
      }
      return { mode, isActive: false, timeLeft, pomoCount: pomoCount || 0 };
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
   @import url('https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Anton&family=Bungee+Shade&family=Inter:wght@300;400;500;600&family=Montserrat:wght@700&family=Orbitron:wght@400;700&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Press+Start+2P&family=Rajdhani:wght@700&family=Righteous&family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
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
    .font-clock-sans { font-family: 'Inter', sans-serif; }
    .font-clock-serif { font-family: 'Playfair Display', serif; }
    .font-clock-mono { font-family: 'Space Mono', monospace; }
    .font-clock-display { font-family: 'Syne', sans-serif; }
    
    /* NEW CLOCK FONTS */
    .font-clock-digital { font-family: 'DSEG7 Classic', monospace; } /* Already imported via CDN */
    .font-clock-pixel { font-family: 'Press Start 2P', cursive; }
    .font-clock-cyber { font-family: 'Orbitron', sans-serif; }
    .font-clock-hand { font-family: 'Permanent Marker', cursive; }
    .font-clock-block { font-family: 'Anton', sans-serif; }
    .font-clock-elegant { font-family: 'Abril Fatface', serif; }
    .font-clock-neon { font-family: 'Bungee Shade', cursive; }
    .font-clock-round { font-family: 'Righteous', cursive; }
    
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
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .text-shimmer {
      background: linear-gradient(135deg, #ffffff 0%, #5E5E5E 50%, #ffffff 100%);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      background-size: 200% 100%;
      animation: shimmer 5s linear infinite;
    }
  `}</style>
);

// Replaces SpinningLogo
const RevealLogo = ({ src, className, disableReveal = false }) => {
  return (
    <motion.div
      className={`group relative flex items-center justify-center ${disableReveal ? '' : 'cursor-default'}`}
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
    className="flex justify-between items-center w-full group cursor-default py-3 select-none"
    onClick={() => onChange(!checked)}
  >
    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
      {label}
    </span>

    {/* Track */}
    <div
      className={`relative w-[51px] h-[31px] flex-shrink-0 rounded-full border transition-all duration-300 ease-ios ${checked
        ? 'bg-[#34C759] border-[#34C759] shadow-[0_0_15px_rgba(52,199,89,0.4)]' // iOS Green + Glow
        : 'bg-[#39393d] border-transparent' // iOS Dark Mode Off Grey
        }`}
    >
      {/* Knob - ALWAYS WHITE, PERFECT CIRCLE */}
      <div
        className={`absolute top-[1px] left-[1px] w-[27px] h-[27px] bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-ios ${checked ? 'translate-x-[20px]' : 'translate-x-0'
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

// Custom Spotify Icon (Reused here for Promo Popup)
const SpotifyIcon = ({ size = 24, className, innerFillClassName }) => (
  <svg width={size} height={size} viewBox="0 0 496 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z" />
    <path fill={innerFillClassName ? undefined : "black"} className={innerFillClassName} d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" />
  </svg>
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



// --- IMPORT TIMEPICKER ---
import { TimePicker } from './components/ui/TimePicker';

// --- SMART MESSAGE COMPONENT ---
const SmartMessage = ({ isActive, targetEndTime, mode, isUserActive, focusMode, overrideMessage, layoutId, timeLeft, onUpdateEndTime }) => {
  const [displayText, setDisplayText] = useState("");
  const [key, setKey] = useState("init");
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  // Helper to format time strings (e.g., "10:30 AM")
  const formatTime = (dateObj) => {
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  useEffect(() => {
    const updateMessage = () => {
      // 1. Priority: Override Message (e.g., "Break Skipped")
      if (overrideMessage) {
        setDisplayText(overrideMessage);
        setKey(prev => {
          const newKey = `override-${overrideMessage}`;
          return prev === newKey ? prev : newKey;
        });
        return;
      }

      const now = new Date();
      const currentTimeStr = formatTime(now);

      let message = currentTimeStr;
      let targetDate = null;

      if (isActive && targetEndTime) {
        targetDate = new Date(targetEndTime);
      } else if (!isActive && timeLeft > 0) {
        targetDate = new Date(Date.now() + timeLeft * 1000);
      }

      if (targetDate) {
        const endStr = formatTime(targetDate);
        // UNIFIED FORMAT: "10:30 AM | Ends at 11:20 AM"
        message = `${currentTimeStr} | Ends at ${endStr}`;

        setDisplayText(message);
        setKey(prev => {
          // Use "active" key prefix for both to ensure stability
          const newKey = `active-${message}`;
          return prev === newKey ? prev : newKey;
        });
      } else {
        // Fallback or 0 time
        setDisplayText(currentTimeStr);
        setKey(prev => {
          const newKey = `idle-${currentTimeStr}`;
          return prev === newKey ? prev : newKey;
        });
      }
    };

    updateMessage();
    const interval = setInterval(updateMessage, 1000);
    return () => clearInterval(interval);
  }, [isActive, targetEndTime, mode, overrideMessage, timeLeft, isEditing]);

  // VISIBILITY LOGIC:
  // If we have an override message (Break Skipped), ALWAYS show it.
  // Otherwise, fallback to Focus Mode logic (hide if inactive).
  const isVisible = overrideMessage || (focusMode ? isUserActive : true);

  const handleEditClick = (e) => {
    e.stopPropagation();
    // Initialize edit value based on current target/projected time
    const targetDate = isActive && targetEndTime ? new Date(targetEndTime) : new Date(Date.now() + timeLeft * 1000);
    const h = targetDate.getHours().toString().padStart(2, '0');
    const m = targetDate.getMinutes().toString().padStart(2, '0');
    setEditValue(`${h}:${m}`);
    setIsEditing(true);
  };

  const handleTimeChange = (newTimeStr) => {
    // newTimeStr is "HH:MM" (24h)
    setEditValue(newTimeStr);
    onUpdateEndTime(newTimeStr);
  };

  return (
    <div
      className={`flex justify-center transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'} relative ${isEditing ? 'z-[100]' : 'z-50'}`}
    >
      {/* Backdrop for Editing */}
      {isEditing && (
        <div className="fixed inset-0 z-40" onClick={() => setIsEditing(false)} />
      )}

      <motion.div
        layoutId={layoutId}
        layout
        onMouseEnter={() => setIsHovered(true)}
        // FIX: Don't clear hover if we are editing
        onMouseLeave={() => setIsHovered(false)}
        transition={{
          layout: { duration: 0.4, type: "spring", bounce: 0, damping: 25, stiffness: 300 }
        }}
        className="relative bg-black/60 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10 shadow-2xl flex items-center justify-center min-w-[100px] cursor-default z-50 group"
        style={{ borderRadius: 32 }}
      >
        {/* Shimmer Effect Overlay - MOVED TO INNER CONTAINER to avoid clipping Popover */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <motion.div
            key={key + '-shimmer'}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '150%', opacity: 0.4 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className={`absolute inset-0 w-full h-full bg-gradient-to-r from-transparent ${overrideMessage ? 'via-purple-500' : 'via-white'} to-transparent -skew-x-12 pointer-events-none z-0`}
          />
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={key}
              initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: 0.5
              }}
              className={`text-sm font-medium tracking-wide text-center block font-clock 
                ${overrideMessage && overrideMessage.startsWith("I will work on") ? 'text-purple-200 whitespace-normal leading-tight max-w-[80vw] md:max-w-md' : 'text-white whitespace-nowrap'} 
                ${overrideMessage && !overrideMessage.startsWith("I will work on") ? 'text-purple-200' : ''}
                `}
              style={{ textShadow: overrideMessage ? "0 0 20px rgba(168, 85, 247, 0.5)" : "0 0 20px rgba(255,255,255,0.2)" }}
            >
              {displayText}
            </motion.span>
          </AnimatePresence>

          {/* Edit Pencil Icon (Only show if not overriding and time is valid AND TIMER IS PAUSED) */}
          {!overrideMessage && !isActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: 'auto' }}
              exit={{ opacity: 0, scale: 0.5, width: 0 }}
              // Always show pencil, no hover check
              className="flex items-center justify-center text-white/50 hover:text-white transition-colors"
              onClick={handleEditClick}
            >
              <Pencil size={12} strokeWidth={2.5} />
            </motion.button>
          )}
        </div>

        {/* TIME PICKER POPOVER */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full mt-3 bg-[#1a1a1a] border border-white/20 rounded-2xl shadow-2xl p-4 z-[60]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Set End Time</span>
                <TimePicker value={editValue} onChange={handleTimeChange} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </motion.div>
    </div>
  );
};

/* --- SmartIntervention Component --- */
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
      description: <>Free users are limited to 3 notes. Upgrade to <FlowTag className="inline-block h-3 w-auto mx-1" /> for unlimited notes, exclusive themes, and more.</>,
      icon: StickyNoteIcon
    },
    arcade: {
      title: "Unlock Arcade",
      description: <>Gain access to <FlowTag className="inline-block h-3 w-auto mx-1" /> exclusive games, multiplayer modes, and global leaderboards.</>,
      icon: Gamepad2
    },
    ambience: {
      title: "Soundscape Locked",
      description: <>You have chosen your 3 free sounds. Upgrade to <FlowTag className="inline-block h-3 w-auto mx-1" /> to unlock the full library and mix unlimited sounds.</>,
      icon: CloudRain
    },
    music: {
      title: "Unlock Focus Music",
      description: <>Curated Focus Tracks are a <FlowTag className="inline-block h-3 w-auto mx-1" /> feature. Upgrade to access high-fidelity binaural beats and lofi streams.</>,
      icon: Music
    },
    settings: {
      title: "Unlock Everything",
      description: (
        <div className="flex flex-col gap-3 mt-1">
          <p className="text-white/60 text-sm">Become a Flow member to remove all limits and access the complete experience.</p>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-left">
            {[StickyNoteIcon, Gamepad2, CloudRain, Music, FlowTag].map((Icon, i) => (
              <div key={i} className="flex items-center gap-3">
                {Icon === FlowTag ? <div className="p-0"><FlowTag className="h-5 w-auto" /></div> : <div className="p-1 bg-cyan-400/10 rounded text-cyan-400"><Icon size={12} /></div>}
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


// --- HELPERS FOR FRIEND STATS ---



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

  const validateSettings = () => { const newErrors = {}; let hasError = false; const finalSettings = {};['focus', 'shortBreak', 'longBreak'].forEach(mode => { const val = localSettings[mode]; if (val === undefined || val === '' || parseInt(val) === 0) { newErrors[mode] = true; hasError = true; } else { finalSettings[mode] = parseInt(val); } }); finalSettings.autoStartBreaks = localSettings.autoStartBreaks; finalSettings.autoStartWork = localSettings.autoStartWork; finalSettings.background = localSettings.background; finalSettings.backgroundOpacity = localSettings.backgroundOpacity; return { hasError, newErrors, finalSettings }; };

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
                          ${errors[mode] ? 'bg-red-500/10 ring-2 ring-500/50' : ''}
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
                            ${errors['pomosBeforeLongBreak'] ? 'bg-red-500/10 ring-2 ring-500/50' : ''}
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
    className={`bg-[#ffeb3b] text-black p-4 shadow-xl cursor-default relative overflow-hidden flex flex-col ${className}`}
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
        className="absolute top-0 left-0 border flex items-center justify-center overflow-hidden cursor-default shadow-lg bg-[#111]"
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
              className="absolute inset-0 w-full h-full flex items-center justify-center text-white/80 hover:text-white cursor-default"
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
        className={`relative p-2 rounded-full transition-all group flex items-center cursor-default ${btnBg} ${btnText} ${isMenuOpen ? 'bg-white/10' : ''}`}
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
          className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-smooth 
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

const TimerModeSelector = ({ mode, opacityClass, isIntentionMode, onToggleMode, onOpenPro }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Logic: Show this ONLY in Focus mode
  if (mode !== 'focus') return null;

  const modes = [
    {
      id: 'default',
      title: 'Default',
      description: 'Classic Focus. You control the flow. Pause freely.',
      icon: Zap,
      tags: [{ label: 'Flexible', warn: false }],
      isLocked: false,
      isDisabled: false
    },
    {
      id: 'intention',
      title: 'Intentional',
      description: 'Goal-oriented. Smart interventions if you distract.',
      icon: Brain,
      tags: [{ label: 'Smart AI', warn: false }],
      isLocked: false,
      isDisabled: false
    },
    {
      id: 'stopwatch',
      title: 'Stopwatch',
      description: 'Count-up timer mode. Coming Soon.',
      icon: Clock,
      tags: [],
      isLocked: true,
      isDisabled: true
    }
  ];

  const handleSelect = (m) => {
    if (m.isDisabled) return;

    if (m.id === 'default') {
      if (isIntentionMode) onToggleMode(false);
    } else if (m.id === 'intention') {
      if (!isIntentionMode) onToggleMode(true);
    }

    setTimeout(() => setIsOpen(false), 150);
  };

  const activeModeId = isIntentionMode ? 'intention' : 'default';
  const activeModeObj = modes.find(m => m.id === activeModeId);
  const buttonLabel = isOpen ? 'Select Mode' : (activeModeId === 'default' ? 'Mode' : activeModeObj.title);

  return (
    <>
      {/* --- TRIGGER BUTTON --- */}
      <div className={`absolute top-full mt-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center transition-opacity duration-700 ease-in-out ${opacityClass}`}>
        <AnimatePresence mode="wait">
          {!isOpen && (
            <motion.div
              key="mode-pill"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <motion.button
                layoutId="modes-pill"
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative group flex items-center gap-3 px-6 py-3 rounded-full 
                  shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-500 border
                  ${isIntentionMode
                    ? 'bg-black border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                    : 'bg-[#111]/80 border-white/10 hover:border-white/30'
                  }
                `}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${isIntentionMode ? 'from-purple-500/20 to-transparent' : 'from-white/10 to-transparent'}`} />
                {/* {isIntentionMode ? <Brain size={18} className="relative z-10 text-purple-400" /> : <Zap size={18} className="relative z-10 text-white/60 group-hover:text-white" />} */}
                <span className={`text-xs font-bold relative z-10 tracking-widest uppercase transition-colors whitespace-nowrap ${isIntentionMode ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                  {buttonLabel}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- SELECTION MODAL (FULL SCREEN GRID) --- */}
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
                className="absolute inset-0 bg-black/80 z-0"
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
                      Select <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Timer Mode.</span>
                    </motion.h2>
                  </div>
                  <CloseButton onClick={() => setIsOpen(false)} />
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 w-full pointer-events-auto overflow-y-auto custom-scrollbar pb-32 pt-4 px-4">
                  {modes.map((m, i) => {
                    const isActive = activeModeId === m.id;
                    const Icon = m.icon;
                    const isIntentional = m.id === 'intention';
                    const isDefault = m.id === 'default';

                    // DYNAMIC STYLES BACKGROUNDS
                    let bgClasses = "";
                    if (isDefault) bgClasses = "bg-[#09090b] border-white/10 hover:border-white/20"; // Zinc-950 equivalent
                    else if (isIntentional) bgClasses = "bg-gradient-to-br from-[#1a103c] to-[#000] border-purple-500/30 hover:border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.1)]"; // Holographic
                    else bgClasses = "bg-neutral-900/50 border-white/5"; // Disabled

                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + (i * 0.1), duration: 0.5, ease: "easeOut" }}
                        className="h-full"
                      >
                        <button
                          onClick={() => handleSelect(m)}
                          disabled={m.isDisabled}
                          className={`
                          relative w-full h-full text-left p-8 rounded-3xl transition-all duration-500 border group overflow-hidden
                          ${bgClasses}
                          ${m.isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                          ${isActive && isIntentional ? 'ring-1 ring-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.2)]' : ''}
                          ${isActive && isDefault ? 'ring-1 ring-white/20' : ''}
                        `}
                        >
                          {/* Holographic Sheen for Intentional Mode */}
                          {isIntentional && (
                            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-blue-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
                          )}

                          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                            <div>
                              <div className="flex items-center justify-between mb-6">
                                <div className={`p-4 rounded-2xl ${isActive ? 'bg-white/10' : 'bg-white/5'} ${isIntentional ? 'text-purple-300' : 'text-white'}`}>
                                  <Icon size={32} className={isActive ? 'text-white' : 'text-white/50'} />
                                </div>
                                {isActive && <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1"><Check size={12} /> Active</div>}
                                {m.isDisabled && <div className="bg-white/10 text-white/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Coming Soon</div>}
                              </div>

                              <h3 className={`text-3xl font-bold mb-3 ${isActive ? 'text-white' : 'text-white/70'}`}>{m.title}</h3>
                              <p className="text-white/40 leading-relaxed text-sm md:text-base">{m.description}</p>
                            </div>

                            {/* Tags */}
                            {m.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {m.tags.map((t, idx) => (
                                  <span key={idx} className={`text-xs px-3 py-1.5 rounded-lg border ${t.warn ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                    {t.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      </motion.div>
                    )
                  })}
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
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
  tasks,
  habits,
  onUpdateTasks,
  onUpdateHabits,
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
          animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black/70 backdrop-blur-2xl"
          onClick={closeLibrary}
        >
          <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden relative pt-12">
            {/* GLOBAL CLOSE BUTTON */}
            <div className="absolute top-6 right-6 z-[70]">
              <CloseButton onClick={closeLibrary} />
            </div>

            {/* LEFT: STANDARD NOTES (60%) */}
            <div className="w-full lg:w-[60%] flex flex-col h-full relative">
              <div className="w-full flex flex-col items-center pt-2 md:pt-6 pb-4 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                        className="relative aspect-square bg-white/5 border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors rounded-sm flex items-center justify-center group cursor-default w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPro();
                        }}
                      >
                        <div className="relative z-10 flex flex-col items-center gap-2">
                          <Lock size={32} className="text-white/30 group-hover:text-cyan-400 transition-colors" />
                          <span className="text-xs uppercase tracking-widest text-white/30 group-hover:text-cyan-400 transition-colors font-medium">Unlock</span>
                          {/* COUNT FOR LOCKED STATE */}
                          <span className="text-[10px] font-mono text-white/30 font-medium">3 / 3</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onMouseMove={handleGlowMove}
                        className="relative aspect-square bg-white/5 border-2 border-dashed border-white/20 hover:border-white/50 transition-colors rounded-sm flex items-center justify-center group !cursor-default w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] overflow-hidden"
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
                          style={{ backgroundColor: note.color || '#ffeb3b', touchAction: 'none', cursor: 'default' }}
                          className={`aspect-square shadow-xl p-4 md:p-6 text-black relative group !cursor-default active:cursor-grabbing flex flex-col overflow-hidden w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)]`}

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
                              {/* WalletIndicator removed */}
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
            </div>

            {/* RIGHT: SMART NOTES (40%) */}
            <div className="w-full lg:w-[40%] h-full flex flex-col border-t lg:border-t-0 lg:border-l border-dashed border-white/20 bg-white/0 overflow-hidden">
              <CalendarPanel
                tasks={tasks || []}
                habits={habits || []}
                notes={notes}
                allTags={allTags}
                onUpdateTasks={onUpdateTasks}
                onAddTask={(newTask) => onUpdateTasks([...(tasks || []), newTask])}
                onAddHabit={(newHabit) => onUpdateHabits([...(habits || []), newHabit])}
                onUpdateTask={(id, updates) => onUpdateTasks((tasks || []).map(t => t.id === id ? { ...t, ...updates } : t))}
                onUpdateHabit={(id, updates) => onUpdateHabits((habits || []).map(h => h.id === id ? { ...h, ...updates } : h))}
                onDeleteTask={(id) => onUpdateTasks((tasks || []).filter(t => t.id !== id))}
                onDeleteHabit={(id) => onUpdateHabits((habits || []).filter(h => h.id !== id))}
                onClose={closeLibrary}
              />
            </div>
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
            className="w-[85vw] md:w-[550px] aspect-square shadow-2xl relative flex flex-col p-6 md:p-8 overflow-hidden transition-colors duration-500 rounded-sm max-h-[85vh]"
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
        <AnimatePresence mode="wait">
          {!isOpen && (
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
          className="fixed bottom-6 right-24 z-50 hidden md:block"
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
  const [userHandle, setUserHandle] = useState("");
  const [showLoginBtn, setShowLoginBtn] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [user, setUser] = useState(null);
  const { totalUnread: unreadCount, markAsRead, getLastReadTime, unreadCounts, mentionCounts, totalMentions } = useUnreadMessages(user);
  const [onboardingStep, setOnboardingStep] = useState(() => {
    const hasHandle = localStorage.getItem('zen_user_handle'); // <--- CHECK THIS
    return hasHandle ? 3 : (localStorage.getItem('pomodoro_user_name') ? 3 : 0);
  });
  const [onboardingInnerStep, setOnboardingInnerStep] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const DEFAULT_SETTINGS = { focus: 25, shortBreak: 5, longBreak: 15, autoStartBreaks: false, autoStartWork: false, pomosBeforeLongBreak: 4, background: 'https://images.unsplash.com/photo-1534996858221-380b92700493?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8MHxwaG90by1wYWdlfHx8fA%3D%3D', backgroundOpacity: 0.3, backgroundBrightnessMap: {}, alarmSound: 'digital', alarmVolume: 0.5, clockType: 'default', clockStyle: 'filled', clockSize: 'medium' };
  const [initialState] = useState(loadTimerState);
  const [mode, setMode] = useState(initialState?.mode || 'focus');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft || DEFAULT_SETTINGS.focus * 60);
  const [isActive, setIsActive] = useState(initialState?.isActive || false);
  // FIX: Force timer restart when mode stays same (Focus -> Focus)
  const [timerResetKey, setTimerResetKey] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);

  // ---- COINS ----
  const [coins, setCoins] = useState(() => Storage.getWallet().balance);
  const [vaultOpen, setVaultOpen] = useState(false);
  const coinBufferRef = useRef(0); // Internal counter for seconds

  // Ref to hold lateast state for Sync Replies without re-running effects
  const latestStateRef = useRef({ isActive: false, mode: 'focus', timeLeft: 25 * 60 });
  // Update this ref whenever state changes
  useEffect(() => {
    latestStateRef.current = { isActive, mode, timeLeft };
  }, [isActive, mode, timeLeft]);


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

  // --- PROFILE VIEW STATE ---
  const [viewingProfile, setViewingProfile] = useState(null);

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



  // --- INTENTION MODE STATE ---
  const [intentionTask, setIntentionTask] = useState(() => localStorage.getItem('zen_intention_task') || "");
  const [holoNoteContent, setHoloNoteContent] = useState(() => localStorage.getItem('zen_holo_note') || "1. Stretch\n2. Drink water\n3. Check messages");

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

  const handleSaveHoloNote = (content) => {
    setHoloNoteContent(content);
    localStorage.setItem('zen_holo_note', content);
  };

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

    // AI SESSION PLANNER
    let plan = null;
    if (durationInput && (durationInput.length > 3 || isNaN(parseFloat(durationInput)))) {
      // Show loading glow
      setIsAIPlanning(true);
      try {
        // Only ask AI if input is complex (e.g. "Work deep until 5pm") or non-trivial
        // Or if user specifically asks.
        // Actually, let's try strict: If durationInput exists, we check if it is just a number.
        plan = await generateSessionPlan(task, durationInput);
      } finally {
        setIsAIPlanning(false);
      }
    }

    let newFocus = settings.focus;
    let newShortBreak = settings.shortBreak;
    let newPomos = settings.pomosBeforeLongBreak;

    if (plan && plan.focus) {
      newFocus = plan.focus;
      newShortBreak = plan.shortBreak || 5;
      newPomos = plan.sessions || 4;
    } else {
      // Fallback or Simple Number Logic
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
  const [hoveredDockIndex, setHoveredDockIndex] = useState(null);
  // Load Stats from Cache
  const [stats, setStats] = useState(() => {
    // --- FIX: Force Check Daily Reset on Load ---
    Storage.checkDailyReset();

    // Attempt to load today's stats from LS, otherwise default
    const local = localStorage.getItem('zen_stats_current');
    return local ? JSON.parse(local) : DEFAULT_STATS;
  });

  // --- FIX: Hydrate History from Server on Load ---
  useEffect(() => {
    const syncHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Fetch all history
          const { data } = await supabase.from('history').select('*').eq('user_id', user.id);
          if (data) Storage.hydrateHistory(data);
        } catch (e) {
          console.error("History Sync Failed", e);
        }
      }
    };
    syncHistory();
  }, []);

  // --- SYNC NOTES ON LOAD (Fix for Deletion Sync) ---
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const syncNotes = async () => {
      try {
        const { data } = await supabase
          .from('user_settings')
          .select('notes')
          .eq('user_id', user.uid)
          .maybeSingle();

        if (data) {
          // Sync Notes - Force update even if empty (handles deletions)
          const serverNotes = data.notes || [];
          setNotes(serverNotes);
          Storage.saveNotesLocally(serverNotes);
        } else {
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

  const [devMode, setDevMode] = useState(false);
  const [customBackgrounds, setCustomBackgrounds] = useState(() => { try { const saved = localStorage.getItem('zen_custom_bgs'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; } });
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
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
  const [extraFocusPopup, setExtraFocusPopup] = useState({ visible: false, minutes: 0 });
  const [smartMessageOverride, setSmartMessageOverride] = useState(null);
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
  }, []);

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
  const [highlightCaffeine, setHighlightCaffeine] = useState(false);

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
  const [isAIPlanning, setIsAIPlanning] = useState(false);

  // NEW: Track ACTUAL total duration of the current session (for progress bar when time is edited)
  const [currentSessionTotalDuration, setCurrentSessionTotalDuration] = useState(null);

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
          setShowLoginBtn(false);
          setIsMigrating(false);
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
            setShowLoginBtn(false);
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
        await supabase.from('user_settings').upsert({
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
        await supabase.from('user_settings').upsert({
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
        await supabase.from('user_settings').upsert({
          user_id: user.uid,
          notes: updatedNotes,
          trash: updatedTrash,
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

  // Wrapper to save volume on change
  const handleSetVolume = (newVol) => {
    setVolume(newVol);
    Storage.setVolume(newVol);
  };

  // 1. MUSIC (Focus Tracks)
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
  const [friendConfig, setFriendConfig] = useState({}); // Stores { uid: { isPinned: true/false } }
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStrictMenuOpen, setIsStrictMenuOpen] = useState(false);
  const [isBmcMenuOpen, setIsBmcMenuOpen] = useState(false);


  // --- STRICT MODE STATE & LOGIC ---
  const [strictMode, setStrictMode] = useState(() => localStorage.getItem('zen_strict_mode') === 'true');
  const [showStrictConfirm, setShowStrictConfirm] = useState(false);
  const [showStrictWarning, setShowStrictWarning] = useState(false);
  const [showStrictDisableConfirm, setShowStrictDisableConfirm] = useState(false);
  // NEW: Spotify Promo Popup State
  const [showSpotifyPromo, setShowSpotifyPromo] = useState(() => !localStorage.getItem('zen_spotify_promo_dismissed'));
  const [showVideoPromo, setShowVideoPromo] = useState(() => !localStorage.getItem('zen_video_promo_dismissed'));
  
  const handleDismissSpotifyPromo = () => {
    setShowSpotifyPromo(false);
    localStorage.setItem('zen_spotify_promo_dismissed', 'true');
  };
  
  const handleDismissVideoPromo = () => {
    setShowVideoPromo(false);
    localStorage.setItem('zen_video_promo_dismissed', 'true');
  };

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
    // Initialize audio refs for ALL available alarm sounds
    ALARM_SOUNDS.forEach(sound => {
      const audio = new Audio(sound.src);
      audio.preload = 'auto';
      // Volume will be set dynamically on play
      audioRefs.current[sound.id] = audio;
    });
  }, []); // Run once on mount

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

  const playAlarm = (currentMode) => {
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
    unsavedSecondsRef.current = 0;
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
        currentStreak: currentStreak // Ensure streak is synced to public stats
      },
      streak: currentStreak,
      wallet: Storage.getWallet(),
      inventory: Storage.getInventory()
    };

    setStats(prev => ({ ...prev, currentStreak }));
    lastRemoteUpdate.current = payload.timerState.lastUpdated;

    try {
      const todayId = formatDateId(new Date());

      // 1. Update Profile (Public presence + stats)
      const { error } = await supabase.from('profiles').update({
        timer_state: payload.timerState,
        stats: payload.stats,
        // streak: payload.streak, // If you add streak column to profiles
        last_active: new Date()
      }).eq('id', user.uid); // user.uid is mapped from user.id

      // 2. Personal History Log
      // We use upsert to ensure date row exists
      await supabase.from('history').upsert({
        user_id: user.uid,
        date_id: todayId,
        focus_time: payload.stats.dailyFocusTime,
        break_time: payload.stats.dailyBreakTime,
        sessions: payload.stats.dailySessions,
        data: payload.stats
      }, { onConflict: 'user_id, date_id' });

      // 3. User Settings (Wallet/Inventory)
      await supabase.from('user_settings').upsert({
        user_id: user.uid,
        wallet: payload.wallet,
        inventory: payload.inventory,
        updated_at: new Date()
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
  }, []);

  const handleUserMapping = async (supaUser) => {
    // GUARD: Skip Auth check if in Demo Mode
    if (window.location.search.includes('demo=')) {
      setIsAuthChecking(false);
      setIsAppReady(true);
      return;
    }



    if (supaUser) {
      // 1. FETCH PROFILE DATA (Handle, About, Pro Status)
      let profileData = {};
      try {
        const { data } = await supabase
          .from('profiles')
          .select('handle, about, is_pro')
          .eq('id', supaUser.id)
          .maybeSingle();
        if (data) profileData = data;
      } catch (e) { console.error("Profile fetch error", e); }

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
        setShowLoginBtn(false);
        setDataLoaded(true);
        return;
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
        setIsMigrating(false);
      }

    } else {
      setUser(null);
      if (onboardingStep !== 3) setOnboardingStep(0);
      setDataLoaded(false);
    }

    setIsAuthChecking(false);
  };

  // --- DEMO MODE HANDLER ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoMode = params.get('demo');

    if (demoMode) {
      console.log("🚀 ACTIVATING DEMO MODE:", demoMode);

      // 1. SKIP ONBOARDING
      setOnboardingStep(3);

      // 2. SET DUMMY USER
      const dummyUser = {
        uid: 'demo-user-123',
        displayName: 'Caffeine demo',
        photoURL: null,
        email: 'demo@example.com',
        isAnonymous: true // Treated as guest infrastructure but locally Pro
      };

      setUser(dummyUser);
      setIsPro(true); // Force Pro

      // 3. FEATURE SPECIFIC TRIGGERS
      if (demoMode === 'caffeine') {
        setTimeout(() => setHighlightCaffeine(true), 800);
      }
    }
  }, []);

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

    if (data.timer_state) {
      const ts = data.timer_state;
      const lastUpdated = ts.lastUpdated || 0;
      const timeSinceUpdate = now - lastUpdated;

      // LOGIC FIX: If timer is actively running and has time left, user IS online.
      const isTimerRunning = ts.isActive && (ts.targetEndTime - now > 0);
      const isStale = !isTimerRunning && (timeSinceUpdate > GRACE_PERIOD);

      if (!isStale) {
        isOnline = true;
        if (ts.isActive) {
          const remaining = Math.ceil((ts.targetEndTime - now) / 1000);
          if (remaining > 0) {
            isActive = true;
            mode = ts.mode;
            timeLeft = remaining;
            statusText = `${mode === 'focus' ? 'Focus' : 'Break'} • ${Math.floor(timeLeft / 60)}m`;

            // Override Online Status for Focus Mode specifically
            // Even if they haven't moved mouse (lastUpdated is old), the timer proves they are here.
            isOnline = true;
          } else {
            isActive = false;
            statusText = "Idle";
          }
        } else {
          isActive = false;
          statusText = "Paused";
        }
      } else {
        isOnline = false;
        statusText = "Offline";
      }
    }
    return { isOnline, isActive, statusText, mode, timeLeft };
  }, []);

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
    if (!user) { setFriends([]); return; }

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

    const presenceChannel = supabase.channel('social_presence')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (friendUids.includes(payload.new.id)) {
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
        }
      )
      .subscribe();

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
      supabase.removeChannel(presenceChannel);
      clearInterval(interval);
    };
  }, [user, friendUids.join(','), calculateFriendStatus]);

  // --- ACTIONS ---

  const handleSendRequest = useCallback(async (targetUser) => {
    if (!user) return { success: false, error: "Not logged in" };
    if (targetUser.uid === user.uid) return { success: false, error: "You can't add yourself." };

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.uid, receiver_id: targetUser.uid });

      if (error) {
        if (error.code === '23505') return { success: false, error: "Request already sent/exists." };
        throw error;
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: "Failed to send." };
    }
  }, [user]);

  const handleCheckOutgoingRequest = useCallback(async (targetUserId) => {
    if (!user) return false;
    const { data } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', user.uid)
      .eq('receiver_id', targetUserId)
      .maybeSingle();
    return !!data;
  }, [user]);

  const handleBlockUser = useCallback(async (targetUser) => {
    if (!user) return;
    try {
      const targetUid = targetUser.uid || targetUser;
      await supabase.from('blocked_users').insert({ user_id: user.uid, blocked_user_id: targetUid });
      await supabase.from('friend_requests').delete().or(`sender_id.eq.${targetUid},receiver_id.eq.${targetUid}`);
      await supabase.from('friendships').delete().eq('user_id', user.uid).eq('friend_id', targetUid);
      setFriends(prev => prev.filter(f => f.uid !== targetUid));
    } catch (e) { console.error("Block failed", e); }
  }, [user]);

  const handleUnblockUser = useCallback(async (blockedUid) => {
    if (!user) return;
    try {
      await supabase.from('blocked_users').delete().eq('user_id', user.uid).eq('blocked_user_id', blockedUid);
      setBlockedUsers(prev => prev.filter(b => b.uid !== blockedUid));
    } catch (e) { console.error("Unblock failed", e); }
  }, [user]);

  const handleAcceptRequest = useCallback(async (requestObj) => {
    if (!user || !requestObj.requestId) return { success: false, error: "Invalid request" };
    try {
      console.log("Accepting request via V2:", requestObj.requestId);
      const { error } = await supabase.rpc('confirm_friendship', { req_id: requestObj.requestId });

      if (error) {
        console.error("V2 RPC Error:", error);
        throw error;
      }

      // SUCCESS: Force Fetch Friendship Data to get the Profile Stats immediately
      const { data, error: fetchError } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          is_pinned,
          profile:profiles!friend_id (
             id, display_name, handle, photo_url, is_pro, timer_state, last_active, stats
          )
        `)
        .eq('user_id', user.uid);

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
      await supabase
        .from('friend_requests')
        .delete()
        .eq('receiver_id', user.uid)
        .eq('sender_id', requesterId);
    } catch (e) { console.error("Decline failed", e); }
  }, [user]);

  const handleRemoveFriend = useCallback(async (friendId) => {
    if (!user) return;
    setFriends(prev => prev.filter(f => f.uid !== friendId)); // Optimistic UI update

    try {
      // Use RPC for atomic reciprocal removal
      const { error } = await supabase.rpc('remove_friend', { friend_uid: friendId });

      if (error) {
        console.error("RPC Remove failed, falling back to manual deletion", error);
        // Fallback: Manual Double Delete
        await supabase.from('friendships').delete().match({ user_id: user.uid, friend_id: friendId });
        await supabase.from('friendships').delete().match({ user_id: friendId, friend_id: user.uid });
      }
    } catch (e) {
      console.error("Remove failed completely", e);
    }
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
      const { data, error } = await supabase.rpc('search_users', { search_query: term });
      if (data) {
        return data.map(u => ({
          uid: u.id,
          displayName: u.display_name,
          handle: u.handle,
          photoURL: u.photo_url
        }));
      }
    } catch (e) { console.error("Search failed", e); }
    return [];
  }, []);

  // --- End Social Logic ---

  // --- UPDATED SYNC EFFECT (FIXED) ---
  // --- UPDATED SYNC EFFECT (SUPABASE MIGRATION) ---
  useEffect(() => {
    if (!user) return;

    // A. SYNC SETTINGS (Notes, Trash, Wallet, Inventory, App Settings)
    // [LOCAL-FIRST] Listener removed to prevent overwrite loops. 
    // We now trust local state and only fetch once on mount.

    // B. SYNC PROFILE (Handle, Pro Status, Streak)
    // [LOCAL-FIRST] Listener removed. We rely on initial fetch and local optimistic updates.



    const initStreak = async () => {
      // 1. Calculate Local Streak (Most up-to-date regarding today's activity)
      const localHistory = Storage.getFullHistory();
      const localStreak = Storage.calculateStreak(localHistory);

      // 2. Fetch Server Streak (Authoritative for past history on new devices)
      const { data: serverStreak } = await supabase.rpc('get_current_streak', { user_id_input: user.uid });

      // 3. Reconcile: Trust the higher number (Union of knowledge)
      const finalStreak = Math.max(localStreak, serverStreak || 0);

      if (finalStreak > 0) {
        setStats(prev => ({ ...prev, currentStreak: finalStreak }));

        // 4. Force Sync Authoritative Streak to Profile (for friends)
        // Only update if needed or to ensure consistency
        if (finalStreak !== serverStreak) {
          await supabase.from('profiles').update({
            streak: finalStreak,
            stats: {
              ...stats,
              currentStreak: finalStreak
            }
          }).eq('id', user.uid);
        }
      } else {
        setStats(prev => ({ ...prev, currentStreak: 0 }));
      }
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

          // 3. WALLET / INVENTORY
          if (serverData.wallet) {
            const localWallet = Storage.getWallet();
            // FIX: If local wallet is fresh (no timestamp AND empty), take server data
            const isLocalFresh = !localWallet.lastUpdated && (!localWallet.balance || localWallet.balance === 0);
            const isServerNewer = (serverData.wallet.lastUpdated || 0) > (localWallet.lastUpdated || 0);

            if (isLocalFresh || isServerNewer) {
              Storage.setWallet(serverData.wallet);
              setCoins(serverData.wallet.balance || 0);
            }
          }
          if (serverData.inventory) Storage.setInventory(serverData.inventory);

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
            const { error } = await supabase.from('user_settings').insert({
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
          const { data: todayHistory } = await supabase
            .from('history')
            .select('*')
            .eq('user_id', user.uid)
            .eq('date_id', todayId)
            .maybeSingle();

          if (todayHistory) {
            const hydrated = Storage.hydrateTodayStats(todayHistory);
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
  }, [user]);


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

        await supabase.from('user_settings').upsert({
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
      await supabase.auth.signOut();

      // 1. Clear ALL Persistent Data (Centralized)
      Storage.clearAll();

      // 2. Reset UI State
      setIsMigrating(false);
      setIsMigrating(false);
      setOnboardingStep(0);
      setOnboardingInnerStep(0);
      setIsPro(false); // Explicit state update
      setCoins(0);     // Reset wallet UI
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

          // --- 5. COIN LOGIC (NEW) ---
          if (mode === 'focus') {
            coinBufferRef.current += secondsPassed;
            if (coinBufferRef.current >= 60) {
              const newCoins = Math.floor(coinBufferRef.current / 60);
              coinBufferRef.current %= 60; // Keep remainder

              const updatedWallet = Storage.updateWallet(newCoins);
              setCoins(updatedWallet.balance);
            }
          }
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
            let intendedTimeLeft = (Number(settings.shortBreak) || 5) * 60;

            if (pomoCount + 1 >= (Number(settings.pomosBeforeLongBreak) || 4)) {
              intendedNextMode = 'longBreak';
              intendedTimeLeft = (Number(settings.longBreak) || 15) * 60;
            }

            // 2. ELON MUSK LOGIC (Skip Break Check)
            let skipBreak = false;

            // (Elon logic removed)

            if (skipBreak) {
              // ELON MODE: SKIP BREAK
              // We go straight back to FOCUS
              nextMode = 'focus';
              nextTimeLeft = (Number(settings.focus) || 25) * 60;

              // Respect User Setting for Auto-Start
              nextIsActive = settings.autoStartWork;

              // NEW: Show Smart Pill Message (Purple Shimmer)
              const msg = ELON_MSG[Math.floor(Math.random() * ELON_MSG.length)];
              setSmartMessageOverride(msg);
              new Audio('/sounds/breakskipped.mp3').play().catch(e => console.error("Break skipped sound failed", e));
              setTimeout(() => {
                setSmartMessageOverride(null);
              }, 60000); // Show for 1 minute

            } else {
              // NORMAL BEHAVIOR
              nextMode = intendedNextMode;
              nextTimeLeft = intendedTimeLeft;
              if (settings.autoStartBreaks) nextIsActive = true;
            }

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
      }, 100); // 100ms resolution is fine for checking updates
    } else {
      endTimeRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, mode, settings, pomoCount, devMode, strictMode, timerResetKey]);

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
    if (isAIPlanning) return;

    // 1. Flush: effectively does nothing now (Silent)
    if (isActive) flushUnsavedTime();

    const newIsActive = !isActive;
    setIsActive(newIsActive);

    // 2. Extension Sync (Browser API only, no DB)
    syncWithExtension(newIsActive, strictMode, mode);

    if (newIsActive) {
      lastHeartbeatRef.current = Date.now();
      setHasStartedSession(true); // Mark session as started
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
    setTimeLeft(settings['focus'] * 60);
    setPomoCount(0);
    setPomoCount(0);
    endTimeRef.current = null;
    setHasStartedSession(false); // Reset session tracking
    setCurrentSessionTotalDuration(null); // Reset dynamic duration

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
    setHasStartedSession(false); // Reset session tracking
    setCurrentSessionTotalDuration(null); // Reset dynamic duration

    // Sync Mode Change
    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: newMode,
      timeLeft: settings[newMode] * 60,
    });
  };

  const isTimerRunning = isActive || (timeLeft < settings[mode] * 60 && timeLeft > 0);

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
    setShowSettings(false);

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
        lastRemoteUpdate.current = timerState.lastUpdated;

        // 1. Save Settings
        await supabase.from('user_settings').upsert({
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
        lastRemoteUpdate.current = timerState.lastUpdated;

        await supabase.from('user_settings').upsert({
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
      window.location.href = data.url;

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

      await supabase.from('user_settings').upsert({
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
      const { data } = await supabase.from('profiles').select('*').eq('handle', '@' + cleanHandle).single();
      if (data) setViewingProfile(data);
      else {
        // Try without @
        const { data: data2 } = await supabase.from('profiles').select('*').eq('handle', cleanHandle).single();
        if (data2) setViewingProfile(data2);
        else alert("User not found");
      }
    } catch (e) { console.error(e); }
  };

  const handleBackgroundChange = (bgSrc) => {
    // 1. Save Current Brightness to Map
    const currentBg = settings.background;
    const currentOpacity = settings.backgroundOpacity;
    const brightnessMap = { ...(settings.backgroundBrightnessMap || {}) };
    if (currentBg) {
      brightnessMap[currentBg] = currentOpacity;
    }

    // 2. Retrieve Saved Brightness for New Bg (or default to 0.3)
    const savedOpacity = brightnessMap[bgSrc] !== undefined ? brightnessMap[bgSrc] : 0.3;

    // 3. Prepare New Settings with Timestamp
    const newSettings = {
      ...settings,
      background: bgSrc,
      backgroundOpacity: savedOpacity,
      backgroundBrightnessMap: brightnessMap,
      updatedAt: Date.now()
    };

    // 4. Save to Local Storage IMMEDIATELY
    Storage.saveSettingsLocally(newSettings);

    // 5. Update React State (Visuals)
    setSettings(newSettings);
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

  const [showBreakCheckIn, setShowBreakCheckIn] = useState(false);
  // Break Check-in Logic
  useEffect(() => {
    if (mode === 'shortBreak' || mode === 'longBreak') {
      setShowBreakCheckIn(true);
    } else {
      setShowBreakCheckIn(false);
    }
  }, [mode]);

  // Background Logic:
  // 1. Intention Mode (Wizard OR Session): ALWAYS Show Video
  // 2. Standard: Show settings.background
  const useIntentionTheme = false; // DEPRECATED: We use video for everything in Intention Mode now
  const activeBackground = settings.intentionMode ? INTENTION_VIDEO : settings.background;

  // FIX: Only show intervention if session has actually started (hasStartedSession)
  const showIntervention = settings.intentionMode && intentionTask && mode === 'focus' && !isActive && timeLeft !== settings.focus * 60 && timeLeft > 0 && hasStartedSession;

  if (isAuthChecking) return <AppLoader />;


  return (
    <VideoManager user={user}>

      <div className="h-[100dvh] md:min-h-screen bg-black text-white flex flex-col md:block relative overflow-hidden">
      <GlobalStyles />

      {/* 1. BACKGROUND LAYERS (Main Window) */}
      {useIntentionTheme ? (
        // HOLO GRAIN THEME (Replaces Gradient)
        <HoloGrainBackground isActive={isActive} playButtonRef={playBtnRef} />
      ) : (
        // STANDARD / VIDEO BACKGROUND
        activeBackground && (
          isVideo(activeBackground) ? (
            <div className="fixed inset-0 z-0 overflow-hidden">
              <video
                ref={mainVideoRef}
                src={activeBackground}
                autoPlay loop muted playsInline disablePictureInPicture
                style={{
                  filter: 'brightness(1.2) contrast(1.1)', // Brightened as requested
                  transform: 'translateZ(0)',
                  opacity: settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5
                }}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000"
              style={{
                backgroundImage: `url(${activeBackground})`,
                opacity: settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5
              }}
            />
          )
        )
      )}

      {/* 2. OVERLAY LAYER (Standard dimming, disabled for Gradient to keep it vivid?) */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none transition-colors duration-1000 ease-in-out"
        style={{
          backgroundColor: (activeBackground && !useIntentionTheme)
            ? 'transparent' // We handle dimming via image opacity
            : useIntentionTheme
              ? 'rgba(0,0,0,0)'
              : focusMode
                ? 'rgba(0, 0, 0, 0.5)'
                : 'rgba(0, 0, 0, 0.55)'
        }}
      />
      {!activeBackground && !useIntentionTheme && (<div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-0" />)}

      {/* 1.5 BACKGROUND LAYERS (PiP Window - Duplicated) */}
      <PiPPortal>
        {useIntentionTheme ? (
          <HoloGrainBackground isActive={isActive} playButtonRef={playBtnRef} />
        ) : (
          activeBackground && (
            isVideo(activeBackground) ? (
              <div className="fixed inset-0 z-0 overflow-hidden">
                <video
                  ref={mainVideoRef}
                  src={activeBackground}
                  autoPlay loop muted playsInline disablePictureInPicture
                  style={{
                    filter: 'brightness(1.2) contrast(1.1)',
                    transform: 'translateZ(0)',
                    opacity: settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000"
                style={{
                  backgroundImage: `url(${activeBackground})`,
                  opacity: settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5
                }}
              />
            )
          )
        )}
        <div
          className="fixed inset-0 z-[1] pointer-events-none transition-colors duration-1000 ease-in-out"
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
      </PiPPortal>



      {/* --- ONBOARDING FLOW --- */}
      <VideoPipWindow 
        isSocialModalOpen={showFriends} 
        onExpand={(serverId) => {
          // If we have an active video server, we want the modal to open TO that server.
          if (serverId) {
             setSocialInitialServerId(serverId);
             setSocialInitialTab('video');
          }
          setShowFriends(true); 
        }} 
      />
      {onboardingStep < 3 && (
        <OnboardingFlow
          user={user}
          onComplete={() => setOnboardingStep(3)}
          currentStep={onboardingInnerStep}
          onStepChange={setOnboardingInnerStep}
        />
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
            <div className={`md:hidden flex justify-between items-center w-full p-6 z-20 flex-shrink-0 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>
              <div className="flex items-center gap-2">
                <RevealLogo src="/logo/altimerwhite.png" className="w-10 h-10" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowMusic(true)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isMusicPlaying ? 'text-white animate-pulse' : 'text-white'}`}>
                  <Music size={22} />
                </button>
                <button onClick={() => { if (checkGuestAccess()) setShowFriends(true); }} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
                  <Users size={22} />
                </button>
                <button onClick={() => setIsUnifiedModalOpen(true)} className="relative ml-2 w-8 h-8">
                  <Avatar userData={user} photoURL={user?.photoURL} name={user?.displayName} size="full" isPro={isPro} />
                </button>
              </div>
            </div>

            {/* --- DESKTOP HEADER --- */}
            <div className={`hidden md:flex flex-col items-end absolute top-8 right-12 z-20 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>
              <div className="flex items-center gap-4">
                <WalletIndicator balance={coins} onClick={() => { if (checkGuestAccess()) setVaultOpen(true); }} />
                <button onClick={() => setIsUnifiedModalOpen(true)} className="relative group w-9 h-9 transition-transform hover:scale-105 active:scale-95">
                  <Avatar userData={user} photoURL={user?.photoURL} name={user?.displayName} size="full" isPro={isPro} />
                </button>
              </div>
            </div>

            {/* --- DESKTOP FOOTER LEFT --- */}
            <div className={`hidden md:flex flex-col items-start absolute bottom-8 left-12 z-50 transition-opacity duration-700 ease-in-out ${uiOpacityClass}`}>
              {dashboardFriends.length > 0 && (
                <FriendsDock 
                  friends={dashboardFriends} 
                  onViewFriendStats={handleViewFriendStats} 
                />
              )}
              <motion.div layout onMouseLeave={() => setHoveredDockIndex(null)} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex items-center gap-0 p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                <motion.button layout onMouseEnter={() => setHoveredDockIndex(0)} onClick={() => { if (checkGuestAccess()) { setShowFriends(true); handleDismissVideoPromo(); } }} className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white group flex items-center cursor-default">
                  
                  {/* Video Promo Popup */}
                  <AnimatePresence>
                    {showVideoPromo && !isMusicPlaying && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, x: -29, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, x: -29, scale: 1 }}
                        exit={{ opacity: 0, y: 5, x: -29, scale: 0.9 }}
                        className="absolute bottom-full mb-4 left-1/2 z-[100] cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                       <div className="relative bg-[#0018b8] text-white px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(45,140,255,0.4)] flex items-center gap-3 whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-[24px] after:border-[6px] after:border-transparent after:border-t-[#0018b8]">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Video size={16} className="text-white" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-xs font-bold tracking-tight leading-tight">Video rooms are now available</span>
                             <span className="text-[10px] text-white/80 font-medium leading-tight">Hold each other accountable. Find it in Servers &gt; Video</span>
                          </div>
                          <button
                            onClick={() => handleDismissVideoPromo()}
                            className="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors ml-1"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="relative">
                    <Users size={20} className={((unreadCount > 0 || totalMentions > 0) && mode !== 'focus') ? "text-white" : ""} />
                    {((unreadCount > 0 || totalMentions > 0) && mode !== 'focus') && <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#1a0c00] ${totalMentions > 0 ? 'bg-blue-500' : 'bg-red-500'}`} />}
                  </div>
                  <motion.span layout className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-smooth ${((unreadCount > 0 || totalMentions > 0) && mode !== 'focus') ? "max-w-[150px] opacity-100 ml-2 text-white" : "max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2"}`}>
                    {(totalMentions > 0 && mode !== 'focus') ? `${totalMentions} Mention${totalMentions > 1 ? 's' : ''}` : (unreadCount > 0 && mode !== 'focus') ? "New Message" : "Friends"}
                  </motion.span>
                </motion.button>
                <BendingDivider activeSide={hoveredDockIndex === 0 ? 'left' : hoveredDockIndex === 1 ? 'right' : null} isDimmed={isMusicPlaying} />
                <motion.div layout role="button" onMouseEnter={() => setHoveredDockIndex(1)} onClick={() => { setShowMusic(true); handleDismissSpotifyPromo(); }} className={`relative p-2 rounded-full transition-colors group flex items-center cursor-default ${isMusicPlaying ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>

                  {/* Wrapper for Icon + Popup to ensure centering works on the ICON ONLY */}
                  <div className="relative flex items-center justify-center">
                    {/* Spotify Promo Popup */}
                    <AnimatePresence>
                      {showSpotifyPromo && !isMusicPlaying && !showMusic && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, x: -29, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, x: -29, scale: 1 }}
                          exit={{ opacity: 0, y: 5, x: -29, scale: 0.9 }}
                          className="absolute bottom-full mb-4 left-1/2 z-[100] cursor-default"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative bg-[#1DB954] text-black px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(29,185,84,0.4)] flex items-center gap-3 whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-[24px] after:border-[6px] after:border-transparent after:border-t-[#1DB954]">
                            {/* Fix: Set inner fill to #1DB954 (Green) to match background, simulating transparency */}
                            <SpotifyIcon size={20} innerFillClassName="fill-[#1DB954]" className="shrink-0 text-black appearance-none" />
                            <span className="text-xs font-bold tracking-tight">Play Spotify directly from altimer!</span>
                            <button
                              onClick={() => handleDismissSpotifyPromo()}
                              className="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors ml-1"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Music size={20} className={`relative z-10 ${isMusicPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
                  </div>

                  <motion.div layout className="flex items-center overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-smooth">
                    {isMusicPlaying ? (<button onClick={(e) => { e.stopPropagation(); handlePauseMusic(); }} className="ml-2 px-2 py-0.5 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200"><Pause size={10} fill="black" /></button>) : (<span className="text-sm font-medium ml-2">Music</span>)}
                  </motion.div>
                </motion.div>
                <BendingDivider activeSide={hoveredDockIndex === 1 ? 'left' : (hoveredDockIndex === 2 || isStrictMenuOpen) ? 'right' : null} isDimmed={isMusicPlaying || strictMode} />
                <LiquidStrictBtn isStrict={strictMode} onEnable={enableStrictMode} onDisable={handleStrictDisable} onMouseEnter={() => setHoveredDockIndex(2)} isLocked={isStrictLocked} isExtensionConnected={isExtensionConnected} mode={mode} onMenuChange={setIsStrictMenuOpen} />
                {/* <BendingDivider activeSide={(hoveredDockIndex === 2 || isStrictMenuOpen) ? 'left' : (hoveredDockIndex === 3) ? 'right' : null} isDimmed={strictMode} />
                <motion.button layout onMouseEnter={() => setHoveredDockIndex(3)} onClick={() => { setShowCaffeine(true); setHighlightCaffeine(false); }} className={`relative p-2 rounded-full transition-colors group flex items-center ${showCaffeine ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  {highlightCaffeine && (<div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce text-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] pointer-events-none z-50"><ArrowDown size={32} strokeWidth={3} /><div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rotate-45" /></div>)}
                  <Coffee size={20} className={showCaffeine ? 'text-yellow-400' : ''} />
                  <motion.span layout className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ease-smooth ${showCaffeine ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2'}`}>Caffeine</motion.span>
                </motion.button> */}
              </motion.div>
            </div>

            {/* --- DESKTOP LOGO --- */}
            <div className={`hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-1000 ease-out delay-500 ${onboardingStep === 3 ? uiOpacityClass : 'opacity-0 pointer-events-none'}`}>
              <RevealLogo src="/logo/altimerwhite.png" className="w-14 h-14" />
            </div>

            {/* --- TIMER SECTION (Main) --- */}
            <PiPPortal>
              <main className="flex-1 flex flex-col items-center justify-center min-h-0 w-full px-4 pt-16 pb-40 md:pb-0 relative md:absolute md:inset-0 z-10 md:pointer-events-none">
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
                                : smartMessageOverride
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
                    getGeminiAdvice={getGeminiAdvice}
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
                  <div className="flex items-center justify-center mb-2 h-10 w-full max-w-md">
                    {[{ id: 'focus', label: 'Focus' }, { id: 'shortBreak', label: 'Short Break' }, { id: 'longBreak', label: 'Long Break' }].map((m) => {
                      const isCurrent = mode === m.id;
                      const isEditing = editingModeId === m.id;
                      // FIX: Use dynamic session duration if available for current mode, else default
                      const defaultSeconds = settings[m.id] * 60;
                      const totalSeconds = (isCurrent && currentSessionTotalDuration) ? currentSessionTotalDuration : defaultSeconds;

                      const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

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
                                setEditInputValue(settings[m.id].toString());
                                setEditingModeId(m.id);
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
                              initial={{ opacity: 0, scale: 0.9 }}
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
                  <div
                    className="relative z-50 flex items-center justify-center gap-3 mb-2 h-8 cursor-default min-w-[100px]"
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
                    
                    ${/* FONT TYPE LOGIC */ ''}
                    ${(settings.clockType || 'default') === 'default' ? 'font-clock' : ''}
                    ${settings.clockType === 'sans' ? 'font-clock-sans' : ''}
                    ${settings.clockType === 'serif' ? 'font-clock-serif' : ''}
                    ${settings.clockType === 'mono' ? 'font-clock-mono' : ''}
                    ${settings.clockType === 'display' ? 'font-clock-display' : ''}
                    ${settings.clockType === 'digital' ? 'font-clock-digital' : ''}
                    ${settings.clockType === 'pixel' ? 'font-clock-pixel' : ''}
                    ${settings.clockType === 'cyber' ? 'font-clock-cyber' : ''}
                    ${settings.clockType === 'hand' ? 'font-clock-hand' : ''}
                    ${settings.clockType === 'block' ? 'font-clock-block' : ''}
                    ${settings.clockType === 'elegant' ? 'font-clock-elegant' : ''}
                    ${settings.clockType === 'neon' ? 'font-clock-neon' : ''}
                    ${settings.clockType === 'round' ? 'font-clock-round' : ''}
                    
                    ${({
                        'small': 'text-[15vw] md:text-[6rem] lg:text-[8rem]',
                        'medium': 'text-[18vw] md:text-[8rem] lg:text-[10rem]',
                        'giant': 'text-[22vw] md:text-[12rem] lg:text-[16rem]',
                        'mammoth': 'text-[25vw] md:text-[15rem] lg:text-[20rem]'
                      })[settings.clockSize] || 'text-[20vw] md:text-[10rem] lg:text-[12rem]'}

                    ${settings.clockStyle === 'outline' ? 'text-transparent' : 'text-white/90'}
                    ${isAIPlanning ? 'animate-pulse drop-shadow-[0_0_100px_rgba(192,132,252,1)] text-purple-100' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'}
                  `}
                    style={{
                      WebkitTextStroke: settings.clockStyle === 'outline' ? '2px rgba(255,255,255,0.9)' : undefined
                    }}
                  >
                    <CountdownTimer timeLeft={timeLeft} disableAnimation={isPiPActive} />
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
                      disabled={isAIPlanning}
                      className={`w-20 h-20 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_0_40px_rgba(255,255,255,0.2)] md:hover:scale-110 md:shadow-[0_0_40px_rgba(255,255,255,0.1)] cursor-default ${isAIPlanning ? 'opacity-30 cursor-not-allowed scale-90' : ''}`}
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

                  <ExtraTimePopup visible={extraFocusPopup.visible} minutes={extraFocusPopup.minutes} />

                  <GameCenter
                    mode={mode}
                    timeLeft={timeLeft}
                    background={settings.background}
                    isPro={isPro}
                    onOpenPro={() => setProModalSource('arcade')}
                  />

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
            </PiPPortal>

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

      {/* <CaffeineTracker
        isOpen={showCaffeine}
        onClose={() => setShowCaffeine(false)}
      /> */}

      <SocialModal
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

      <SocialProfileModal
        isOpen={!!viewingProfile}
        onClose={() => setViewingProfile(null)}
        user={viewingProfile}
        currentUser={user}
        onProfileUpdate={handleProfileUpdate}
        onAddFriend={
          // Only show Add Friend if NOT already friends and NOT self
          (!viewingProfile || (viewingProfile.id !== user.uid && !friendUids.includes(viewingProfile.id)))
            ? () => handleSendRequest(viewingProfile.id)
            : null
        }
        onMessage={() => {
          setViewingProfile(null);
          setShowFriends(true);
        }}
      />

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

      <VaultModal
        isOpen={vaultOpen}
        onClose={() => setVaultOpen(false)}
        balance={coins}
        onUpdateBalance={(newBalance) => setCoins(newBalance)}
        onSync={() => Storage.syncWalletInventory(user)}
        onActivatePro={(hours) => Storage.activateProSubscription(user, hours)}
      />

      {/* --- GLOBAL REMINDER SYSTEM (Hidden) --- */}
      <TaskReminderSystem tasks={tasks} />


      {/* --- COMMAND MENU --- */}
      {
        (onboardingStep >= 3 || onboardingInnerStep === 2) && (
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
        )
      }
      </div>
    </VideoManager>
  );
}

export default function App() {
  const pathname = window.location.pathname;

  if (pathname === '/releasenotes') {
    return <ReleaseNotesPage />;
  }

  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}