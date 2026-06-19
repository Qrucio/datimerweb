import { ALARM_SOUNDS, AMBIENT_SOUNDS } from './data';

export const cacheActiveAssets = async (settings) => {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheName = 'datimer-media-cache';
    const cache = await window.caches.open(cacheName);
    const urlsToCache = [];

    // Background is usually stored as a direct URL
    if (settings?.background && typeof settings.background === 'string' && settings.background.trim() !== '') {
      urlsToCache.push(settings.background);
    }
    
    // Alarm sound is stored as an ID
    if (settings?.alarmSound && typeof settings.alarmSound === 'string' && settings.alarmSound.trim() !== '') {
      const alarmObj = ALARM_SOUNDS.find(s => s.id === settings.alarmSound);
      if (alarmObj && alarmObj.src) {
        urlsToCache.push(alarmObj.src);
      } else if (settings.alarmSound.includes('http') || settings.alarmSound.includes('/')) {
        // Fallback if it's already a URL
        urlsToCache.push(settings.alarmSound);
      }
    }

    // Ambient sound could be stored as an ID or an array of active ambient sounds
    if (settings?.ambientSound) {
      if (typeof settings.ambientSound === 'string' && settings.ambientSound.trim() !== '') {
        const ambientObj = AMBIENT_SOUNDS.find(s => s.id === settings.ambientSound);
        if (ambientObj && ambientObj.src) {
          urlsToCache.push(ambientObj.src);
        } else if (settings.ambientSound.includes('http') || settings.ambientSound.includes('/')) {
          urlsToCache.push(settings.ambientSound);
        }
      } else if (Array.isArray(settings.ambientSound)) {
        settings.ambientSound.forEach(snd => {
          if (typeof snd === 'string') {
             const ambientObj = AMBIENT_SOUNDS.find(s => s.id === snd);
             if (ambientObj && ambientObj.src) urlsToCache.push(ambientObj.src);
             else if (snd.includes('http') || snd.includes('/')) urlsToCache.push(snd);
          }
        });
      }
    }

    // Add unique URLs to cache
    for (const url of [...new Set(urlsToCache)]) {
      try {
        await cache.add(url);
      } catch (addError) {
        console.warn(`Failed to cache asset: ${url}`, addError);
      }
    }
  } catch (error) {
    console.warn('Failed to open cache or process active assets:', error);
  }
};
