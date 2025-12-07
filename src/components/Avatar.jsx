import React, { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';

const Avatar = ({ userData, photoURL, name, size = "md", isPinned = false, isPro = false, className = "" }) => {
    const [imageError, setImageError] = useState(false);

    // Data Resolution
    const finalPhoto = photoURL || userData?.photoURL;
    const finalName = name || userData?.displayName || userData?.name;
    // Check for "Pro" OR "Flow" status
    const finalIsFlow = isPro || userData?.isPro || userData?.subscription?.plan === 'pro' || userData?.subscription?.plan === 'flow';
    const finalIsPinned = isPinned || userData?.isPinned;

    useEffect(() => { setImageError(false); }, [finalPhoto]);

    // Size Mapping
    const sizeClasses = {
        sm: "w-6 h-6 text-[10px]",
        md: "w-10 h-10 text-xs",
        lg: "w-12 h-12 text-sm",
        xl: "w-20 h-20 text-xl",
        "2xl": "w-32 h-32 text-3xl",
        full: "w-full h-full"
    };

    const containerSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={`relative flex-shrink-0 ${containerSize} ${className} select-none group`}>

            {/* --- THE ICY FLOW RING --- */}
            {finalIsFlow && (
                <>
                    {/* 1. Outer Glow (Icy: Cyan -> Sky -> White) */}
                    <div className="absolute -inset-[4px] rounded-full bg-gradient-to-tr from-cyan-400 via-sky-400 to-white opacity-40 blur-md animate-pulse z-0" />

                    {/* 2. The Rotating Gradient Ring (Icy Tones) */}
                    <div className="absolute -inset-[2px] rounded-full overflow-hidden z-0">
                        <div className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] animate-[spin_3s_linear_infinite]"
                            style={{
                                // Replaced purple (#a855f7) with Sky Blue (#0ea5e9) and White (#ffffff) for the icy shine
                                background: 'conic-gradient(transparent 0deg, #0ea5e9 50deg, #22d3ee 100deg, #ffffff 160deg, #0ea5e9 360deg)'
                            }}
                        />
                    </div>
                </>
            )}

            {/* --- AVATAR IMAGE CONTAINER --- */}
            <div className={`relative z-10 w-full h-full rounded-full overflow-hidden bg-[#111] ${finalIsFlow ? 'border-[2px] border-[#111]' : 'border border-white/10'}`}>
                {finalPhoto && !imageError ? (
                    <img
                        src={finalPhoto}
                        alt={finalName}
                        referrerPolicy="no-referrer"
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center font-bold text-white/80 uppercase">
                        {finalName ? finalName.charAt(0) : '?'}
                    </div>
                )}
            </div>

            {/* Pinned Indicator */}
            {finalIsPinned && (
                <div className="absolute -top-0.5 -right-0.5 w-[30%] h-[30%] bg-white rounded-full flex items-center justify-center border border-black shadow-sm z-20">
                    <Pin size="60%" className="text-black fill-black" />
                </div>
            )}
        </div>
    );
};
export default Avatar;