import React from 'react';
import { useVideo } from '../../contexts/VideoContext';
import { 
    VideoConference, 
    useTracks,
    GridLayout,
    ParticipantTile
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { X, Maximize2 } from 'lucide-react';

const VideoPipWindow = () => {
    const { isPiP, activeServerId, disconnect, togglePiP } = useVideo();

    // Only render if PiP is active and we have a valid session
    if (!isPiP || !activeServerId) return null;

    // We can use a custom layout for PiP to just show the active speaker or a small grid
    return (
        <div className="fixed bottom-24 left-6 z-[9999] w-64 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group animate-fade-in-up">
            {/* Controls Overlay */}
            <div className="absolute inset-0 z-50 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                 <button 
                    onClick={() => {
                        // Logic to reopen the full server view? 
                        // For now, togglePiP(false) just hides the window, but we want to navigate back.
                        // We will add a "Maximize" handler in the Context or App logic later.
                        // For now, let's just let it be a "close" or "expand" visual.
                        console.log("Expand requested");
                    }}
                    className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
                    title="Expand"
                >
                    <Maximize2 size={16} />
                </button>
                <button 
                    onClick={disconnect} 
                    className="p-2 bg-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                     title="Leave Call"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            {/* We reuse VideoConference but minimal */}
             <div className="w-full h-full [&_.lk-control-bar]:hidden [&_.lk-chat-toggle]:hidden [&_.lk-prejoin]:hidden">
                 <VideoConference 
                    chatMessageFormatter={null} 
                    SettingsComponent={null}
                 />
                 {/* CSS Trickery to hide controls in PiP is handled by the classNames above */}
             </div>
        </div>
    );
};

export default VideoPipWindow;
