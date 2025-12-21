import React, { useState, useEffect, useCallback } from 'react';
import { LiveKitRoom, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { supabase } from '../../lib/supabase';
import { VideoContext } from '../../contexts/VideoContext';
import '@livekit/components-styles';

export const VideoManager = ({ children, user }) => {
    // Connection State
    const [token, setToken] = useState(null);
    const [activeServerId, setActiveServerId] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    // UI State
    const [isPiP, setIsPiP] = useState(false); // True when modal is closed but video is active
    
    // Preferences (Persist later?)
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);

    const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

    const connect = useCallback(async (serverId) => {
        if (!user || !serverId) return;
        
        setIsConnecting(true);
        setError(null);
        setActiveServerId(serverId);

        try {
            const { data, error } = await supabase.functions.invoke('video-token', {
                body: { serverId, user: { uid: user.uid, displayName: user.displayName || user.email } }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setToken(data.token);
            setIsPiP(false); // Reset PiP when manually joining
        } catch (err) {
            console.error("Failed to connect to video:", err);
            setError(err.message);
            setActiveServerId(null);
        } finally {
            setIsConnecting(false);
        }
    }, [user]);

    const disconnect = useCallback(() => {
        setToken(null);
        setActiveServerId(null);
        setIsPiP(false);
    }, []);

    const togglePiP = useCallback((shouldBePiP) => {
        if (token) {
            setIsPiP(shouldBePiP);
        }
    }, [token]);

    const value = {
        token,
        activeServerId,
        isConnecting,
        error,
        isPiP,
        micEnabled,
        camEnabled,
        setMicEnabled,
        setCamEnabled,
        connect,
        disconnect,
        togglePiP
    };

    return (
        <VideoContext.Provider value={value}>
            {/* 
               We wrap the children in LiveKitRoom ONLY if we have a token.
               Refined Strategy: 
               App content should always be visible. 
               LiveKitRoom should sit "alongside" or wrap it?
               If we wrap the whole App in LiveKitRoom, it might unmount/remount things?
               
               Best Practice: LiveKitRoom should be high up if we want persistent connection.
               If token is null, LiveKitRoom (if rendered) might be idle.
               But usually LiveKitRoom requires a token.
               
               So:
               1. If no token, just render children.
               2. If token, render LiveKitRoom > children.
               
               Wait, if we wrap children in LiveKitRoom, when token changes (null->token), 
               children might remount if not careful.
               
               Let's try creating a separate "RoomHolder" that doesn't interfere with the main app structure 
               if possible, BUT we need the context to be available.
               
               Actually, LiveKitRoom IS the context provider for LiveKit stuff.
               So if we want `useTracks` in the App, LiveKitRoom must wrap it.
            */}
            
            {/* 
               We ALWAYS wrap in LiveKitRoom to prevent unmounting/remounting of children 
               when the token changes. We control connection via the 'connect' prop.
            */}
            <LiveKitRoom
                token={token}
                serverUrl={LIVEKIT_URL}
                connect={!!token}
                video={camEnabled}
                audio={micEnabled}
                data-lk-theme="default"
                style={{ height: '100%', width: '100%' }}
                onDisconnected={() => {
                    // Start cleanup when the room disconnects (e.g. from Leave button)
                    disconnect();
                }}
            >
                {children}
            </LiveKitRoom>
        </VideoContext.Provider>
    );
};
