import React, { useEffect } from 'react';
import { ChevronLeft, Calendar, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { releaseNotes } from '../utils/versionData';
import { Storage } from '../utils/storage';
import pkg from '../../package.json';

export default function ReleaseNotesPage() {
  
  useEffect(() => {
    // Ensure version is marked seen when visiting this page
    Storage.setVersionSeen(pkg.version);
  }, []);

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white/20 selection:text-white">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 p-6 md:p-8 flex justify-between items-center pointer-events-none">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={handleBack}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-bold text-xs tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          <ArrowLeft size={14} strokeWidth={3} />
          <span>BACK</span>
        </motion.button>
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
              Tracking the evolution of your focus environment.
            </p>
          </div>

          {/* Release Timeline */}
          <div className="relative space-y-16 before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-white/10 before:via-white/5 before:to-transparent">
            {releaseNotes.map((release, index) => (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
                className="relative pl-12 group"
              >
                {/* Timeline Node */}
                <div className="absolute left-0 top-2 w-[38px] h-[38px] flex items-center justify-center">
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
              Altimer &copy; {new Date().getFullYear()}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
