import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Lock, Eye, Server, Cookie } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: Shield,
      title: "Overview",
      content: "Altimer is designed with privacy as a core principle. We believe your focus data belongs to you. This policy outlines how we handle the minimal data we interact with and how we integrate with third-party services to keep the platform free."
    },
    {
      icon: Cookie,
      title: "Advertising & Cookies",
      content: "To support the development of Altimer, we use Google AdSense to serve advertisements. Google may use cookies to serve ads based on your prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to Altimer and/or other sites on the Internet. You can opt out of personalized advertising by visiting Google's Ads Settings."
    },
    {
      icon: Server,
      title: "Data Storage",
      content: "Your preferences, timer settings, and task history are primarily stored locally on your device using LocalStorage. If you choose to sign in, we use Supabase for authentication and to sync your settings across devices. We do not sell your personal data to third parties."
    },
    {
      icon: Eye,
      title: "Your Choices",
      content: "You have full control over your experience. You can disable advertisements at any time through the Settings menu. Pro members have ads disabled by default. You can also clear your local data via browser settings or the 'Clear Data' option in our debug menu."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white/20 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <div className="fixed top-8 left-8 z-50">
        <a 
          href="/" 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-white/60 hover:text-white transition-all backdrop-blur-md group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-wide">Back to App</span>
        </a>
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
          <div className="mb-20 text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl">
              <Lock size={32} className="text-white/80" />
            </div>
            <h1 className="text-5xl md:text-6xl font-serif-display font-bold mb-6 tracking-tight text-white">
              Privacy Policy
            </h1>
            <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed max-w-lg mx-auto">
              Transparency about how we handle your data and keep Altimer running.
            </p>
            <p className="text-white/20 text-xs uppercase tracking-widest font-bold mt-8">
              Last Updated: December 2025
            </p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
                  className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 rounded-xl bg-white/5 text-white/70">
                      <Icon size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-wide">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-white/60 leading-relaxed text-sm md:text-base font-light">
                    {section.content}
                  </p>
                </motion.div>
              );
            })}
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
