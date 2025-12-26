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
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-serif-display font-bold text-white mb-6 tracking-tight lowercase">
            privacy policy
          </h1>
          <p className="text-sm font-mono text-white/40 uppercase tracking-widest">
            last updated: december 2025
          </p>
        </header>

        <div className="space-y-12 leading-relaxed text-lg font-light text-white/70">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 lowercase font-serif-display">overview</h2>
            <p className="mb-4">
              altimer is built on a simple principle: your focus belongs to you. i am a solo developer, not a data brokerage. 
              i collect only what is absolutely necessary to make the app function and to keep the servers running.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 lowercase font-serif-display">data storage</h2>
            <p className="mb-4">
              most of your data—timer settings, tasks, and history—lives locally on your device using 
              <span className="text-white/90 font-medium"> LocalStorage</span>. 
              this means it stays with you.
            </p>
            <p>
              if you choose to sign in, i use <span className="text-white/90 font-medium">Supabase</span> (an open-source firebase alternative) 
              to sync your settings across devices. your email is stored securely and is never sold, shared, or used for anything 
              other than authentication and critical service updates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 lowercase font-serif-display">advertising & cookies</h2>
            <p className="mb-4">
              to support the development costs of altimer, i use <span className="text-white/90 font-medium">Google AdSense</span> to display advertisements.
            </p>
            <p className="mb-4">
              google and its partners may use cookies to serve ads based on your prior visits to this website or other websites. 
              this enables them to serve relevant ads to you. 
            </p>
            <p>
              you can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-white underline decoration-white/30 hover:decoration-white transition-all">Google's Ad Settings</a>.
              alternatively, you can disable ads entirely within altimer's settings if you prefer a cleaner experience. i believe the choice should be yours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 lowercase font-serif-display">contact</h2>
            <p>
              if you have any questions about your privacy or want to say hello, you can reach me directly at <br/>
              <a href="mailto:altimerapp@proton.me" className="text-white border-b border-white/20 hover:border-white transition-colors pb-0.5">altimerapp@proton.me</a>.
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
