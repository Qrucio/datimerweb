import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { useVideo } from '../../contexts/VideoContext';
import { createLocalVideoTrack } from 'livekit-client';

const VideoPreview = ({ onJoin }) => {
    const { micEnabled, setMicEnabled, camEnabled, setCamEnabled, isConnecting } = useVideo();
    const videoRef = useRef(null);
    const [localTrack, setLocalTrack] = useState(null);
    const [error, setError] = useState(null);

    // Use a ref to track the active media stream so cleanup is robust
    const activeTrackRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const startPreview = async () => {
            // If camera is disabled, ensure we stop any existing track
            if (!camEnabled) {
                if (activeTrackRef.current) {
                    activeTrackRef.current.stop();
                    activeTrackRef.current = null;
                }
                setLocalTrack(null);
                return;
            }

            // Camera is enabled, create new track
            try {
                // Stop any existing before creating new (just in case)
                if (activeTrackRef.current) {
                    activeTrackRef.current.stop();
                }

                const track = await createLocalVideoTrack({
                    resolution: { width: 640, height: 480 },
                    facingMode: 'user'
                });

                if (!mounted) {
                    track.stop();
                    return;
                }

                activeTrackRef.current = track;
                setLocalTrack(track);

                if (videoRef.current) {
                    track.attach(videoRef.current);
                }
            } catch (err) {
                console.error("Failed to get camera:", err);
                if (mounted) {
                    setError("Camera not accessible");
                    setCamEnabled(false); // Revert state
                }
            }
        };

        startPreview();

        return () => {
             mounted = false;
             if (activeTrackRef.current) {
                 activeTrackRef.current.stop();
                 activeTrackRef.current.detach(); // Detach from DOM
                 activeTrackRef.current = null;
             }
        };
    }, [camEnabled]);

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/5">
            <div className="relative w-full max-w-md aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-6 group">
                {camEnabled ? (
                    <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover transform -scale-x-100" 
                        autoPlay 
                        muted 
                        playsInline 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            <VideoOff size={32} className="text-white/20" />
                        </div>
                    </div>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <button 
                        onClick={() => setMicEnabled(!micEnabled)} 
                        className={`h-11 w-11 flex items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 ${
                            micEnabled 
                                ? 'bg-white text-black hover:bg-white/90 hover:scale-105' 
                                : 'bg-transparent text-red-500 border border-red-500/30 hover:bg-red-500/10'
                        }`}
                    >
                        {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button 
                        onClick={() => setCamEnabled(!camEnabled)} 
                        className={`h-11 w-11 flex items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 ${
                            camEnabled 
                                ? 'bg-white text-black hover:bg-white/90 hover:scale-105' 
                                : 'bg-transparent text-red-500 border border-red-500/30 hover:bg-red-500/10'
                        }`}
                    >
                        {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>
                </div>
            </div>
            <div className="text-center mb-8">
                <h3 className="text-2xl font-medium text-white mb-2">Ready to join?</h3>
                <p className="text-white/40 text-sm">Check your look. You're about to go live.</p>
            </div>
            <button onClick={onJoin} disabled={isConnecting} className="group relative px-8 py-3 bg-white text-black font-semibold rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                {isConnecting ? <Loader2 size={20} className="animate-spin" /> : "Join Channel"}
            </button>
            {error && <p className="mt-4 text-red-400 text-xs">{error}</p>}
        </div>
    );
};
export default VideoPreview;
