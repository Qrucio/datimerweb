import React from 'react';
import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white/80 font-sans selection:bg-white/20 selection:text-white flex flex-col items-center py-20 px-6 md:px-0">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-white/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-serif-display font-bold text-white mb-6 tracking-tight lowercase">
            about altimer
          </h1>
        </header>

        <div className="space-y-12 leading-relaxed text-lg font-light text-white/70">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 lowercase font-serif-display">the mission</h2>
            <p className="mb-4">
              we live in an economy of distraction. every app, notification, and algorithm is fighting for a slice of your attention.
            </p>
            <p>
              altimer is a rebellion against that noise. it is designed to be a sanctuary for deep work—a place where you can enter 
              a flow state and stay there. no gamification gimmicks that become chores, no social feeds to scroll, just 
              pure, unadulterated focus tools wrapped in a beautiful interface.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 lowercase font-serif-display">indie built</h2>
            <p className="mb-4">
              altimer is not a venture-backed startup with a board of directors. it is a passion project built by a single developer 
              who needed a better way to work.
            </p>
            <p>
              every line of code, every pixel, and every sound effect was chosen with care. being indie means i answer only to you, the user. 
              your feedback shapes the roadmap, not profit margins.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 lowercase font-serif-display">the stack</h2>
            <p>
              for the curious: altimer is built with <span className="text-white/90 font-medium">React</span> and <span className="text-white/90 font-medium">Vite</span> for speed. 
              it uses <span className="text-white/90 font-medium">Tailwind CSS</span> for styling and <span className="text-white/90 font-medium">Framer Motion</span> for those buttery smooth animations. 
              the backend is powered by <span className="text-white/90 font-medium">Supabase</span>.
            </p>
          </section>
        </div>

        <footer className="mt-20 pt-10 border-t border-white/10 text-center">
           <a href="/" className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors">
             return to altimer
           </a>
        </footer>
      </motion.div>
    </div>
  );
}
