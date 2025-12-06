import { CloudRain, CloudLightning, Wind, Waves, Coffee, Tent, Train, Keyboard, Music, Radio } from 'lucide-react';

export const BACKGROUND_OPTIONS = [
    { id: 'canyonnight', src: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?q=80&w=1920&auto=format&fit=crop' },
    { id: 'greenforest', src: 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'mars', src: 'https://cdn.pixabay.com/video/2021/02/13/65129-512069341_medium.mp4' },
    { id: 'earth', src: 'https://images.unsplash.com/photo-1534996858221-380b92700493?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: 'noensunset', src: 'https://cdn.pixabay.com/video/2021/02/14/65182-513048357_small.mp4' },
    { id: 'lightinthefall', src: 'https://cdn.pixabay.com/video/2022/08/10/127433-738466676_medium.mp4' },
    { id: 'mountains', src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=kalen-emsley-Bkci_8qcdvQ-unsplash.jpg&w=1920' },
    { id: 'watercolornature', src: 'https://images.unsplash.com/photo-1694369999734-e2aaded39109?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=birmingham-museums-trust--7BpqU1rD2E-unsplash.jpg&w=1920' },
    { id: 'auroralights', src: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=lightscape-LtnPejWDSAY-unsplash.jpg&w=1920' },
    { id: 'tokyonightlight', src: 'https://images.unsplash.com/photo-1626946548234-a65fd193db41?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=qiwei-hou-6PA1vVnnKtg-unsplash.jpg&w=1920' },
    { id: 'bluegradient', src: 'https://cdn.pixabay.com/video/2022/03/06/109908-685705862_small.mp4' },
];

export const MUSIC_TRACKS = [
    {
        id: 'lofi-study',
        title: 'Lofi Study',
        src: 'https://archive.org/download/track1_202511/track1.mp3',
        cover: 'https://i.pinimg.com/736x/9c/76/23/9c7623f7939be1725435bef4dea604f8.jpg'
    },
    {
        id: 'binaural',
        title: 'Binaural Beats',
        src: 'https://archive.org/download/track2_202511/track1.mp3',
        cover: 'https://i.pinimg.com/736x/96/03/ce/9603cee1ddcce4c184587c66532fbc63.jpg'
    },
    {
        id: 'deep-focus',
        title: 'Deep Focus Ambient',
        src: 'https://archive.org/download/track2_202511/track2.mp3',
        cover: 'https://i.pinimg.com/736x/e2/4e/0d/e24e0d3d5f5f07c562f08a5ebfc4c776.jpg'
    },
];

export const AMBIENT_SOUNDS = [
    { id: 'rain', title: 'Soft Rain', icon: CloudRain, src: 'https://assets.mixkit.co/active_storage/sfx/2393/2393.wav' },
    { id: 'thunder', title: 'Thunder', icon: CloudLightning, src: 'https://assets.mixkit.co/active_storage/sfx/2395/2395.wav' },
    { id: 'flowingwater', title: 'Nature', icon: Wind, src: 'https://assets.mixkit.co/active_storage/sfx/61/61.wav' },
    { id: 'ocean', title: 'Ocean', icon: Waves, src: 'https://cdn.pixabay.com/download/audio/2024/10/12/audio_7dd52a2e33.mp3?filename=ocean-waves-250310.mp3' },
    { id: 'cafe', title: 'Coffee Shop', icon: Coffee, src: 'https://cdn.pixabay.com/download/audio/2021/10/10/audio_1009cd220b.mp3?filename=cafe-ambience-9263.mp3' },
    { id: 'campfire', title: 'Campfire', icon: Tent, src: 'https://cdn.pixabay.com/download/audio/2025/11/19/audio_908a09a5b0.mp3?filename=campfire-crackling-sound-439573.mp3' },
    { id: 'train', title: 'Train Ride', icon: Train, src: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_21e77afab8.mp3?filename=train-riding-inside-17188.mp3' },
    { id: 'keyboard', title: 'Typing', icon: Keyboard, src: 'https://cdn.pixabay.com/download/audio/2025/03/03/audio_9ecd5092f4.mp3?filename=typing-on-laptop-keyboard-308455.mp3' },
];