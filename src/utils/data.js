
import { CloudRain, CloudLightning, Wind, Waves, Coffee, Tent, Train, Keyboard, Music, Radio } from 'lucide-react';




export const BACKGROUND_OPTIONS = [
    {
        id: 'canyonnight',
        src: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?q=80&w=1920&auto=format&fit=crop',
        credit: { name: 'Mark Basarab', url: 'https://unsplash.com/photos/blue-starry-night-1OtUkD_8svc' }
    },
    {
        id: 'greenforest',
        src: 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        credit: { name: 'John Towner', url: 'https://unsplash.com/photos/empty-concrete-road-covered-surrounded-by-tall-tress-with-sun-rays-3Kv48NS4WUU' }
    },
    {
        id: 'mars',
        src: 'https://cdn.pixabay.com/video/2021/02/13/65129-512069341_medium.mp4',
        credit: { name: 'ChristianBodhi', url: 'https://pixabay.com/videos/mars-planet-space-stars-universe-65129/' }
    },
    {
        id: 'earth',
        src: 'https://images.unsplash.com/photo-1534996858221-380b92700493?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        credit: { name: 'ActionVance', url: 'https://unsplash.com/photos/outer-space-photography-of-earth-t7EL2iG3jMc' }
    },
    {
        id: 'noensunset',
        src: 'https://cdn.pixabay.com/video/2021/02/14/65182-513048357_small.mp4',
        credit: { name: '_Pabliyo', url: 'https://pixabay.com/videos/sunset-ocean-sea-sun-dusk-65182/' }
    },
    {
        id: 'lightinthefall',
        src: 'https://cdn.pixabay.com/video/2022/08/10/127433-738466676_medium.mp4',
        credit: { name: 'Favorisxp', url: 'https://pixabay.com/videos/nature-forest-sun-light-trees-127433/' }
    },
    {
        id: 'mountains',
        src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=kalen-emsley-Bkci_8qcdvQ-unsplash.jpg&w=1920',
        credit: { name: 'Kalen Emsley', url: 'https://unsplash.com/photos/scenic-view-of-mountains-during-dawn-Bkci_8qcdvQ' }
    },
    {
        id: 'watercolornature',
        src: 'https://images.unsplash.com/photo-1694369999734-e2aaded39109?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=birmingham-museums-trust--7BpqU1rD2E-unsplash.jpg&w=1920',
        credit: { name: 'Birmingham Museums Trust', url: 'https://unsplash.com/photos/a-painting-of-a-mountain-range-with-a-lake-in-the-foreground--7BpqU1rD2E' }
    },
    {
        id: 'auroralights',
        src: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=lightscape-LtnPejWDSAY-unsplash.jpg&w=1920',
        credit: { name: 'Lightscape', url: 'https://unsplash.com/photos/aurora-borealis-LtnPejWDSAY' }
    },
    {
        id: 'tokyonightlight',
        src: 'https://images.unsplash.com/photo-1626946548234-a65fd193db41?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=qiwei-hou-6PA1vVnnKtg-unsplash.jpg&w=1920',
        credit: { name: 'Qiwei Hou', url: 'https://unsplash.com/photos/people-walking-on-street-during-night-time-6PA1vVnnKtg' }
    },
    {
        id: 'bluegradient',
        src: 'https://cdn.pixabay.com/video/2022/03/06/109908-685705862_small.mp4',
        credit: { name: 'edisonpalacios98', url: 'https://pixabay.com/videos/background-blue-abstract-gradient-109908/' }
    },
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
];

export const ALARM_SOUNDS = [
    { id: 'digital', title: 'Digital', src: '/sounds/timer-end.mp3' },
    { id: 'classic', title: 'Classic', src: 'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav' },
    { id: 'bell', title: 'Bell', src: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=service-bell-ring-14610.mp3' },
];