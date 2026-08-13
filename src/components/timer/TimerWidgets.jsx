import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Lock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export const Toggle = ({ label, checked, onChange }) => (
  <div
    className="flex justify-between items-center w-full group cursor-default py-3 select-none"
    onClick={() => onChange(!checked)}
  >
    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
      {label}
    </span>
    <div
      className={`relative w-[51px] h-[31px] flex-shrink-0 rounded-full border transition-all duration-300 ease-ios ${checked
        ? 'bg-[#34C759] border-[#34C759] shadow-[0_0_15px_rgba(52,199,89,0.4)]'
        : 'bg-[#39393d] border-transparent'
        }`}
    >
      <div
        className={`absolute top-[1px] left-[1px] w-[27px] h-[27px] bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-ios ${checked ? 'translate-x-[20px]' : 'translate-x-0'
          }`}
      />
    </div>
  </div>
);

export const SegmentedToggle = ({ label, checked, onChange, id }) => (
  <div className="flex justify-between items-center w-full group py-2">
    <span className="text-sm text-white/70 group-hover:text-white transition-colors font-medium">{label}</span>

    <div className="flex bg-white/5 p-1 rounded-full w-14 h-8 relative flex-shrink-0">
      {[false, true].map((val) => {
        const isActive = checked === val;
        return (
          <button
            key={String(val)}
            onClick={() => onChange(!checked)}
            className="relative flex-1 h-full rounded-full z-0 flex items-center justify-center outline-none"
          >
            {isActive && (
              <motion.div
                layoutId={`pill-${id}`}
                className={`absolute inset-0 rounded-full shadow-sm ${val ? 'bg-[#4ade80]' : 'bg-white/20'}`}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  </div>
);

export const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between h-20 md:h-24">
    <div className="flex justify-between items-start">
      <span className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
      {Icon && <Icon size={14} className="text-white/30" />}
    </div>
    <div className="text-lg md:text-xl font-light text-white tracking-wide font-timer-clock">{value}</div>
  </div>
);

export const SpotifyIcon = ({ size = 24, className, innerFillClassName }) => (
  <svg width={size} height={size} viewBox="0 0 496 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z" />
    <path fill={innerFillClassName ? undefined : "black"} className={innerFillClassName} d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" />
  </svg>
);

export const BendingDivider = ({ activeSide, isDimmed }) => {
  const variants = {
    idle: { d: "M 3 2 Q 3 10 3 18" },
    bendRight: { d: "M 3 2 Q 7 10 3 18" },
    bendLeft: { d: "M 3 2 Q -1 10 3 18" },
  };

  return (
    <div className={`w-3 h-5 flex items-center justify-center transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
      <svg width="6" height="20" viewBox="0 0 6 20" className="overflow-visible">
        <motion.path
          variants={variants}
          initial="idle"
          animate={activeSide === 'left' ? 'bendRight' : activeSide === 'right' ? 'bendLeft' : 'idle'}
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

export const ExtraTimePopup = ({ minutes, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-black/80 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
          <Zap size={20} fill="black" />
        </div>
        <div>
          <h4 className="text-white font-bold text-sm">Break Skipped</h4>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const CalendarView = ({ historyData, currentMonth, setCurrentMonth, onSelectDate, selectedDate }) => {
  const [viewMode, setViewMode] = useState('days'); // 'days' or 'months'
  const [selectorYear, setSelectorYear] = useState(currentMonth.getFullYear());
  const formatDateId = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const isSameDay = (d1, d2) => {
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

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

    let textStyle = 'text-white/20'; 

    if (dayStats && dayStats.dailyFocusTime > 0) {
      textStyle = 'text-white font-bold'; 
    }

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

export const PersonalityCard = ({ p, activeId, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = activeId === p.id;
  const isElon = p.id === 'elon';

  const borderColor = isActive
    ? (isElon ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]')
    : 'border-white/10 hover:border-white/30';


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
      <div className={`relative h-[45%] w-full overflow-hidden ${p.isEmpty ? 'opacity-30 grayscale' : ''}`}>
        <div className={`absolute inset-0 bg-gradient-to-b ${p.bannerGradient}`} />
        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity duration-500 transform group-hover:scale-110">
          <p.icon size={80} strokeWidth={1} />
        </div>

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

      <div className={`relative flex-1 p-6 md:p-8 flex flex-col ${p.isEmpty ? 'opacity-50' : ''}`}>
        <h3 className={`text-xl md:text-2xl font-semibold tracking-tight mb-3 ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'} transition-colors`}>
          {p.title}
        </h3>
        <div className="flex-1">
          <p className="text-xs md:text-sm leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">
            {p.description}
          </p>
        </div>
        {!p.isEmpty && (
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
            {p.tags.map((tag, i) => (
              <span key={i} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${tag.warn ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
};
