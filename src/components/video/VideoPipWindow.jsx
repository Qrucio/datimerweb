import React from 'react';
import { useVideo } from '../../contexts/VideoContext';
import { 
    VideoConference, 
    useTracks,
    GridLayout,
    ParticipantTile
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { X, Maximize2, PhoneOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const VideoPipWindow = ({ isSocialModalOpen, onExpand }) => {
    const { isPiP, activeServerId, disconnect } = useVideo();

    // Show ONLY if:
    // 1. We have an active server ID (user joined a call)
    // 2. The main Social/Video Modal is CLOSED (otherwise we show the big view)
    const shouldShow = activeServerId && !isSocialModalOpen;

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-24 left-6 z-[9999] w-80 aspect-video bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 group hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)] transition-shadow duration-500"
                >
                    {/* Controls Overlay */}
                    <div className="absolute inset-0 z-50 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                        <button
                            onClick={() => onExpand(activeServerId)}
                            className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all active:scale-95 shadow-lg border border-white/5"
                            title="Expand to Fullscreen"
                        >
                            <Maximize2 size={18} />
                        </button>
                        <button
                            onClick={disconnect}
                            className="p-3 bg-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white hover:scale-110 transition-all active:scale-95 shadow-lg border border-red-500/10"
                            title="Leave Call"
                        >
                            <PhoneOff size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    {/* We reuse VideoConference but minimal */}
                    {/* Content */}
                    <div className="w-full h-full bg-black">
                        <PipContent />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Separated Content Component to use hooks cleanly
const PipContent = () => {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: true }
    );

    // 1. Check for Screen Share (Highest Priority)
    const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);

    // 2. Filter Camera Tracks (Max 4 for Grid)
    const cameraTracks = tracks
        .filter(t => t.source === Track.Source.Camera)
        .slice(0, 4); // Show max 4 participants in PiP

    // RENDER: Screen Share Mode
    if (screenShareTrack) {
        return (
            <div className="w-full h-full flex flex-col">
                <ParticipantTile
                    trackRef={screenShareTrack}
                    className="w-full h-full"
                    disableSpeakerIndicator
                    style={{ background: 'black' }}
                />
                <style>{`
                    video { object-fit: contain !important; } 
                `}</style>
            </div>
        );
    }

    // RENDER: Grid Mode (1-4 Participants)
    return (
        <div className={`w-full h-full grid ${cameraTracks.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'} ${cameraTracks.length > 2 ? 'grid-rows-2' : 'grid-rows-1'} bg-black`}>
            {cameraTracks.map((track) => (
                <ParticipantTile
                    key={track.participant.identity}
                    trackRef={track}
                    className="w-full h-full overflow-hidden border-[0.5px] border-black"
                    disableSpeakerIndicator
                />
            ))}
            {/* Force Cover to prevent squishing */}
            <style>{`
                .lk-participant-tile video { 
                    object-fit: cover !important; 
                    width: 100% !important;
                    height: 100% !important;
                }
                .lk-participant-placeholder {
                    background: #111 !important;
                }
            `}</style>
        </div>
    );
};


export default VideoPipWindow;
