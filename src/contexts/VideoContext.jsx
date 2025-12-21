import { createContext, useContext } from 'react';

export const VideoContext = createContext(null);

export const useVideo = () => {
    const context = useContext(VideoContext);
    if (!context) {
        throw new Error('useVideo must be used within a VideoProvider');
    }
    return context;
};
