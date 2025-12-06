import React, { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';

const Avatar = ({ userData, photoURL, name, size = "md", isPinned = false, isPro = false }) => {
    const [imageError, setImageError] = useState(false);

    // Extract values: Prefer direct props, fallback to userData object
    const finalPhoto = photoURL || userData?.photoURL;
    const finalName = name || userData?.displayName || userData?.name;
    const finalIsPro = isPro || userData?.isPro || userData?.subscription?.plan === 'pro';
    const finalIsPinned = isPinned || userData?.isPinned;

    useEffect(() => { setImageError(false); }, [finalPhoto]);

    const sizeClasses = {
        sm: "w-6 h-6 text-[10px]",
        md: "w-10 h-10 text-xs",
        lg: "w-12 h-12 text-sm",
        full: "w-full h-full"
    };

    return (
        <div className={`relative flex-shrink-0 ${sizeClasses[size]} select-none group`}>
            {finalIsPro && (
                <>
                    <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-yellow-600 via-amber-400 to-yellow-600 opacity-40 blur-[3px] animate-pulse z-0" />
                    <div className="absolute -inset-[1.5px] rounded-full overflow-hidden z-0">
                        <div className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(transparent 0deg, #b45309 60deg, #fcd34d 180deg, #b45309 300deg, transparent 360deg)' }} />
                    </div>
                </>
            )}
            <div className={`relative z-10 w-full h-full rounded-full overflow-hidden bg-[#111] ${finalIsPro ? 'border-[1.5px] border-transparent bg-clip-padding' : 'border border-white/10'}`}>
                {finalPhoto && !imageError ? (
                    <img src={finalPhoto} alt={finalName} referrerPolicy="no-referrer" onError={() => setImageError(true)} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-white/80 uppercase">
                        {finalName ? finalName.charAt(0) : '?'}
                    </div>
                )}
            </div>
            {finalIsPinned && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center border border-black shadow-sm z-20">
                    <Pin size={8} className="text-black fill-black" />
                </div>
            )}
        </div>
    );
};
export default Avatar;