import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      
      const timer = setTimeout(() => {
        setShowBackOnline(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const shouldShow = isOffline || showBackOnline;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "fixed top-6 left-1/2 z-50",
            "flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-zinc-900/80 backdrop-blur-md border",
            "shadow-lg shadow-black/20",
            isOffline ? "border-white/10 text-white/70" : "border-green-500/20 text-green-400"
          )}
        >
          {isOffline ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">Back Online</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
