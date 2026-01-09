
/**
 * Simple client-side encryption for sensitive local storage data.
 * Uses a key derived from device fingerprint to ensure tokens are
 * only valid on the same device/browser context.
 */

const getDeviceKey = async () => {
    // Collect stable device identifiers
    const fingerprint = [
        navigator.userAgent,
        screen.height,
        screen.width,
        Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(fingerprint),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode("altimer-salt"), // Static salt is acceptable here as we just want device binding
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

export const SecureStorage = {
    encrypt: async (data) => {
        try {
            const key = await getDeviceKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoder = new TextEncoder();
            
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encoder.encode(data)
            );

            // Pack IV and ciphertext together
            const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
            const encryptedArray = new Uint8Array(encrypted);
            const encryptedHex = Array.from(encryptedArray).map(b => b.toString(16).padStart(2, '0')).join('');

            return `${ivHex}:${encryptedHex}`;
        } catch (e) {
            console.error("Encryption failed", e);
            return null;
        }
    },

    decrypt: async (cipherText) => {
        try {
            if (!cipherText || !cipherText.includes(':')) return null;
            
            const [ivHex, encryptedHex] = cipherText.split(':');
            
            const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            
            const key = await getDeviceKey();
            
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (e) {
            console.warn("Decryption failed (key mismatch or tampering)", e);
            return null;
        }
    }
};
