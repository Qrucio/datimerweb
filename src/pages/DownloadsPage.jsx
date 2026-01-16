/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Sparkles } from 'lucide-react';

// Modern Windows 11 Icon (Square Grid)
const WindowsIcon = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M3 3h8.1v8.1H3V3zm0 9.9h8.1V21H3v-8.1zm9.9-9.9H21v8.1h-8.1V3zm0 9.9H21V21h-8.1v-8.1z" />
  </svg>
);

// Custom Android Icon (Loaded from public/icons)
const AndroidIcon = ({ size = 24, className = "" }) => (
  <img
    src="/icons/icons8-android-os.svg"
    alt="Android"
    style={{ width: size, height: size }}
    className={`object-contain ${className}`}
  />
);

// Apple Icon
const AppleIcon = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const GradientOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{
        x: [0, 100, 0],
        y: [0, -50, 0],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/10 blur-[120px]"
    />
    <motion.div
      animate={{
        x: [0, -80, 0],
        y: [0, 80, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-l from-cyan-500/15 to-emerald-500/10 blur-[100px]"
    />
  </div>
);

const PlatformCard = ({
  icon: Icon,
  title,
  subtitle,
  available,
  downloadUrl,
  featured = false,
  index
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.2 + index * 0.1,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative group rounded-3xl overflow-hidden
        ${featured ? 'md:col-span-2 lg:col-span-1' : ''}
      `}
    >
      <div className={`
        relative h-full p-8 md:p-10 rounded-3xl border backdrop-blur-xl flex flex-col
        transition-all duration-500 ease-out
        ${available
          ? 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
          : 'bg-white/[0.02] border-white/[0.06]'
        }
        ${featured && available ? 'shadow-[0_0_80px_rgba(255,255,255,0.05)]' : ''}
      `}>

        {/* Glow Effect */}
        {featured && available && (
          <motion.div
            animate={{ opacity: isHovered ? 0.15 : 0.08 }}
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none"
          />
        )}

        {/* Icon & Content */}
        <div className="relative z-10 flex flex-col flex-grow">
          <motion.div
            animate={{
              scale: isHovered ? 1.05 : 1,
              y: isHovered ? -4 : 0
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`
              w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center mb-8
              ${available
                ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-lg'
                : 'bg-white/5 border-white/5'
              }
            `}
          >
            <Icon
              size={40}
              className={`
                transition-all duration-300
                ${available ? 'text-white opacity-100' : 'text-white/30 opacity-40 grayscale'}
              `}
            />
          </motion.div>

          <div className="flex-1 mb-8">
            <h3 className={`
              text-2xl md:text-3xl font-bold mb-2 tracking-tight
              ${available ? 'text-white' : 'text-white/40'}
            `}>
              {title}
            </h3>
            <p className={`
              text-sm md:text-base leading-relaxed
              ${available ? 'text-white/60' : 'text-white/30'}
            `}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Button Section */}
        <div className="relative z-10 mt-auto">
          {available ? (
            <div className="space-y-4">
              <motion.a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  relative w-full flex items-center justify-center gap-3 py-4 px-6
                  bg-white text-black font-bold text-sm uppercase tracking-widest
                  rounded-2xl overflow-hidden group/btn
                  transition-all duration-300
                  hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]
                "
              >
                <Download size={18} className="transition-transform group-hover/btn:-translate-y-0.5" />
                <span>Download</span>

                <motion.div
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '200%' }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent -skew-x-12"
                />
              </motion.a>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                disabled
                className="
                  w-full flex items-center justify-center gap-3 py-4 px-6
                  bg-white/5 border border-white/10 text-white/20
                  font-bold text-sm uppercase tracking-widest
                  rounded-2xl cursor-not-allowed
                  transition-colors
                "
              >
                <span>Coming Soon</span>
              </button>
            </div>
          )}
        </div>

        {/* Hover Glow */}
        {available && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 40%)'
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default function DownloadsPage() {
  const platforms = [
    {
      platform: 'windows',
      icon: WindowsIcon,
      title: 'Windows',
      subtitle: 'Access features like Screen Time, Strict Mode and more to come!',
      available: true,
      downloadUrl: 'https://www.dropbox.com/scl/fi/9h69e1grcszr526cwfl5k/DaTimer_0.3.7_x64-setup.exe?rlkey=fz56wgxrjc7semhafkd8qwzb5&st=wvjizmgd&dl=0',
      featured: true
    },
    {
      platform: 'macos',
      icon: AppleIcon,
      title: 'macOS',
      subtitle: 'Beautifully designed for Mac with Apple Silicon support.',
      available: false,
    },
    {
      platform: 'android',
      icon: AndroidIcon,
      title: 'Android',
      subtitle: 'Focus on the go with our mobile companion app.',
      available: false,
    },
    {
      platform: 'ios',
      icon: AppleIcon,
      title: 'iOS',
      subtitle: 'Premium mobile experience for iPhone and iPad.',
      available: false,
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          background: #000;
        }
        
        .font-serif-display {
          font-family: 'Playfair Display', serif;
        }
      `}</style>

      <GradientOrbs />

      {/* Grid Pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10">

        {/* Hero Section - Reduced padding significantly */}
        <section className="pt-12 md:pt-20 pb-16 md:pb-24 px-6 md:px-8">
          <div className="max-w-7xl mx-auto text-center">

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-5xl md:text-7xl lg:text-8xl font-serif-display font-medium tracking-tight mb-6"
            >
              <span className="text-white">Focus</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">
                Anywhere.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
            >
              Experience the ultimate productivity timer.
              Native apps for every platform are being built with care.
            </motion.p>
          </div>
        </section>

        {/* Downloads Grid */}
        <section className="pb-24 px-6 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {platforms.map((platform, index) => (
                <PlatformCard
                  key={platform.platform}
                  {...platform}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pb-12 px-6 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5">
              <p className="text-sm text-white/30">
                &copy; {new Date().getFullYear()} DaTimer. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a href="/privacy" className="text-sm text-white/30 hover:text-white/60 transition-colors">
                  Privacy Policy
                </a>
                <a href="/about" className="text-sm text-white/30 hover:text-white/60 transition-colors">
                  About
                </a>
                <a href="/contact" className="text-sm text-white/30 hover:text-white/60 transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
