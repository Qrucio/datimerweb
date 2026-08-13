import React from 'react';
import RevealLogo from './RevealLogo';

const AppLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <RevealLogo src="/logo/logo-mark-light.svg" className="w-16 h-16 opacity-50" disableReveal={true} />
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  </div>
);

export default AppLoader;
