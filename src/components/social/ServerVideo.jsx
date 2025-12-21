import React, { useCallback } from 'react';
import { VideoConference, useLocalParticipant } from '@livekit/components-react';
import { useVideo } from '../../contexts/VideoContext';
import VideoPreview from '../video/VideoPreview';
import { WifiOff, Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from 'lucide-react';

const CustomControlBar = () => {
    // We fetch LOCAL hook state for UI feedback (is it ACTUALLY on according to LiveKit?)
    // But we use CONTEXT setters to drive the logic so LiveKitRoom props update cleanly.
    const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
    const { 
        disconnect, 
        micEnabled, setMicEnabled, 
        camEnabled, setCamEnabled 
    } = useVideo();

    if (!localParticipant) return null;

    const toggleMic = useCallback(async () => {
        try {
            const newState = !micEnabled; // Use our context state as the source of intended truth
            // 1. App State Sync (Instant UI feedback)
            setMicEnabled(newState);
            // 2. LiveKit Imperative Call (Actually does the work)
            if (localParticipant) {
                await localParticipant.setMicrophoneEnabled(newState);
                
                // EXPLICIT HARDWARE RELEASE
                // Sometimes setMicrophoneEnabled(false) unpublishes but doesn't stop the media track immediately.
                if (!newState) {
                    const audioTracks = localParticipant.audioTrackPublications;
                    audioTracks.forEach((pub) => {
                        if (pub.track) {
                            pub.track.stop(); // Stop LocalTrack
                            pub.track.mediaStreamTrack.stop(); // Stop native MediaStreamTrack (Releases Light)
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Mic toggle failed", e);
            // Revert on error
            setMicEnabled(!micEnabled);
        }
    }, [micEnabled, setMicEnabled, localParticipant]);

    const toggleCam = useCallback(async () => {
        try {
            const newState = !camEnabled;
            setCamEnabled(newState);
            if (localParticipant) {
                await localParticipant.setCameraEnabled(newState);
            }
        } catch (e) {
            console.error("Cam toggle failed", e);
            setCamEnabled(!camEnabled);
        }
    }, [camEnabled, setCamEnabled, localParticipant]);

    const toggleScreen = async () => {
        // Screen share is not controlled by LiveKitRoom props in our setup (no screen={} prop used currently)
        // So we toggle via localParticipant directly.
        try {
            await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
        } catch (e) {
            console.error("Screen share error:", e);
        }
    };

    return (
        <div className="lk-control-bar shadow-xl">
            {/* Microphone */}
            <div className={`lk-button-group ${isMicrophoneEnabled ? 'active' : ''}`}>
                <button 
                    className={`lk-button ${isMicrophoneEnabled ? 'lk-button-active' : 'lk-button-danger'}`}
                    onClick={toggleMic}
                    title="Toggle Microphone"
                >
                    {isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
            </div>

            {/* Camera */}
            <div className={`lk-button-group ${isCameraEnabled ? 'active' : ''}`}>
                <button 
                    className={`lk-button ${isCameraEnabled ? 'lk-button-active' : 'lk-button-danger'}`}
                    onClick={toggleCam}
                    title="Toggle Camera"
                >
                    {isCameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
            </div>

            {/* Screen Share */}
            <div className={`lk-button-group ${isScreenShareEnabled ? 'active' : ''}`}>
                <button 
                    className={`lk-button ${isScreenShareEnabled ? 'lk-button-active' : ''}`}
                    onClick={toggleScreen}
                    title="Share Screen"
                >
                    <MonitorUp size={20} />
                </button>
            </div>

            {/* Leave */}
            <button 
                className="lk-disconnect-button lk-button"
                onClick={disconnect}
                title="Leave Channel"
            >
                <PhoneOff size={20} />
                <span className="ml-2 font-semibold">Leave</span>
            </button>
        </div>
    );
};

const ServerVideo = ({ serverId, user }) => {
    const { 
        token, 
        activeServerId, 
        connect, 
        disconnect,
        error 
    } = useVideo();

    // If connected to THIS server, show the conference
    const isConnectedToThisServer = token && activeServerId === serverId;
    
    // If connected to ANOTHER server
    const isBusy = token && activeServerId !== serverId;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-400">
                <WifiOff size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-white mb-2">Connection Failed</h3>
                <p className="text-sm text-white/40 mb-4">{error}</p>
                <button 
                    onClick={() => connect(serverId)}
                    className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (isConnectedToThisServer) {
        return (
            <div className="h-full w-full relative group bg-[#111] overflow-hidden">
                {/* 
                  VideoConference handles the Grid/Focus layout. 
                  We hide its default controls via CSS (.lk-video-conference .lk-control-bar { display: none; })
                  and overlay our custom one.
                */}
                <div className="h-full w-full">
                    <VideoConference />
                </div>
                
                {/* Custom Control Bar - Docked Overlay - Tighter Gradient & Spacing */}
                <div className="absolute bottom-0 left-0 w-full flex items-center justify-center p-3 z-50 pointer-events-none">
                    <div className="pointer-events-auto">
                        <CustomControlBar />
                    </div>
                </div>
            </div>
        );
    }

    if (isBusy) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/50 text-center p-8">
                <h3 className="text-lg font-bold text-white mb-2">Busy</h3>
                <p className="mb-6 max-w-xs mx-auto">You are currently in another channel.</p>
                <button 
                    onClick={() => {
                        disconnect();
                        setTimeout(() => connect(serverId), 500); // Small delay to allow disconnect cleanup
                    }}
                    className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full hover:bg-red-500 hover:text-white transition-all font-medium text-sm"
                >
                    Leave Current & Join Here
                </button>
            </div>
        );
    }

    // Default: Show Preview
    return <VideoPreview onJoin={() => connect(serverId)} />;
};

export default ServerVideo;
