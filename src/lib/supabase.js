import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof globalThis.process !== 'undefined' && globalThis.process.env && globalThis.process.env[key]) {
    return globalThis.process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://mock.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'mock-anon-key';

if (!getEnvVar('VITE_SUPABASE_URL') || !getEnvVar('VITE_SUPABASE_ANON_KEY')) {
  if (typeof globalThis.process === 'undefined' || globalThis.process.env?.NODE_ENV !== 'test') {
    console.error("Missing Supabase Environment Variables!");
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

