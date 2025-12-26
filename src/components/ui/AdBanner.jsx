import React, { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Storage } from '../../utils/storage';

const AdBanner = ({ slotId = "1234567890", format = "auto", className = "", adsEnabled }) => {
    // 1. Check if ads should run
    // Using a ref to track initialization to prevent double-pushing in React StrictMode
    const initialized = useRef(false);
    const adRef = useRef(null);
    
    // Get Settings (if prop not passed, fallback to storage)
    const settings = Storage.getSettings();
    const isPro = Storage.peekProStatus();
    
    // Logic: Show if enabled in settings AND user is NOT Pro
    // Use prop if available, else fallback to storage
    const enabled = adsEnabled !== undefined ? adsEnabled : (settings.adsEnabled !== false);
    const shouldShow = enabled && !isPro;

    useEffect(() => {
        if (shouldShow && !initialized.current && window.adsbygoogle) {
            try {
                // Initialize the ad
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                initialized.current = true;
            } catch (e) {
                console.error("AdSense Error:", e);
            }
        }
    }, [shouldShow]);

    if (!shouldShow) return null;

    return (
        <div className={`w-full flex flex-col items-center justify-center py-2 bg-[#0A0A0A] border-t border-white/5 relative z-40 ${className}`}>
            
            {/* Disclaimer / Link */}
            <div className="absolute top-0 right-2 -translate-y-full flex items-center gap-2">
                <a href="/privacy" className="text-[9px] text-white/20 hover:text-white/50 uppercase tracking-widest font-bold flex items-center gap-1 py-1">
                    Ad • Privacy
                </a>
            </div>

            {/* Google AdSense Unit */}
            <div className="overflow-hidden min-h-[50px] md:min-h-[90px] w-full flex justify-center bg-white/5 rounded-lg max-w-[728px]">
               {/* 
                   NOTE: Replace data-ad-slot with your actual Ad Unit ID from Google AdSense dashboard.
                   Current ID is a placeholder. 
                   If using Auto Ads, this component might not be needed, but for manual placement control, keep this.
               */}
                <ins className="adsbygoogle"
                     style={{ display: 'block', width: '100%', height: '100%' }}
                     data-ad-client="ca-pub-3739393828058076"
                     data-ad-slot={slotId}
                     data-ad-format={format}
                     data-full-width-responsive="true"
                     ref={adRef}
                >
                </ins>
            </div>
        </div>
    );
};

export default AdBanner;
