import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white/80 font-sans selection:bg-white/20 selection:text-white flex flex-col items-center py-20 px-6 md:px-0">
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        <header className="mb-16 border-b border-white/5 pb-8">
          <h1 className="text-4xl md:text-5xl font-serif-display font-bold text-white mb-4 tracking-tight">
            Get in Touch
          </h1>
          <p className="text-lg font-light text-white/50">
            Bugs, feature requests, or just want to chat? I'm listening.
          </p>
        </header>

        <div className="space-y-6">
          
          {/* Email Card */}
          <a href="mailto:altimerapp@proton.me" className="block group">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-white/5 text-white/60 group-hover:text-white transition-colors">
                  <Mail size={24} />
                </div>
                <h2 className="text-xl font-bold text-white font-serif-display">Email Support</h2>
              </div>
              <p className="text-white/60 font-light mb-6">
                For detailed feedback or account issues. I try to reply to every human email.
              </p>
              <span className="text-white font-mono text-sm border-b border-white/20 pb-0.5 group-hover:border-white transition-colors">
                altimerapp@proton.me
              </span>
            </div>
          </a>

        </div>

        <footer className="mt-20 pt-10 border-t border-white/10 text-center">
           <a href="/" className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors">
             Return to DaTimer
           </a>
        </footer>
      </motion.div>
    </div>
  );
}
