import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

export const PiPOverlay = ({ timeLeft, isActive, toggleTimer }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    let timeout;
    if (isActive && !isHovered) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 600);
    } else {
      setShowControls(true);
    }
    return () => clearTimeout(timeout);
  }, [isActive, isHovered]);

  return (
    <div
      className="fixed inset-0 z-10 flex flex-col items-center justify-center p-2 text-white select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={() => {
        if (!showControls) {
          setIsHovered(true);
        }
      }}
    >
      <div className="flex flex-col items-center justify-center w-full h-full relative">
        {/* Clock */}
        <div
          onClick={toggleTimer}
          className={`
            font-timer-bricolage text-[33vw] leading-none font-bold tracking-tight 
            text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tabular-nums cursor-default 
            transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] absolute top-1/2 left-1/2
            ${showControls ? '-translate-x-1/2 -translate-y-[70%]' : '-translate-x-1/2 -translate-y-1/2'}
          `}
          style={{ fontWeight: 550 }}
        >
          <CountdownTimer timeLeft={timeLeft} disableAnimation={true} />
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={toggleTimer}
          className={`
            absolute bottom-4 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center 
            transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 
            shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 cursor-default shrink-0
            ${showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}
          `}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${isActive ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-90 opacity-0'}`}>
              <Pause size={20} fill="black" />
            </div>
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${!isActive ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}>
              <Play size={20} fill="black" className="ml-0.5" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
