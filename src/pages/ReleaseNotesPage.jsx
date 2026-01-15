import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { releaseNotes } from '../utils/versionData';
import { Storage } from '../utils/storage';
import pkg from '../../package.json';

export default function ReleaseNotesPage() {
  const [activeVersion, setActiveVersion] = useState(0);
  const [hoveredVersion, setHoveredVersion] = useState(null);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const versionRefs = useRef([]);
  const MAX_VISIBLE_TICKS = 6;
  
  useEffect(() => {
    // Ensure version is marked seen when visiting this page
    Storage.setVersionSeen(pkg.version);
    
    // Initialize refs array
    versionRefs.current = versionRefs.current.slice(0, releaseNotes.length);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.dataset.index);
            setActiveVersion(index);
            
            // Auto-scroll the rail if active version is out of view
            if (index < visibleStartIndex) {
              setVisibleStartIndex(Math.max(0, index));
            } else if (index >= visibleStartIndex + MAX_VISIBLE_TICKS) {
              setVisibleStartIndex(Math.min(releaseNotes.length - MAX_VISIBLE_TICKS, index - MAX_VISIBLE_TICKS + 1));
            }
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    versionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [visibleStartIndex]);

  const handleTickClick = (index) => {
    versionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScrollRail = (direction) => {
    if (direction === 'up') {
      setVisibleStartIndex(prev => Math.max(0, prev - 1));
    } else {
      setVisibleStartIndex(prev => Math.min(Math.max(0, releaseNotes.length - MAX_VISIBLE_TICKS), prev + 1));
    }
  };

  const visibleVersions = releaseNotes.slice(visibleStartIndex, visibleStartIndex + MAX_VISIBLE_TICKS);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white/20 selection:text-white">
      
      {/* Navigation Rail */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1">
        {/* Scroll Up Arrow */}
        {releaseNotes.length > MAX_VISIBLE_TICKS && (
          <button 
            onClick={() => handleScrollRail('up')}
            disabled={visibleStartIndex === 0}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-opacity duration-200 ${visibleStartIndex === 0 ? 'opacity-0 cursor-default' : 'opacity-50 hover:opacity-100 hover:bg-white/10'}`}
          >
            <ChevronUp size={16} />
          </button>
        )}

        {/* Rail Container */}
        <div className="relative w-8 flex flex-col items-center gap-1">
          
          {visibleVersions.map((release, i) => {
            const actualIndex = visibleStartIndex + i;
            const isHovered = hoveredVersion === actualIndex;
            const isActive = activeVersion === actualIndex;

            return (
              <div 
                key={release.version}
                className="relative w-8 h-6 flex items-center justify-center cursor-pointer group"
                onMouseEnter={() => setHoveredVersion(actualIndex)}
                onMouseLeave={() => setHoveredVersion(null)}
                onClick={() => handleTickClick(actualIndex)}
              >
                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: 10, scale: 0.95 }}
                      animate={{ opacity: 1, x: -10, scale: 1 }}
                      exit={{ opacity: 0, x: 10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-full mr-1 px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">v{release.version}</span>
                        <span className="w-px h-3 bg-white/20" />
                        <span className="text-[10px] text-white/50 uppercase tracking-wider">
                          {new Date(release.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tick Mark */}
                <motion.div
                  layout
                  className={`
                    rounded-full
                    ${isActive ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/20 group-hover:bg-white/60'}
                  `}
                  animate={{
                    width: isHovered ? 24 : isActive ? 16 : 12,
                    height: isHovered ? 4 : 2,
                    opacity: 1
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut"
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Scroll Down Arrow */}
        {releaseNotes.length > MAX_VISIBLE_TICKS && (
          <button 
            onClick={() => handleScrollRail('down')}
            disabled={visibleStartIndex >= releaseNotes.length - MAX_VISIBLE_TICKS}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-opacity duration-200 ${visibleStartIndex >= releaseNotes.length - MAX_VISIBLE_TICKS ? 'opacity-0 cursor-default' : 'opacity-50 hover:opacity-100 hover:bg-white/10'}`}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>



      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pt-32 pb-24">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-2xl"
        >
          {/* Hero Section */}
          <div className="mb-20">
            
            <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight text-white">
              What's New
            </h1>
            <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed max-w-lg">
              Tracking the evolution of DaTimer.
            </p>
          </div>

          {/* Release Timeline */}
          <div className="relative space-y-16 before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-white/10 before:via-white/5 before:to-transparent">
              {releaseNotes.map((release, index) => (
                <motion.div
                  key={release.version}
                  ref={el => versionRefs.current[index] = el}
                  data-index={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
                  className="relative pl-12 group"
                >
                {/* Timeline Node */}
                <div className="absolute left-0 top-0 w-[38px] h-[38px] flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-[#050505] border-2 border-white/20 rounded-full group-hover:border-white group-hover:scale-125 transition-all duration-300 shadow-[0_0_0_4px_#050505]" />
                </div>

                {/* Version Card */}
                <div className="relative">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-mono font-medium text-white tracking-tighter">
                        v{release.version}
                      </h2>
                      {index === 0 && (
                        <span className="px-2 py-0.5 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded-full translate-y-px">
                          Latest
                        </span>
                      )}
                    </div>
                    <span className="text-white/20 text-sm font-mono">
                      {new Date(release.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Changes List */}
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 md:p-8 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.03)]">
                    <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Sparkles size={12} /> Changes
                    </h3>
                    <ul className="space-y-4">
                      {release.changes.map((change, changeIndex) => (
                        <motion.li
                          key={changeIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + (index * 0.1) + (changeIndex * 0.05) }}
                          className="flex items-start gap-4 text-sm md:text-base text-white/70 leading-relaxed group/item"
                        >
                          <span className="mt-2 w-1 h-1 bg-white/30 rounded-full group-hover/item:bg-white group-hover/item:scale-150 transition-all duration-300" />
                          <span className="group-hover/item:text-white transition-colors duration-300">
                            {change}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center mt-24 pt-8 border-t border-white/5"
          >
            <p className="text-white/20 text-xs tracking-widest uppercase hover:text-white/40 transition-colors cursor-default">
              DaTimer &copy; {new Date().getFullYear()}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
