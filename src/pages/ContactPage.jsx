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

          {/* Socials / X - Placeholder */}
          {/* 
            TODO: Create Twitter/X account and update link.
            Current link is a placeholder to the home page or generic.
          */}
          <a href="https://x.com/altimerapp" target="_blank" rel="noopener noreferrer" className="block group">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-white/5 text-white/60 group-hover:text-white transition-colors">
                  {/* Simple X icon or Message icon */}
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </div>
                <h2 className="text-xl font-bold text-white font-serif-display">Follow Updates</h2>
              </div>
              <p className="text-white/60 font-light mb-6">
                Follow for changelogs, sneak peeks of new features, and occasional thoughts on productivity.
              </p>
              <span className="text-white font-mono text-sm border-b border-white/20 pb-0.5 group-hover:border-white transition-colors">
                @altimerapp
              </span>
            </div>
          </a>

        </div>

        <footer className="mt-20 pt-10 border-t border-white/10 text-center">
           <a href="/" className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors">
             Return to altimer
           </a>
        </footer>
      </motion.div>
    </div>
  );
}
