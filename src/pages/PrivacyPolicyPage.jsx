import React from 'react';
import { motion } from 'framer-motion';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white/80 font-sans selection:bg-white/20 selection:text-white flex flex-col items-center py-20 px-6 md:px-0">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        <header className="mb-16 border-b border-white/5 pb-8">
          <h1 className="text-4xl md:text-5xl font-serif-display font-bold text-white mb-4 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm font-mono text-white/40 uppercase tracking-widest">
            Last Updated: December 2025
          </p>
        </header>

        <div className="space-y-12 leading-relaxed text-lg font-light text-white/70">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 font-serif-display">Overview</h2>
            <p className="mb-4">
              altimer is built on a simple principle: your focus belongs to you. I am a solo developer, not a data brokerage. 
              I collect only what is absolutely necessary to make the app function and to keep the servers running.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 font-serif-display">Data Storage</h2>
            <p className="mb-4">
              Most of your data—timer settings, tasks, and history—lives locally on your device using 
              <span className="text-white/90 font-medium"> LocalStorage</span>. 
              This means it stays with you.
            </p>
            <p>
              If you choose to sign in, I use <span className="text-white/90 font-medium">Supabase</span> to sync your settings across devices. 
              Your email is stored securely and is never sold, shared, or used for anything other than authentication and critical service updates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 font-serif-display">Advertising & Cookies</h2>
            <p className="mb-4">
              To support the development costs of altimer, I use <span className="text-white/90 font-medium">Google AdSense</span> to display advertisements.
            </p>
            <p className="mb-4">
              Google and its partners may use cookies to serve ads based on your prior visits to this website or other websites. 
              This enables them to serve relevant ads to you. 
            </p>
            <p>
              You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-white underline decoration-white/30 hover:decoration-white transition-all">Google's Ad Settings</a>.
              Alternatively, you can disable ads entirely within altimer's settings if you prefer a cleaner experience. I believe the choice should be yours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 font-serif-display">Contact</h2>
            <p>
              If you have any questions about your privacy or want to say hello, you can reach me directly at <br/>
              <a href="mailto:altimerapp@proton.me" className="text-white border-b border-white/20 hover:border-white transition-colors pb-0.5">altimerapp@proton.me</a>.
            </p>
          </section>
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
