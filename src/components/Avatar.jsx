import React, { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';
const Avatar = ({ userData, photoURL, name, size = "md", isPinned = false, isPro = false, isDev = false, className = "" }) => {
    const [imageError, setImageError] = useState(false);

    // Data Resolution
    const finalPhoto = photoURL || userData?.photoURL;
    const finalName = name || userData?.displayName || userData?.name;
    const uid = userData?.uid;

    // Check Status
    const userIsDev = isDev;
    const finalIsFlow = userIsDev || isPro || userData?.isPro || userData?.subscription?.plan === 'pro' || userData?.subscription?.plan === 'flow';
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

    // --- DYNAMIC STYLES ---
    // Dev: Purple (#a855f7) -> Fuchsia (#d946ef) -> White
    // Pro: Cyan (#0ea5e9) -> Sky (#22d3ee) -> White
    const glowGradient = userIsDev
        ? "from-purple-500 via-fuchsia-400 to-white"
        : "from-cyan-400 via-sky-400 to-white";

    const ringGradient = userIsDev
        ? 'conic-gradient(transparent 0deg, #a855f7 50deg, #d946ef 100deg, #ffffff 160deg, #a855f7 360deg)'
        : 'conic-gradient(transparent 0deg, #0ea5e9 50deg, #22d3ee 100deg, #ffffff 160deg, #0ea5e9 360deg)';

    return (
        <div className={`relative flex-shrink-0 ${containerSize} ${className} select-none group`}>

            {/* --- THE RING --- */}
            {finalIsFlow && (
                <>
                    {/* 1. Outer Glow */}
                    <div className={`absolute -inset-[4px] rounded-full bg-gradient-to-tr ${glowGradient} opacity-40 blur-md animate-pulse z-0`} />

                    {/* 2. The Rotating Gradient Ring */}
                    <div className="absolute -inset-[2px] rounded-full overflow-hidden z-0">
                        <div className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] animate-[spin_3s_linear_infinite]"
                            style={{ background: ringGradient }}
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