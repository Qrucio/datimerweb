import React, { useState, useEffect } from 'react';
import { Storage } from '../../utils/storage';
import pkg from '../../../package.json';

export default function VersionInfo() {
  const currentVersion = pkg.version;
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    setHasNew(Storage.hasNewVersion(currentVersion));
  }, [currentVersion]);

  const handleVersionClick = () => {
    Storage.setVersionSeen(currentVersion);
    window.location.href = '/releasenotes';
  };

  return (
    <div className="relative group cursor-pointer border-t border-white/5" onClick={handleVersionClick}>
      <div className="flex items-center justify-between px-4 py-3 bg-transparent hover:bg-white/5 transition-all duration-200">
        <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] group-hover:text-white/40 transition-colors">
          v{currentVersion}
        </span>
        {hasNew && (
          <span className="px-1.5 py-0.5 text-[8px] font-bold text-black bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] animate-pulse">
            NEW
          </span>
        )}
      </div>
    </div>
  );
}
