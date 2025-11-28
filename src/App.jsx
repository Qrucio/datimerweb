import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, X, Plus, Music, SkipForward, SkipBack, Check, Trash2, BarChart2, Zap, Coffee, Flame, CheckSquare, Clock, Sparkles, Loader2, RotateCw, GripVertical, ArrowRight, Pencil, LogIn, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, UserPlus, Circle, Pin, UserMinus, Maximize, Minimize } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously, } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot, Timestamp, collection, query, where, getDocs, orderBy, getDoc, limit, deleteDoc, increment } from "firebase/firestore";
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion';

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
  { id: 'none', src: '', label: 'Midnight Black' },
  { id: 'bg1', src: '/Backgrounds/1.jpg', },
  { id: 'bg2', src: '/Backgrounds/2.jpg', },
  { id: 'bg3', src: '/Backgrounds/3.jpg', },
  { id: 'bg4', src: '/Backgrounds/4.jpg', },
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

const TaskItem = ({ task, index, onToggle, onDelete, onBreakdown, onAddSubtask, onEdit, onUpdateSubtasks, isLoading, level = 0 }) => {
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const dragControls = useDragControls();

  const handleAddSubmit = (e) => { e.preventDefault(); if (!newSubtaskText.trim()) return; onAddSubtask(task.id, newSubtaskText); setNewSubtaskText(''); setIsAdding(false); };
  const handleEditSubmit = (e) => { e.preventDefault(); if (editText.trim()) { onEdit(task.id, editText); setIsEditing(false); } else { setEditText(task.text); setIsEditing(false); } };
  const textAreaRef = useRef(null);
  useEffect(() => { if (isEditing && textAreaRef.current) { textAreaRef.current.style.height = "auto"; textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px"; } }, [isEditing, editText]);

  return (
    <Reorder.Item value={task} id={task.id} dragListener={false} dragControls={dragControls} className="w-full relative group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} transition={{ duration: 0.2 }} layout>
      <div className={`flex items-center py-1 md:py-1 ${level > 0 ? 'mt-0.5' : ''} rounded-lg w-full ${task.completed ? 'completed' : ''}`}>
        <div onPointerDown={(e) => dragControls.start(e)} className="mr-1 text-white/10 hover:text-white/50 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 touch-none select-none"><GripVertical size={14} /></div>
        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
          <button onClick={() => onToggle(task.id)} className={`w-5 h-5 md:w-4 md:h-4 flex-shrink-0 rounded-lg border flex items-center justify-center transition-all duration-300 ${task.completed ? 'bg-white border-white' : 'border-white/30 hover:border-white'}`}>{task.completed && <Check size={12} className="text-black" />}</button>
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="flex-1 min-w-0"><textarea ref={textAreaRef} autoFocus rows={1} value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={() => { if (editText.trim()) { onEdit(task.id, editText); setIsEditing(false); } else { setEditText(task.text); setIsEditing(false); } }} className="w-full bg-transparent border-b border-white/50 text-base md:text-sm focus:outline-none text-white resize-none overflow-hidden leading-relaxed" /></form>
          ) : (
            <div className="flex-1 min-w-0 break-words"><motion.span layout="position" onClick={() => !task.completed && setIsEditing(true)} className={`strike-text cursor-text text-base md:text-sm transition-colors duration-300 hover:text-white leading-relaxed inline-block`}>{task.text}</motion.span></div>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 flex-shrink-0 ml-2">
          {!task.completed && level === 0 && (<button onClick={() => setIsAdding(!isAdding)} className={`text-white/40 md:text-white/20 hover:text-white active:text-white/80 p-1.5 md:p-1 transition-colors flex items-center justify-center ${isAdding ? 'text-white' : ''}`} title="Add Subtask"><Plus size={16} /></button>)}
          {!task.completed && level === 0 && (<button onClick={() => onBreakdown(task)} disabled={isLoading} className="text-white/40 md:text-white/20 hover:text-white active:text-white/80 p-1.5 md:p-1 disabled:opacity-50 transition-colors flex items-center justify-center" title="AI Breakdown">{isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}</button>)}
          <button onClick={() => onDelete(task.id)} className="text-white/40 md:text-white/20 hover:text-white active:text-white/80 p-1.5 md:p-1 transition-colors flex items-center justify-center"><Trash2 size={16} /></button>
        </div>
      </div>
      {isAdding && (<form onSubmit={handleAddSubmit} className="ml-6 pl-4 border-l border-white/10 my-1"><div className="relative group"><input autoFocus type="text" value={newSubtaskText} onChange={(e) => setNewSubtaskText(e.target.value)} placeholder="Type subtask..." className="w-full bg-transparent border-b border-white/20 py-1 pr-8 text-sm focus:outline-none focus:border-white/60 transition-colors placeholder-white/30" /><button type="submit" className="absolute right-0 top-1 text-white/40 hover:text-white transition-colors"><Plus size={14} /></button></div></form>)}
      {hasSubtasks && !task.completed && (<div className="relative ml-6 pl-4 border-l border-white/10 flex flex-col gap-1"><Reorder.Group axis="y" values={task.subtasks} onReorder={(newSubtasks) => onUpdateSubtasks(task.id, newSubtasks)}>{task.subtasks.map((subtask, subIndex) => (<TaskItem key={subtask.id} index={subIndex} task={subtask} onToggle={onToggle} onDelete={onDelete} onBreakdown={onBreakdown} onAddSubtask={onAddSubtask} onEdit={onEdit} onUpdateSubtasks={onUpdateSubtasks} isLoading={isLoading} level={level + 1} />))}</Reorder.Group></div>)}
    </Reorder.Item >
  );
};

// --- REPLACE ENTIRE TaskList COMPONENT ---
const TaskList = ({ tasks, setTasks, pendingTask, setPendingTask, showProgressBar = true, autoFocus = false, onTaskComplete }) => {
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [isInputIndented, setIsInputIndented] = useState(false);
  const addTaskInputRef = useRef(null);

  useEffect(() => { if (autoFocus) { const timer = setTimeout(() => { if (addTaskInputRef.current) addTaskInputRef.current.focus(); }, 150); return () => clearTimeout(timer); } }, [autoFocus]);

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    let total = 0, completed = 0;
    tasks.forEach(task => { if (task.subtasks && task.subtasks.length > 0) { total += task.subtasks.length; completed += task.subtasks.filter(st => st.completed).length; } else { total += 1; if (task.completed) completed += 1; } });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };
  const progress = calculateProgress();

  const toggleTaskRecursive = (items, id) => items.map(item => { if (item.id === id) { const newCompleted = !item.completed; let newSubtasks = item.subtasks; if (item.subtasks && item.subtasks.length > 0) newSubtasks = item.subtasks.map(sub => ({ ...sub, completed: newCompleted })); return { ...item, completed: newCompleted, subtasks: newSubtasks }; } if (item.subtasks && item.subtasks.length > 0) { const newSubtasks = toggleTaskRecursive(item.subtasks, id); const allSubtasksCompleted = newSubtasks.length > 0 && newSubtasks.every(st => st.completed); return { ...item, subtasks: newSubtasks, completed: allSubtasksCompleted }; } return item; });
  const deleteTaskRecursive = (items, id) => items.filter(item => item.id !== id).map(item => ({ ...item, subtasks: item.subtasks ? deleteTaskRecursive(item.subtasks, id) : [] }));
  const addSubtasksRecursive = (items, parentId, newSubtasks) => items.map(item => { if (item.id === parentId) return { ...item, subtasks: [...(item.subtasks || []), ...newSubtasks], completed: false }; if (item.subtasks && item.subtasks.length > 0) return { ...item, subtasks: addSubtasksRecursive(item.subtasks, parentId, newSubtasks) }; return item; });
  const editTaskRecursive = (items, id, newText) => items.map(item => { if (item.id === id) return { ...item, text: newText }; if (item.subtasks && item.subtasks.length > 0) return { ...item, subtasks: editTaskRecursive(item.subtasks, id, newText) }; return item; });
  const updateSubtasksRecursive = (items, parentId, newSubtasks) => items.map(item => { if (item.id === parentId) return { ...item, subtasks: newSubtasks }; if (item.subtasks && item.subtasks.length > 0) return { ...item, subtasks: updateSubtasksRecursive(item.subtasks, parentId, newSubtasks) }; return item; });

  // --- NEW LOGIC START ---
  const findTask = (list, id) => {
    for (let t of list) {
      if (t.id === id) return t;
      if (t.subtasks && t.subtasks.length > 0) {
        const found = findTask(t.subtasks, id);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleTask = (id) => {
    // 1. Calculate points
    const task = findTask(tasks, id);
    if (task && !task.completed && onTaskComplete) {
      let points = 0;
      if (task.subtasks && task.subtasks.length > 0) {
        // Count uncompleted subtasks
        points = task.subtasks.filter(st => !st.completed).length;
      } else {
        // Count main task if no subtasks
        points = 1;
      }
      if (points > 0) onTaskComplete(points);
    }
    // 2. Toggle State
    setTasks(prev => toggleTaskRecursive(prev, id));
  };
  // --- NEW LOGIC END ---

  const deleteTask = (id) => setTasks(prev => deleteTaskRecursive(prev, id));
  const editTask = (id, newText) => setTasks(prev => editTaskRecursive(prev, id, newText));
  const handleAddSubtask = (parentId, text) => { const newSubtask = { id: Date.now(), text: text, completed: false, subtasks: [] }; setTasks(prev => addSubtasksRecursive(prev, parentId, [newSubtask])); };
  const handleUpdateSubtasks = (parentId, newSubtasks) => setTasks(prev => updateSubtasksRecursive(prev, parentId, newSubtasks));

  const breakdownTask = async (task) => {
    setLoadingTaskId(task.id);
    const prompt = `Context: You are an expert JEE mentor. Task: Break down the task "${task.text}" into exactly 3 highly specific, rigorous sub-tasks. STRICT OUTPUT RULES: Return EXACTLY 3 lines of text. No bullets/markdown. Short imperative verbs.`;
    const result = await callGemini(prompt);
    if (result) {
      const newSubTasks = result.split('\n').map(line => cleanText(line.replace(/^[\d\-\*\•\)]+\.?\s*/, ''))).filter(l => l.length > 0).slice(0, 3).map((text, index) => ({ id: Date.now() + index, text: text, completed: false, subtasks: [] }));
      setTasks(prev => addSubtasksRecursive(prev, task.id, newSubTasks));
    }
    setLoadingTaskId(null);
  };

  const handleInputSubmit = (e) => { e.preventDefault(); if (!pendingTask.trim()) return; if (isInputIndented && tasks.length > 0) { const lastTask = tasks[tasks.length - 1]; handleAddSubtask(lastTask.id, pendingTask); setIsInputIndented(false); } else { setTasks(prev => [...prev, { id: Date.now(), text: pendingTask, completed: false, subtasks: [] }]); } setPendingTask(''); setTimeout(() => { if (addTaskInputRef.current) addTaskInputRef.current.focus(); }, 0); };
  const handleInputKeyDown = (e) => { if (e.key === 'Tab') { e.preventDefault(); if (isInputIndented) setIsInputIndented(false); else if (tasks.length > 0) setIsInputIndented(true); } if (e.key === 'Backspace' && pendingTask === '' && isInputIndented) { e.preventDefault(); setIsInputIndented(false); } };

  return (
    <div className="flex flex-col w-full h-full text-left md:max-w-[18rem]">
      {showProgressBar && (<><div className="flex justify-between items-end mb-2"><h2 className="text-sm uppercase tracking-widest text-white/50 font-medium">Tasks</h2><span className="text-xs font-digital text-white/70">{progress}%</span></div><div className="w-full h-1 bg-white/10 rounded-full mb-4 overflow-hidden flex-shrink-0"><div className="h-full bg-white transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div></>)}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 text-left w-full">
        <Reorder.Group axis="y" values={tasks} onReorder={setTasks} className="space-y-1">
          {tasks.map((task, index) => (<TaskItem key={task.id} index={index} task={task} onToggle={toggleTask} onDelete={deleteTask} onBreakdown={breakdownTask} onAddSubtask={handleAddSubtask} onEdit={editTask} onUpdateSubtasks={handleUpdateSubtasks} isLoading={loadingTaskId === task.id} />))}
        </Reorder.Group>
        <form onSubmit={handleInputSubmit} className={`flex items-center py-1 md:py-1 animate-fade-in group transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isInputIndented ? 'ml-10' : ''}`}>
          <div className="w-[14px] mr-1 flex-shrink-0" />
          <div className="flex items-center gap-3 flex-1"><button type="submit" className="w-5 h-5 md:w-4 md:h-4 flex-shrink-0 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"><Plus size={10} className="text-white/30 group-hover:text-white/70" /></button><input id="new-task-input" ref={addTaskInputRef} type="text" value={pendingTask} onChange={(e) => setPendingTask(e.target.value)} onKeyDown={handleInputKeyDown} placeholder={isInputIndented ? "Add a subtask..." : "Add a new task..."} className="w-full bg-transparent border-b border-transparent group-hover:border-white/10 focus:border-white/40 text-base md:text-sm focus:outline-none text-white/70 placeholder-white/20 transition-colors h-full" /></div>
        </form>
      </div>
    </div>
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
        </button>
        <div className="flex gap-2">
          <button onClick={handlePrev} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"><ChevronLeft size={18} /></button>
          <button onClick={handleNext} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"><ChevronRight size={18} /></button>
        </div>
      </div>

      {viewMode === 'days' ? (
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-[10px] text-white/30 font-medium py-0.5">{d}</div>
          ))}
          {days.map((date, idx) => (
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
          ))}
        </div>
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
      )}
    </div>
  );
};

// Helper Component for consistent avatars
// 1. IMPROVED AVATAR COMPONENT (With Referrer Fix)
const Avatar = ({ photoURL, name, size = "md", isPinned = false }) => {
  const [imageError, setImageError] = useState(false);

  // Reset error if the URL changes (important for search lists)
  useEffect(() => {
    setImageError(false);
  }, [photoURL]);

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm"
  };

  return (
    <div className={`relative flex-shrink-0 ${sizeClasses[size]}`}>
      {photoURL && !imageError ? (
        <img
          src={photoURL}
          alt={name}
          // --- FIX: This allows Google Images to load ---
          referrerPolicy="no-referrer"
          onError={(e) => {
            console.warn("Avatar load failed", e);
            setImageError(true);
          }}
          className="w-full h-full rounded-full object-cover border border-white/10"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-white/80 uppercase border border-white/10 select-none">
          {name ? name.charAt(0) : '?'}
        </div>
      )}

      {isPinned && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center border border-black shadow-sm z-10">
          <Pin size={8} className="text-black fill-black" />
        </div>
      )}
    </div>
  );
};

// Updated Stats Modal to accept a targetUser prop for viewing others' stats
const StatsModal = ({ isOpen, onClose, stats, user, targetUser }) => {
  const [activeTab, setActiveTab] = useState('today');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyData, setHistoryData] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [targetStats, setTargetStats] = useState(null); // For viewing friend's stats

  const currentUser = targetUser || user;

  // Fetch stats if viewing a friend
  useEffect(() => {
    if (isOpen && targetUser) {
      // We need to fetch the friend's current stats (which are in the main doc)
      const fetchTargetStats = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', targetUser.uid));
          if (userDoc.exists()) {
            setTargetStats(userDoc.data().stats);
          }
        } catch (e) { console.error("Error fetching friend stats", e); }
      };
      fetchTargetStats();
    }
  }, [isOpen, targetUser]);

  const displayCurrentStats = targetUser ? (targetStats || { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0, dailyTasksCompleted: 0, currentStreak: 0 }) : stats;

  useEffect(() => {
    if (isOpen && activeTab === 'history' && currentUser) {
      fetchHistory();
    }
  }, [isOpen, activeTab, currentMonth, currentUser]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const historyRef = collection(db, 'users', currentUser.uid, 'history');
      const q = query(historyRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setHistoryData(data);
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
    setLoadingHistory(false);
  };

  // --- MERGE LIVE STATS INTO HISTORY ---
  const getEffectiveHistory = () => {
    const todayId = formatDateId(new Date());
    return {
      ...historyData,
      [todayId]: { ...displayCurrentStats, date: new Date() }
    };
  };

  const effectiveHistoryData = getEffectiveHistory();

  const getDisplayStats = () => {
    if (activeTab === 'today') return displayCurrentStats;
    if (selectedDate) {
      const dateId = formatDateId(selectedDate);
      return effectiveHistoryData[dateId] || { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0, dailyTasksCompleted: 0, currentStreak: '-' };
    }
    return { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0, dailyTasksCompleted: 0, currentStreak: '-' };
  };

  const finalStats = getDisplayStats();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-[95vw] md:w-full md:max-w-2xl shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar mx-2 md:mx-0 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <div className="flex flex-col">
                {targetUser && <h4 className="text-white/50 text-xs uppercase tracking-widest mb-1">Viewing Stats for</h4>}
                <h3 className="text-xl font-medium text-white">{targetUser ? (targetUser.displayName || 'Friend') : 'Your Statistics'}</h3>
              </div>
              <button onClick={onClose} className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1 text-white/50 hover:text-white active:text-white/70"><X size={20} /></button>
            </div>

            <div className="flex gap-4 mb-6">
              <button onClick={() => setActiveTab('today')} className={`text-sm md:text-base font-medium transition-colors border-b-2 pb-1 ${activeTab === 'today' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>Today</button>
              <button onClick={() => setActiveTab('history')} className={`text-sm md:text-base font-medium transition-colors border-b-2 pb-1 ${activeTab === 'history' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white'}`}>History</button>
            </div>

            {activeTab === 'history' && (
              <div className="mb-6 animate-fade-in flex-shrink-0">
                <CalendarView
                  historyData={effectiveHistoryData}
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  onSelectDate={setSelectedDate}
                  selectedDate={selectedDate}
                />
                {!selectedDate && <p className="text-white/30 text-[10px] text-center mt-3 uppercase tracking-widest">Select a date to view details</p>}
              </div>
            )}

            <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 flex-shrink-0 transition-opacity duration-300 ${activeTab === 'history' && !selectedDate ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <StatCard
                label={activeTab === 'today' ? "Focus Time" : "Focus"}
                value={formatDetailedDuration(finalStats.dailyFocusTime || 0)} // Fallback for missing data
                icon={Zap}
              />
              <StatCard
                label="Tasks Completed"
                value={finalStats.dailyTasksCompleted || 0}
                icon={CheckSquare}
              />
              <div className="hidden md:block">
                <StatCard
                  label="Sessions"
                  value={finalStats.dailySessions || 0}
                  icon={Clock}
                />
              </div>
            </div>
            <div className={`grid grid-cols-2 gap-3 flex-shrink-0 transition-opacity duration-300 ${activeTab === 'history' && !selectedDate ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="md:hidden">
                <StatCard
                  label="Sessions"
                  value={finalStats.dailySessions || 0}
                  icon={Clock}
                />
              </div>
              <StatCard
                label="Break Time"
                value={formatDetailedDuration(finalStats.dailyBreakTime || 0)}
                icon={Coffee}
              />
              {activeTab === 'today' && (
                <StatCard
                  label="Streak"
                  value={`${finalStats.currentStreak || 0} d`}
                  icon={Flame}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SocialModal = ({ isOpen, onClose, user, friends, onAddFriend, onRemoveFriend, onTogglePin, onViewStats, onSearchUsers }) => {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [rawSearchResults, setRawSearchResults] = useState([]); // Store raw DB results
  const [searchPerformed, setSearchPerformed] = useState(false); // Track if we have tried searching
  const [successMsg, setSuccessMsg] = useState(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchText("");
      setRawSearchResults([]);
      setSearchPerformed(false);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // Live Search Logic
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

  // --- FILTER LOGIC ---
  // We filter here so it updates instantly if `friends` list changes (e.g. after adding someone)
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

            {/* LOGIC: If we searched, and aren't loading, and the FILTERED result is empty 
                 (Meaning either no matches, OR the matches were already friends) 
              */}
            {searchText && searchPerformed && !isSearching && filteredSearchResults.length === 0 && (
              <div className="mb-6 text-center py-4 border border-white/5 rounded-xl bg-white/5">
                <p className="text-white/40 text-xs">No new users found.</p>
              </div>
            )}

            {/* Render Filtered Results */}
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
                      <Avatar
                        photoURL={friend.photoURL}
                        name={friend.displayName}
                        size="md"
                        isPinned={friend.isPinned}
                      />
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { if (isOpen) { setLocalSettings(settings); setErrors({}); } }, [isOpen]);

  const handleChange = (e, mode) => { const value = e.target.value; if (value === '' || /^\d+$/.test(value)) { setLocalSettings(prev => ({ ...prev, [mode]: value })); if (errors[mode]) { setErrors(prev => ({ ...prev, [mode]: null })); } } };
  const handleToggle = (key, value) => { setLocalSettings(prev => ({ ...prev, [key]: value })); }

  const validateSettings = () => { const newErrors = {}; let hasError = false; const finalSettings = {};['focus', 'shortBreak', 'longBreak', 'pomosBeforeLongBreak'].forEach(mode => { const val = localSettings[mode]; if (val === undefined || val === '' || parseInt(val) === 0) { newErrors[mode] = true; hasError = true; } else { finalSettings[mode] = parseInt(val); } }); finalSettings.autoStartBreaks = localSettings.autoStartBreaks; finalSettings.autoStartWork = localSettings.autoStartWork; finalSettings.background = localSettings.background; return { hasError, newErrors, finalSettings }; };

  const handleManualSave = () => { const { hasError, newErrors, finalSettings } = validateSettings(); if (hasError) { setErrors(newErrors); return; } onSave(finalSettings); };

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

  const handleSignOut = async () => { setIsSigningOut(true); await new Promise(r => setTimeout(r, 800)); localStorage.removeItem('pomodoro_user_name'); await signOut(auth); window.location.reload(); };
  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file && (file.type === "image/jpeg" || file.type === "image/png")) { const reader = new FileReader(); reader.onloadend = () => { const base64String = reader.result; const newBg = { id: `custom-${Date.now()}`, src: base64String, }; onAddCustomBackground(newBg); handleToggle('background', base64String); if (onBackgroundChange) onBackgroundChange(base64String); }; reader.readAsDataURL(file); } };
  const allBackgrounds = [...BACKGROUND_OPTIONS, ...customBackgrounds];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleCloseAction}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-4 md:p-8 rounded-2xl md:rounded-3xl w-[95vw] md:w-full md:max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] md:max-h-[85vh] no-scrollbar mx-2 md:mx-0" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 md:mb-6"><h3 className="text-lg md:text-xl font-medium text-white">Settings</h3><button onClick={handleCloseAction} className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center p-2 text-white/50 hover:text-white active:text-white/70"><X size={20} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4 md:space-y-5">
                <h4 className="text-xs uppercase tracking-widest text-white/50 font-medium mb-3 md:mb-4">Timer Configuration</h4>

                {['focus', 'shortBreak', 'longBreak'].map((mode) => (
                  <React.Fragment key={mode}>
                    {/* Standard Time Input */}
                    <div className="flex justify-between items-center group gap-4">
                      <label className={`text-sm capitalize transition-colors flex-shrink-0 ${errors[mode] ? 'text-red-400' : 'text-white/70 group-hover:text-white'}`}>{mode.replace(/([A-Z])/g, ' $1').trim()} (min)</label>
                      <input type="text" inputMode="numeric" value={localSettings[mode]} onChange={(e) => handleChange(e, mode)} className={`min-w-[60px] w-16 md:w-16 bg-white/5 border rounded-xl p-2.5 md:p-2 text-center text-white focus:outline-none transition-all duration-300 text-base md:text-sm ${errors[mode] ? 'border-red-500 focus:border-red-500 bg-red-500/10' : 'border-white/10 focus:border-white/50'}`} placeholder={settings[mode]} />
                    </div>

                    {/* MOVED: Sessions Before Long Break (Only shows under Long Break) */}
                    {mode === 'longBreak' && (
                      <div className="flex justify-between items-center group gap-4">
                        <label className={`text-sm transition-colors flex-shrink-0 ${errors['pomosBeforeLongBreak'] ? 'text-red-400' : 'text-white/70 group-hover:text-white'}`}>
                          Sessions before long break
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={localSettings.pomosBeforeLongBreak}
                          onChange={(e) => handleChange(e, 'pomosBeforeLongBreak')}
                          className={`min-w-[60px] w-16 md:w-16 bg-white/5 border rounded-xl p-2.5 md:p-2 text-center text-white focus:outline-none transition-all duration-300 text-base md:text-sm ${errors['pomosBeforeLongBreak'] ? 'border-red-500 focus:border-red-500 bg-red-500/10' : 'border-white/10 focus:border-white/50'}`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}

                <div className="w-full h-px bg-white/10 my-4"></div>
                <Toggle label="Auto-start Breaks" checked={!!localSettings.autoStartBreaks} onChange={(v) => handleToggle('autoStartBreaks', v)} /><Toggle label="Auto-start Work" checked={!!localSettings.autoStartWork} onChange={(v) => handleToggle('autoStartWork', v)} />
                {user && user.uid === 'cmxtLQPCqkfhkhNQZ04ZlXjCPbV2' && (<><div className="w-full h-px bg-white/10 my-4"></div><Toggle label="Dev Mode (No Stats)" checked={devMode} onChange={setDevMode} /></>)}

                {/* OLD INPUT REMOVED FROM HERE */}

              </div>
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 mb-2"><ImageIcon size={14} className="text-white/70" /><label className="text-xs uppercase tracking-widest text-white/50 font-medium">Environment</label></div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {allBackgrounds.map((bg) => (<button key={bg.id} onClick={() => { handleToggle('background', bg.src); if (onBackgroundChange) onBackgroundChange(bg.src); }} className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-200 group ${localSettings.background === bg.src ? 'border-white' : 'border-transparent hover:border-white/30'}`}>{bg.src ? (<img src={bg.src} alt={bg.label} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-[#111] flex items-center justify-center"><span className="text-[10px] text-white/50 uppercase tracking-widest">None</span></div>)}{localSettings.background === bg.src && (<div className="absolute inset-0 bg-white/10 flex items-center justify-center"><Check size={16} className="text-white drop-shadow-md" /></div>)}{bg.id.toString().startsWith('custom-') && (<button onClick={(e) => { e.stopPropagation(); onDeleteCustomBackground(bg.id); }} className="absolute top-1 right-1 min-w-[32px] min-h-[32px] md:min-w-0 md:min-h-0 p-1.5 md:p-1.5 bg-black/60 hover:bg-red-500/80 active:bg-red-500 rounded-full text-white/70 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20 backdrop-blur-sm flex items-center justify-center" title="Remove background"><Trash2 size={10} /></button>)}{bg.label && (<div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] text-white block text-center truncate">{bg.label}</span></div>)}</button>))}
                  <button onClick={() => fileInputRef.current?.click()} className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-white/20 hover:border-white/50 transition-all duration-200 group flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10"><Plus size={24} className="text-white/40 group-hover:text-white/80 transition-colors" /><span className="text-[10px] text-white/40 group-hover:text-white/80 uppercase tracking-widest">Add Custom</span><input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleFileSelect} /></button>
                </div>
              </div>
            </div>
            <div className="pt-4 md:pt-6 border-t border-white/10 flex flex-col gap-3 mt-4 md:mt-6">{isTimerRunning && (<button onClick={handleManualSave} className="w-full min-h-[44px] bg-red-500/10 border border-red-500/50 text-red-400 text-xs md:text-xs font-bold px-4 py-3 rounded-xl hover:bg-red-500 active:bg-red-600 hover:text-white transition-all duration-300">Save & Reset Timer</button>)}{user && (<button onClick={handleSignOut} disabled={isSigningOut} className="w-full min-h-[44px] flex items-center justify-center gap-2 text-xs text-red-400/70 hover:text-red-400 active:text-red-500 py-2.5 md:py-2 border border-red-500/20 hover:border-red-500/50 active:border-red-500/70 rounded-xl transition-colors disabled:opacity-50">{isSigningOut ? <Loader2 size={12} className="animate-spin" /> : null}{isSigningOut ? "Signing Out..." : "Sign Out"}</button>)}</div>
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
  const shortcuts = [{ key: 'Space', description: 'Play / Pause timer' }, { key: 'Tab', description: 'Cycle timer modes (when not started)' }, { key: 'T', description: 'Focus on task input' }, { key: 'O', description: 'Edit objective/session name' }, { key: 'S', description: 'Open / Close settings' }, { key: 'Esc', description: 'Exit from input fields or close modals' }, { key: 'Shift + ?', description: 'Toggle this help' },];
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

// --- ADD THIS NEW SECTION: UPDATE CARD COMPONENT ---

const UPDATE_KEY = 'zen_update_music_v1'; // Unique key for this update

const UpdateNotificationCard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Check localStorage on component mount
  useEffect(() => {
    const hasSeen = localStorage.getItem(UPDATE_KEY);
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissing(true);
    // Mark as dismissed in local storage
    localStorage.setItem(UPDATE_KEY, 'true');

    // Wait for exit animation before unmounting
    setTimeout(() => {
      setIsVisible(false);
    }, 400); // Matches the exit animation duration
  };

  if (!isVisible && !isDismissing) return null;

  return (
    <AnimatePresence>
      {isVisible && !isDismissing && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-4 md:bottom-8 right-4 md:right-8 z-50 w-[90vw] max-w-sm"
        >
          <div className="bg-[#1a1a1a] border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Music size={20} className="text-white fill-white/10" />
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5">Tunes are here! Stats still seem to be broken</h4>
                  <p className="text-xs text-white/70">Background music to power your focus. Stats might not show the correct detais. Will be fixed soon</p>
                </div>
              </div>
              <button onClick={handleDismiss} className="p-1 text-white/50 hover:text-white transition-colors flex-shrink-0 ml-2">
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={handleDismiss} className="text-xs font-medium text-white/50 hover:text-white transition-colors underline">
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const MUSIC_TRACKS = [

  {
    id: 'track-3',
    title: 'Lofi Study',
    src: 'https://archive.org/download/track1_202511/track1.mp3',
    cover: '/music/cover1.jpg'
  },

  {
    id: 'track-1',
    title: 'Binaural Beats',
    src: 'https://archive.org/download/track2_202511/track1.mp3',
    cover: '/music/cover2.jpg'
  },

  {
    id: 'track-2',
    title: 'Deep Focus Ambient',
    src: 'https://archive.org/download/track2_202511/track2.mp3',
    cover: '/music/cover3.jpg'
  },
];

const MusicModal = ({ isOpen, onClose, currentTrack, isPlaying, onPlay, onPause, isLoading, progress, duration, onSeek }) => {
  const [view, setView] = useState('list'); // 'list' | 'player'

  // Auto-switch to player if a track is selected while modal is open
  useEffect(() => {
    if (currentTrack && isOpen && view === 'list') {
      // Optional: You can uncomment this if you want it to auto-jump to player on click
      // setView('player');
    }
  }, [currentTrack]);

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const totalSeconds = Math.floor(time);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    let timeString = `${m}:${s.toString().padStart(2, '0')}`;

    if (h > 0) {
      timeString = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      timeString = `${m}:${s.toString().padStart(2, '0')}`;
    }

    return timeString;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-[90vw] md:w-[24rem] shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              {view === 'player' ? (
                <button onClick={() => setView('list')} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors flex items-center gap-1">
                  <ChevronLeft size={20} /> <span className="text-xs uppercase tracking-widest">Library</span>
                </button>
              ) : (
                <h3 className="text-xl font-medium text-white flex items-center gap-2"><Music size={20} /> Music</h3>
              )}
              <button onClick={onClose} className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1 text-white/50 hover:text-white active:text-white/70"><X size={20} /></button>
            </div>

            {/* VIEWS SWITCHER */}
            <div className="relative w-full h-[320px]">
              <AnimatePresence mode="wait">
                {view === 'list' ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1"
                  >
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
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{isActive && isPlaying ? 'Now Playing' : ''}</p>
                          </div>
                          {isActive && (
                            <div className="text-white/80">
                              {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="player"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center"
                  >
                    {/* Cover Art */}
                    <div className="w-48 h-48 rounded-2xl overflow-hidden mb-6 shadow-2xl border border-white/10 relative group">
                      {currentTrack?.cover ? (
                        <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center"><Music size={48} className="text-white/20" /></div>
                      )}
                      {/* Play/Pause Overlay on Cover (Optional) */}
                    </div>

                    {/* Title */}
                    <div className="mb-6 w-full px-4">
                      <h4 className="text-lg font-medium text-white truncate">{currentTrack?.title || "Select a track"}</h4>
                      <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Focus Sound</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full flex items-center gap-3 mb-6 px-2">
                      <span className="text-[10px] text-white/40 font-mono w-8 text-right">{formatTime(progress)}</span>
                      <div className="flex-1 relative h-1 bg-white/10 rounded-full group cursor-pointer" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        onSeek(percent * duration);
                      }}>
                        <div
                          className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100"
                          style={{ width: `${(progress / duration) * 100}%` }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          style={{ left: `${(progress / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                        />
                      </div>
                      <span className="text-[10px] text-white/40 font-mono w-8 text-left">{formatTime(duration)}</span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => isPlaying ? onPause() : onPlay(currentTrack)}
                        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                      >
                        {isLoading ? (
                          <Loader2 size={24} className="animate-spin text-black" />
                        ) : (
                          isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mini Player / Now Playing Indicator in List View */}
            {view === 'list' && currentTrack && (
              <button onClick={() => setView('player')} className="absolute bottom-6 left-6 right-6 h-14 bg-[#1a1a1a] border border-white/10 rounded-xl flex items-center px-3 gap-3 animate-fade-in-up hover:bg-[#222] transition-colors shadow-lg z-10">
                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                  {currentTrack.cover && <img src={currentTrack.cover} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-xs font-bold text-white block truncate">{currentTrack.title}</span>
                  <span className="text-[10px] text-white/50 block truncate">{isPlaying ? 'Playing' : 'Paused'}</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                  {isLoading ? <Loader2 size={12} className="animate-spin text-white" /> : (isPlaying ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />)}
                </div>
              </button>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [greetingText, setGreetingText] = useState(() => { const cachedName = localStorage.getItem('pomodoro_user_name'); return cachedName ? `Welcome back, ${cachedName}` : "Hello, stranger"; });
  const [isDeletingName, setIsDeletingName] = useState(false);
  const [isTypingName, setIsTypingName] = useState(false);
  const [showLoginBtn, setShowLoginBtn] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const DEFAULT_SETTINGS = { focus: 25, shortBreak: 5, longBreak: 15, autoStartBreaks: false, autoStartWork: false, pomosBeforeLongBreak: 4, background: '' };
  const [initialState] = useState(loadTimerState);
  const [mode, setMode] = useState(initialState?.mode || 'focus');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft || DEFAULT_SETTINGS.focus * 60);
  const [isActive, setIsActive] = useState(initialState?.isActive || false);
  const [sessionName, setSessionName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pendingTask, setPendingTask] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [pomoCount, setPomoCount] = useState(0);
  const [quote, setQuote] = useState("Comfort is the enemy of progress.");
  const [devMode, setDevMode] = useState(false);
  const [customBackgrounds, setCustomBackgrounds] = useState(() => { try { const saved = localStorage.getItem('zen_custom_bgs'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; } });
  const [isMorphing, setIsMorphing] = useState(false);
  const [beginBtnRect, setBeginBtnRect] = useState(null);
  const [targetPlayBtnRect, setTargetPlayBtnRect] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const musicAudioRef = useRef(new Audio());
  // --- SOCIAL STATE ---
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState([]); // List of friend objects with live status
  const [friendUids, setFriendUids] = useState([]); // Just the IDs for listening
  const [viewingFriendStats, setViewingFriendStats] = useState(null); // User object of friend to view stats for
  const [friendConfig, setFriendConfig] = useState({}); // Stores { uid: { isPinned: true/false } }
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const beginBtnRef = useRef(null);
  const playBtnRef = useRef(null);
  const sessionInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const endTimeRef = useRef(null);
  const audioRefs = useRef({});
  const accumulatedTimeRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const prevSettings = useRef(DEFAULT_SETTINGS);
  const prevTasks = useRef([]);
  const prevSessionName = useRef('');
  const lastStatSaveTime = useRef(Date.now());
  const lastRemoteUpdate = useRef(0); // To avoid echoing back remote changes

  const DEFAULT_STATS = {
    dailyFocusTime: 0,
    dailyBreakTime: 0,
    dailySessions: 0,
    dailyTasksCompleted: 0,
    currentStreak: 0,
    lastActiveDate: null
  };
  const [stats, setStats] = useState(DEFAULT_STATS);

  // --- FOCUS MODE STATE ---
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const sounds = { 'focus': '/sounds/timer-end.mp3', 'shortBreak': '/sounds/short-break.mp3', 'longBreak': '/sounds/long-break.mp3' };
    Object.keys(sounds).forEach(key => { const audio = new Audio(sounds[key]); audio.preload = 'auto'; audio.volume = 1.0; audioRefs.current[key] = audio; });
  }, []);
  useEffect(() => { localStorage.setItem('zen_custom_bgs', JSON.stringify(customBackgrounds)); }, [customBackgrounds]);
  useEffect(() => {
    const handleKeyPress = (e) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Escape') {
        if (showKeyboardHelp) { setShowKeyboardHelp(false); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (showStats) { setShowStats(false); return; }
        if (showFriends) { setShowFriends(false); return; }
        if (viewingFriendStats) { setViewingFriendStats(null); setShowStats(false); return; } // Close friend stats
        if (showResetConfirm) { setShowResetConfirm(false); return; }
        if (isInputFocused) { e.preventDefault(); activeElement.blur(); if (activeElement.id === 'session-name-input') { setIsEditingName(false); } return; }
      }
      if (isInputFocused) return;
      if (e.shiftKey && e.key === '?') { e.preventDefault(); setShowKeyboardHelp(prev => !prev); return; }
      if (e.key === ' ' && onboardingStep === 3) { e.preventDefault(); setIsActive(!isActive); return; }
      if (e.key === 'Tab' && onboardingStep === 3) {
        const isAtDefaultPosition = !isActive && timeLeft === settings[mode] * 60;
        if (isAtDefaultPosition) { e.preventDefault(); const modeOrder = ['focus', 'shortBreak', 'longBreak']; const currentIndex = modeOrder.indexOf(mode); const nextIndex = (currentIndex + 1) % modeOrder.length; const nextMode = modeOrder[nextIndex]; setMode(nextMode); setTimeLeft(settings[nextMode] * 60); return; }
      }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); const taskInput = document.getElementById('new-task-input'); if (taskInput) { taskInput.click(); setTimeout(() => { taskInput.focus(); const length = taskInput.value.length; taskInput.setSelectionRange(length, length); }, 0); } }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); setShowSettings(prev => !prev); }
      if (e.key === 'o' || e.key === 'O') { e.preventDefault(); setIsEditingName(true); setTimeout(() => { const sessionInput = document.getElementById('session-name-input'); if (sessionInput) { sessionInput.focus(); sessionInput.select(); } }, 50); }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, onboardingStep, showSettings, showStats, showFriends, showKeyboardHelp, showResetConfirm, mode, timeLeft, settings, viewingFriendStats]);

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
        setTasks([]); setSessionName(""); setDataLoaded(false);
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

          // --- SYNC TIMER LOGIC ---
          if (data.timerState) {
            const remote = data.timerState;
            // Only apply if remote is newer than our last write
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

          let loadedTasks = data.tasks || [];

          // Handle daily reset logic
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
            // ARCHIVE OLD STATS TO HISTORY SUBCOLLECTION
            if (loadedStats.dailyFocusTime > 0 || loadedStats.dailyTasksCompleted > 0) {
              // We archive the *loaded* stats which represent the previous day
              // Calculate the date ID from the last active date (which should be yesterday or older)
              const archiveDate = lastActiveDate || new Date(Date.now() - 86400000); // Fallback to yesterday if null
              const dateId = formatDateId(archiveDate);
              const historyRef = doc(db, "users", user.uid, "history", dateId);
              // Fire and forget archive
              setDoc(historyRef, { ...loadedStats, date: archiveDate }, { merge: true });
            }

            loadedStats.dailyFocusTime = 0;
            loadedStats.dailyBreakTime = 0;
            loadedStats.dailySessions = 0;
            loadedStats.dailyTasksCompleted = 0;
            const cleanCompleted = (taskList) => { return taskList.filter(t => !t.completed).map(t => ({ ...t, subtasks: t.subtasks ? cleanCompleted(t.subtasks) : [] })); };
            loadedTasks = cleanCompleted(loadedTasks);
          }

          setStats(prevStats => {
            const newStats = { ...loadedStats, currentStreak };

            // ANTI-REVERT LOGIC:
            // If local stats are higher than what the server sent (due to lag),
            // keep the local version. This prevents the "9s" glitch.
            if (!shouldResetDaily) {
              if (prevStats.dailyFocusTime > newStats.dailyFocusTime) {
                newStats.dailyFocusTime = prevStats.dailyFocusTime;
              }
              if (prevStats.dailyBreakTime > newStats.dailyBreakTime) {
                newStats.dailyBreakTime = prevStats.dailyBreakTime;
              }
            }
            return newStats;
          });

          setTasks(loadedTasks);

          const mergedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
          setSettings(mergedSettings);
          if (data.sessionName && !sessionName) setSessionName(data.sessionName);
          prevSettings.current = mergedSettings; prevTasks.current = loadedTasks; prevSessionName.current = data.sessionName || "";
        }
        setDataLoaded(true);
      });
      return () => unsub();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !dataLoaded) return;

    const isDifferent = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
    const hasCriticalChanges = isDifferent(settings, prevSettings.current) || isDifferent(tasks, prevTasks.current) || sessionName !== prevSessionName.current;
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
          tasks,
          settings,
          sessionName,
          lastUpdated: today,
          stats: newStats
        };

        await setDoc(userDocRef, payload, { merge: true });
        prevSettings.current = settings; prevTasks.current = tasks; prevSessionName.current = sessionName;
        if (shouldSaveStats) { lastStatSaveTime.current = Date.now(); }
      };
      const handler = setTimeout(saveData, 1000);
      return () => clearTimeout(handler);
    }
  }, [tasks, settings, sessionName, user, dataLoaded, stats]);

  useEffect(() => {
    if (!isActive && user && dataLoaded) {
      const saveFinal = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const today = new Date();
        const payload = { tasks, settings, sessionName, lastUpdated: today, stats };
        await setDoc(userDocRef, payload, { merge: true });
        lastStatSaveTime.current = Date.now();
      };
      saveFinal();
    }
  }, [isActive]);

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

  const handlePlayMusic = (track) => {
    if (currentTrack?.id === track.id) {
      // Resume
      musicAudioRef.current.play();
      setIsMusicPlaying(true);
    } else {
      // New Track
      setCurrentTrack(track);
      setMusicLoading(true);
      musicAudioRef.current.src = track.src;
      musicAudioRef.current.load();
      musicAudioRef.current.play().catch(e => console.error("Play failed", e));
      setIsMusicPlaying(true);
    }
  };

  const handlePauseMusic = () => {
    musicAudioRef.current.pause();
    setIsMusicPlaying(false);
  };

  const handleSeekMusic = (time) => {
    musicAudioRef.current.currentTime = time;
    setMusicProgress(time);
  };

  const handleNameTransition = async (newName) => { setShowLoginBtn(false); await new Promise(r => setTimeout(r, 800)); setIsDeletingName(true); const currentText = "Hello, stranger"; const prefix = "Hello, "; for (let i = currentText.length; i >= prefix.length; i--) { setGreetingText(currentText.substring(0, i)); await new Promise(r => setTimeout(r, 80)); } setIsDeletingName(false); setIsTypingName(true); const targetText = prefix + newName; for (let i = prefix.length; i <= targetText.length; i++) { setGreetingText(targetText.substring(0, i)); await new Promise(r => setTimeout(r, 120)); } setIsTypingName(false); await new Promise(r => setTimeout(r, 1200)); setOnboardingStep(1); };
  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };

  const generateContextualQuote = async (taskName) => {
    if (!taskName) return;
    setIsQuoteLoading(true);
    const prompt = `Context: User is starting a focus session for "${taskName}". Task: Generate a short, one sentence only, stoic, motivating quote somewhat, but not entirely related to this specific task. Use famous quotes from famous people. Constraints: Max 10 words. No quotes. No Markdown. Direct and powerful.`;
    const result = await callGemini(prompt);
    if (result) { setQuote(cleanText(result)); }
    setIsQuoteLoading(false);
  };

  const finishSessionInput = (e) => { if (e.key === 'Enter') { setOnboardingStep(2); generateContextualQuote(sessionName); } }
  useEffect(() => { if (onboardingStep === 1) setTimeout(() => sessionInputRef.current?.focus(), 50); }, [onboardingStep]);

  const handleBeginSession = () => {
    if (pendingTask.trim()) { setTasks(prev => [...prev, { id: Date.now(), text: pendingTask, completed: false, subtasks: [] }]); setPendingTask(''); }
    if (beginBtnRef.current && playBtnRef.current) { setBeginBtnRect(beginBtnRef.current.getBoundingClientRect()); setTargetPlayBtnRect(playBtnRef.current.getBoundingClientRect()); setIsMorphing(true); setTimeout(() => setOnboardingStep(3), 500); setTimeout(() => setIsMorphing(false), 1020); } else { setOnboardingStep(3); }
  }

  const refreshQuote = async () => { setIsQuoteLoading(true); const prompt = `Context: You are a strict, high-performance coach (Elon Musk persona). Task: Generate a short, original, direct message to the user about their session "${sessionName || 'work'}". Rules: Be strict, demanding. Speak directly. Max 15 words. No quotes. No bold/markdown.`; const newQuote = await callGemini(prompt); if (newQuote) setQuote(cleanText(newQuote)); setIsQuoteLoading(false); };

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
            if (!devMode) {
              // Update sessions count locally
              setStats(prev => ({ ...prev, dailySessions: prev.dailySessions + 1 }));
              // We don't need to sync sessions count here, the flushUnsavedTime handled the seconds,
              // and the next save loop will handle the session count.
            }
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
            setMode('focus');
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
  }, [isActive, mode, settings, pomoCount, devMode]);

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
    setSettings(newSettings);
    setShowSettings(false);
    setIsActive(false);
    setTimeLeft(newSettings[mode] * 60);
    endTimeRef.current = null;

    // Sync after settings change (resets timer)
    const timerStatePayload = {
      isActive: false,
      targetEndTime: null,
      mode: mode,
      timeLeft: newSettings[mode] * 60,
      sessionName
    };

    // Update Firestore immediately to prevent race condition
    if (user) {
      const payload = {
        settings: newSettings, // Save settings immediately
        timerState: {
          ...timerStatePayload,
          lastUpdated: Date.now()
        }
      };
      lastRemoteUpdate.current = payload.timerState.lastUpdated;
      setDoc(doc(db, "users", user.uid), payload, { merge: true });
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

  const deleteTask = (id) => setTasks(prev => prev.filter(item => item.id !== id));
  const editTask = (id, newText) => setTasks(prev => prev.map(item => item.id === id ? { ...item, text: newText } : item));
  const handleAddSubtask = (parentId, text) => { const newSubtask = { id: Date.now(), text: text, completed: false, subtasks: [] }; setTasks(prev => prev.map(item => item.id === parentId ? { ...item, subtasks: [...(item.subtasks || []), newSubtask], completed: false } : item)); };
  const handleUpdateSubtasks = (parentId, newSubtasks) => setTasks(prev => prev.map(item => item.id === parentId ? { ...item, subtasks: newSubtasks } : item));

  const handleTaskComplete = (count) => {
    // Safety check: Dev Mode off and positive count
    if (!devMode && count > 0) {
      setStats(prev => ({
        ...prev,
        dailyTasksCompleted: prev.dailyTasksCompleted + count
      }));
    }
  };

  // Show friends if they are Active OR Pinned
  const dashboardFriends = friends.filter(f => (f.isOnline && f.isActive) || f.isPinned);

  return (
    <div className="h-[100dvh] md:min-h-screen bg-black text-white flex flex-col md:block relative overflow-hidden">
      <GlobalStyles />
      {settings.background && (<div className="fixed inset-0 z-0 transition-opacity duration-1000 ease-in-out" style={{ backgroundImage: `url(${settings.background})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1 }} />)}

      {/* Background Overlay: Brightens (lowers opacity) when in focus mode */}
      <div className={`fixed inset-0 z-0 transition-all duration-1000 ease-in-out ${settings.background ? (focusMode ? 'bg-black/50' : 'bg-black/60') : 'bg-transparent'}`} />

      {!settings.background && (<div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-0" />)}

      <div className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center transition-all duration-1000 ${onboardingStep === 0 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <h1 className="relative z-10 font-serif-display italic text-4xl md:text-6xl text-white tracking-tight min-h-[80px] flex items-center"><span>{(!isDeletingName && !isTypingName && (greetingText === "Hello, stranger" || greetingText.startsWith("Welcome back"))) ? <StaggeredText text={greetingText} /> : greetingText}</span>{(isDeletingName || isTypingName) && <span className="inline-block w-[2px] h-8 md:h-12 bg-white ml-1 cursor-blink"></span>}</h1>
        {showLoginBtn && onboardingStep === 0 && (<div className="absolute bottom-20 md:bottom-32 animate-fade-in opacity-0" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}><button onClick={handleLogin} className="group flex items-center gap-3 px-6 py-3 border border-white/20 rounded-full hover:bg-white/10 transition-all hover:border-white/50"><GoogleLogo /><span className="text-sm tracking-widest uppercase text-white/80 group-hover:text-white">Sign in with Google</span></button></div>)}
      </div>

      <div className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-center transition-all duration-700 ${onboardingStep === 1 ? 'opacity-100 blur-enter pointer-events-auto' : 'opacity-0 blur-exit pointer-events-none'}`}>
        <div className="w-full max-w-xl px-8 flex flex-col items-center gap-8"><h2 className="font-serif-display text-3xl md:text-4xl text-white/90 text-center leading-tight">{onboardingStep === 1 && <StaggeredText text="What are we working on?" />}</h2><div className="w-full animate-fade-in" style={{ animationDelay: '0.5s' }}><input ref={sessionInputRef} type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} onKeyDown={finishSessionInput} placeholder="Type here..." className="w-full bg-transparent border-b-2 border-white/20 py-4 text-center text-2xl md:text-3xl text-white focus:outline-none focus:border-white/60 transition-colors font-light" /><p className="text-white/40 text-sm mt-2 flex justify-center items-center gap-2">Press <span className="border border-white/20 px-2 py-0.5 rounded text-xs">Enter</span> to continue</p></div></div>
      </div>

      <div className={`fixed inset-0 z-30 bg-black flex flex-col items-center justify-center transition-all duration-500 ${onboardingStep === 2 && !isMorphing ? 'opacity-100 blur-enter pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="w-full max-w-md px-6 flex flex-col items-center gap-6"><h2 className="font-serif-display text-3xl md:text-4xl text-white/90 text-center leading-tight mb-4">{onboardingStep === 2 && <StaggeredText text="Let's go specific" />}</h2><div className="w-full bg-[#0a0a0a] border border-white/10 p-6 rounded-3xl animate-fade-in" style={{ animationDelay: '0.5s' }}><TaskList
          tasks={tasks}
          setTasks={setTasks}
          pendingTask={pendingTask}
          setPendingTask={setPendingTask}
          showProgressBar={true}
          autoFocus={false}
          onTaskComplete={handleTaskComplete} // <--- THIS CONNECTS THE WIRE
        /></div>{!isMorphing && (<button ref={beginBtnRef} onClick={handleBeginSession} className="mt-4 group flex items-center justify-center gap-3 px-8 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-all hover:px-10 animate-fade-in relative overflow-hidden" style={{ animationDelay: '0.8s' }}><span className="relative z-10 flex items-center justify-center w-full">Begin Session</span></button>)}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -z-10 opacity-0"><div className="flex flex-col items-center w-full"><div className="mb-4 md:mb-6 h-[28px] md:h-[28px] w-[200px]"></div><div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-8 h-[28px] md:h-[32px]"></div><div className="font-digital text-[18vw] md:text-[10rem] lg:text-[12rem] leading-none font-bold tracking-widest select-none tabular-nums text-transparent">00:00</div><div className="flex items-center gap-6 mt-6 md:mt-10"><div ref={playBtnRef} className="w-16 h-16 md:w-20 md:h-20 rounded-full"></div><div className="w-10 h-10"></div></div></div></div>
      </div>

      {isMorphing && beginBtnRect && targetPlayBtnRect && (
        <div className="fixed z-[100] bg-white flex items-center justify-center overflow-hidden" style={{ top: beginBtnRect.top, left: beginBtnRect.left, width: beginBtnRect.width, height: beginBtnRect.height, borderRadius: '9999px', animation: 'morphToTarget 1s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}>
          <style>{`@keyframes morphToTarget { 0% { top: ${beginBtnRect.top}px; left: ${beginBtnRect.left}px; width: ${beginBtnRect.width}px; height: ${beginBtnRect.height}px; border-radius: 9999px; } 100% { top: ${targetPlayBtnRect.top}px; left: ${targetPlayBtnRect.left}px; width: ${targetPlayBtnRect.width}px; height: ${targetPlayBtnRect.height}px; border-radius: 50%; } } @keyframes fadeOutText { to { opacity: 0; } }`}</style>
          <div className="absolute inset-0 flex items-center justify-center text-black font-medium" style={{ animation: 'fadeOutText 0.2s forwards' }}><div className="flex items-center justify-center w-full">Begin Session</div></div>
          <div className="absolute inset-0 flex items-center justify-center text-black opacity-0" style={{ animation: 'fadeInIcon 0.3s 0.6s forwards' }}><Play size={32} fill="black" className="ml-1" /></div>
        </div>
      )}

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
            <button onClick={() => setShowStats(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <BarChart2 size={22} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
              <Settings size={22} />
            </button>
          </div>
        </div>

        {/* --- DESKTOP HEADER: Quote & Settings (Original Position) --- */}
        <div className={`hidden md:flex flex-col items-end absolute top-8 right-12 z-20 transition-opacity duration-700 ease-in-out ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end group relative">
              <p className="font-serif-display italic text-lg text-white/80 max-w-xs text-right leading-snug">"{quote}"</p>
              <button onClick={refreshQuote} disabled={isQuoteLoading} className="absolute top-full right-0 flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40 hover:text-white mt-1 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-20">
                {isQuoteLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Gemini Inspiration
              </button>
            </div>

            <button onClick={() => setShowStats(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <BarChart2 size={20} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <Settings size={20} />
            </button>
          </div>
        </div>

        Here are the changes needed to move the fullscreen button inline with the Music/Friends buttons, style it to match, and remove the version text.

        1. Update the "Desktop Footer Left" Section

        Locate the section commented /* --- DESKTOP FOOTER LEFT: FRIENDS & MUSIC CONTROLS --- */. You need to add the Fullscreen button inside the div that holds the Friends and Music buttons.

        Replace that entire block (approx lines 1667-1704) with this:
        JavaScript

        {/* --- DESKTOP FOOTER LEFT: FRIENDS & MUSIC CONTROLS --- */}
        <div className={`hidden md:flex flex-col items-start absolute bottom-8 left-12 z-50 transition-opacity duration-700 ease-in-out ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
          {/* Live Friend Indicators */}
          {dashboardFriends.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {dashboardFriends.map(f => (
                <button key={f.uid} onClick={() => handleViewFriendStats(f)} className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full animate-fade-in-up hover:bg-white/10 transition-colors text-left group/pill">
                  <div className={`w-1.5 h-1.5 rounded-full ${f.isOnline && f.isActive ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`}></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white flex items-center gap-1">
                      {f.displayName}
                      {f.isPinned && <Pin size={10} className="text-white/50 fill-white/50 opacity-0 group-hover/pill:opacity-100" />}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* New wrapper for Friends, Music, and Fullscreen buttons */}
          <div className="flex items-center gap-3">
            {/* Friends Button */}
            <button onClick={() => setShowFriends(true)} className="cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white group flex items-center gap-2">
              <Users size={20} />
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0 overflow-hidden w-0 group-hover:w-auto">Friends</span>
            </button>

            {/* Music Button */}
            <button onClick={() => setShowMusic(true)} className={`cursor-pointer p-2 rounded-full hover:bg-white/10 transition-colors group flex items-center gap-2 ${isMusicPlaying ? 'text-white animate-pulse' : 'text-white/70 hover:text-white'}`}>
              <Music size={20} />
              <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0 overflow-hidden w-0 group-hover:w-auto">{isMusicPlaying ? 'Playing' : 'Music'}</span>
            </button>
          </div>
        </div>

        {/* --- DESKTOP LOGO (Changed) --- */}
        <div className={`hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-1000 ease-out delay-500 ${onboardingStep === 3 ? (focusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-700' : 'opacity-100') : 'opacity-0 pointer-events-none'}`}>
          <SpinningLogo src="/logo/white.png" className="w-28 h-28 object-contain cursor-pointer" />
        </div>


        {/* --- TIMER SECTION (Main) --- */}
        <main className="flex-1 flex flex-col items-center justify-center min-h-0 w-full px-4 pt-16 md:pt-0 md:absolute md:inset-0 md:z-10 md:pointer-events-none">
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
              <button ref={playBtnRef} onClick={toggleTimer} className={`w-20 h-20 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_0_40px_rgba(255,255,255,0.2)] md:hover:scale-110 md:shadow-[0_0_40px_rgba(255,255,255,0.1)] ${isMorphing ? 'opacity-0' : 'opacity-100'}`}>
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

            {/* Quote (Mobile Only) */}
            <div className={`md:hidden w-full flex flex-col items-center mt-8 px-6 transition-opacity duration-700 ease-in-out ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
              <p className="font-serif-display italic text-lg text-white/60 text-center leading-snug w-full">"{quote}"</p>
            </div>

          </div>
        </main>

        {/* --- TASKS (Bottom) --- */}
        <div className={`w-full flex justify-center z-20 transition-all duration-700 ease-in-out md:absolute md:top-8 md:left-12 md:p-0 md:justify-start md:w-auto md:max-h-none overflow-hidden ${onboardingStep === 3 ? (focusMode ? 'max-h-0 p-0 opacity-0 md:opacity-0 md:hover:opacity-100' : 'max-h-[30vh] p-6 opacity-100') : 'max-h-0 p-0 opacity-0 pointer-events-none'}`}>
          <TaskList tasks={tasks} setTasks={setTasks} pendingTask={pendingTask} setPendingTask={setPendingTask} showProgressBar={true} autoFocus={false} />
        </div>

        {/* --- FOOTER RIGHT (Desktop Only): Fullscreen --- */}
        <div className={`hidden md:flex flex-col items-end absolute bottom-8 right-12 z-20 transition-opacity duration-700 ease-in-out ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div >

      <StatsModal isOpen={showStats} onClose={() => { setShowStats(false); setViewingFriendStats(null); }} stats={stats} user={user} targetUser={viewingFriendStats} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={handleSettingsSave} onBackgroundChange={handleBackgroundChange} user={user} isTimerRunning={isTimerRunning} devMode={devMode} setDevMode={setDevMode} customBackgrounds={customBackgrounds} onAddCustomBackground={handleAddCustomBackground} onDeleteCustomBackground={handleDeleteCustomBackground} />
      {/* --- ADD THIS LINE --- */}
      <MusicModal
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
      />
      {/* --------------------- */}
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
      <UpdateNotificationCard />

      {/* Fullscreen Toggle Button */}
    </div>
  );
}