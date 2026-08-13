import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trash2, Check, X, Lock, Unlock, Download } from 'lucide-react';

export const LiquidDeleteBtn = ({ onDelete }) => {
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

export const LiquidResetBtn = ({ onReset, disabled }) => {
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

export const LiquidStrictBtn = ({
  isStrict,
  onEnable,
  onDisable,
  isLocked,
  onMouseEnter,
  mode,
  onMenuChange
}) => {
  const [status, setStatus] = useState('idle');
  const containerRef = useRef(null);
  const isMenuOpen = status === 'confirming';

  // Always show "download app" prompt since we can't detect desktop app installation
  const isMissing = true;
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
  let btnText = "text-white/70 hover:text-white";
  let iconColor = "text-white/70 group-hover:text-white transition-colors"; // Explicit icon transition

  if (isMissing) {
    // Red Warning Style
    btnBg = "bg-red-500/10 border border-red-500/20 animate-pulse hover:bg-red-500/20";
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
                  Strict Mode requires our free desktop app to block websites.
                </p>
                <a
                  href="/downloads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
                >
                  <Download size={14} />
                  Download App
                </a>
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
