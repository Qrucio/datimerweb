import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { TimePicker } from '../ui/TimePicker';

const SmartMessage = ({ isActive, targetEndTime, mode, isUserActive, focusMode, overrideMessage, layoutId, timeLeft, onUpdateEndTime }) => {
  const [displayText, setDisplayText] = useState("");
  const [key, setKey] = useState("init");
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const popupRef = useRef(null);
  const editButtonRef = useRef(null);

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

      if (targetDate && mode !== 'stopwatch') {
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
    setIsEditing(prev => !prev);
  };

  useEffect(() => {
    if (!isEditing) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };

    const handleClickOutside = (e) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        editButtonRef.current && !editButtonRef.current.contains(e.target)
      ) {
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing]);

  const handleTimeChange = (newTimeStr) => {
    // newTimeStr is "HH:MM" (24h)
    setEditValue(newTimeStr);
    onUpdateEndTime(newTimeStr);
  };

  return (
    <div
      className={`flex justify-center transition-opacity duration-700 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'} relative ${isEditing ? 'z-[100]' : 'z-50'}`}
    >
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
            transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
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
              className={`text-sm font-medium tracking-wide text-center block font-timer-clock 
                ${overrideMessage && overrideMessage.startsWith("I will work on") ? 'text-purple-200 whitespace-normal leading-tight max-w-[80vw] md:max-w-md' : 'text-white whitespace-nowrap'} 
                ${overrideMessage && !overrideMessage.startsWith("I will work on") ? 'text-purple-200' : ''}
                `}
              style={{ textShadow: overrideMessage ? "0 0 20px rgba(168, 85, 247, 0.5)" : "0 0 20px rgba(255,255,255,0.2)" }}
            >
              {displayText}
            </motion.span>
          </AnimatePresence>

          {/* Edit Pencil Icon (Only show if not overriding and time is valid AND TIMER IS PAUSED) */}
          {!overrideMessage && !isActive && mode !== 'stopwatch' && (
            <motion.button
              ref={editButtonRef}
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
              ref={popupRef}
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

export default SmartMessage;
