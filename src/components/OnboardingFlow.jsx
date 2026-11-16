/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Loader2, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { UserService } from '../services/userService';
import { generateSuggestedHandle, generateHandleSuggestions } from '../utils/authHelpers.js';

const GoogleLogo = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
        </g>
    </svg>
);

const OnboardingFlow = ({ user, isMigrating, onComplete, currentStep: propStep, onStepChange }) => {
    const [localStep, setLocalStep] = useState(0);
    const internalStep = propStep !== undefined ? propStep : localStep;
    const setInternalStep = (val) => {
        setLocalStep(val);
        if (onStepChange) onStepChange(val);
    };

    // Auth Mode State (Email Flow)
    const [authMode, setAuthMode] = useState('menu'); // 'menu', 'email-input', 'signin', 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [lastAuthMethod, setLastAuthMethod] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [loadingProvider, setLoadingProvider] = useState(null); // 'google', 'guest', 'email'
    const [authError, setAuthError] = useState(null);

    // Handle State
    const [onboardingHandle, setOnboardingHandle] = useState("");
    const [handleStatus, setHandleStatus] = useState("idle"); // 'idle', 'too-short', 'too-long', 'invalid-chars', 'reserved', 'checking', 'available', 'taken', 'error'
    const [handleSuggestions, setHandleSuggestions] = useState([]);
    const [isSavingHandle, setIsSavingHandle] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const inputRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    useEffect(() => {
        const last = localStorage.getItem('lastAuthMethod');
        if (last) setLastAuthMethod(last);
    }, []);

    // Global keyboard listener for Escape key to navigate back
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (authMode === 'signin' || authMode === 'signup') {
                    setAuthMode('email-input');
                    setAuthError(null);
                } else if (authMode === 'email-input') {
                    setAuthMode('menu');
                    setAuthError(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [authMode]);

    // Prefill suggested handle when user is available and step is 1
    useEffect(() => {
        if (internalStep === 1 && !onboardingHandle && user) {
            const suggested = generateSuggestedHandle(user);
            if (suggested) {
                setOnboardingHandle(suggested);
            }
        }
    }, [internalStep, user, onboardingHandle]);

    // Focus input when moving to handle picker
    useEffect(() => {
        if (internalStep === 1) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [internalStep]);

    // Handle Login Success from Step 0 -> Move to Step 1 if handle missing
    useEffect(() => {
        if (user && internalStep === 0) {
            if (user.isAnonymous) {
                if (onComplete) onComplete();
                return;
            }
            if (!user.handle) {
                setInternalStep(1);
            }
        }
    }, [user, internalStep]);

    // Debounced Handle Availability Checker
    useEffect(() => {
        const clean = String(onboardingHandle || '').trim().replace(/^@+/, '').toLowerCase();

        if (internalStep !== 1 || !clean) {
            setHandleStatus("idle");
            setHandleSuggestions([]);
            return;
        }

        if (clean.length < 3) {
            setHandleStatus("too-short");
            setHandleSuggestions([]);
            return;
        }

        if (clean.length > 20) {
            setHandleStatus("too-long");
            setHandleSuggestions([]);
            return;
        }

        if (!/^[a-z0-9_]+$/.test(clean)) {
            setHandleStatus("invalid-chars");
            setHandleSuggestions([]);
            return;
        }

        setHandleStatus("checking");
        const timer = setTimeout(async () => {
            const res = await UserService.checkHandle(clean, user?.uid || user?.id);
            if (!res.success) {
                console.error("Handle check failed:", res.error);
                setHandleStatus("error");
                return;
            }

            if (res.available) {
                setHandleStatus("available");
                setHandleSuggestions([]);
            } else {
                if (res.reason === 'reserved') {
                    setHandleStatus("reserved");
                    setHandleSuggestions([]);
                } else {
                    setHandleStatus("taken");
                    setHandleSuggestions(generateHandleSuggestions(clean));
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [onboardingHandle, internalStep, user]);

    const handleGoogleLogin = async () => {
        if (authLoading) return;
        try {
            setAuthLoading(true);
            setLoadingProvider('google');
            setAuthError(null);
            localStorage.setItem('lastAuthMethod', 'google');
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            });
            if (error) throw error;
        } catch (e) {
            console.error("Google sign-in error:", e);
            setAuthError(e.message || "Failed to start Google sign-in. Please try again.");
            setAuthLoading(false);
            setLoadingProvider(null);
        }
    };

    const handleGuestLogin = async () => {
        if (authLoading) return;
        try {
            setAuthLoading(true);
            setLoadingProvider('guest');
            setAuthError(null);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timed out. Please check your internet connection.')), 15000)
            );
            const { error } = await Promise.race([
                supabase.auth.signInAnonymously(),
                timeoutPromise
            ]);
            if (error) throw error;
        } catch (e) {
            console.error("Guest login error:", e);
            setAuthError(e.message || "Guest login failed. Please try again.");
        } finally {
            setAuthLoading(false);
            setLoadingProvider(null);
        }
    };

    const handleCheckEmail = async () => {
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
            setAuthError("Please enter a valid email address.");
            return;
        }
        if (authLoading) return;

        setAuthLoading(true);
        setLoadingProvider('email');
        setAuthError(null);

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timed out. Please check your internet connection.')), 10000)
            );
            const { data } = await Promise.race([
                supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', cleanEmail)
                    .maybeSingle(),
                timeoutPromise
            ]);

            if (data) {
                setAuthMode('signin');
            } else {
                setAuthMode('signup');
            }
        } catch (e) {
            console.warn("Email check fallback to signup:", e);
            setAuthMode('signup');
        } finally {
            setAuthLoading(false);
            setLoadingProvider(null);
        }
    };

    const handleEmailAuth = async (isSignUp) => {
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail || !password) {
            setAuthError("Please fill in all fields.");
            return;
        }
        if (isSignUp && password !== confirmPassword) {
            setAuthError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setAuthError("Password must be at least 6 characters.");
            return;
        }
        if (authLoading) return;

        setAuthLoading(true);
        setLoadingProvider('email');
        setAuthError(null);
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timed out. Please check your internet connection.')), 15000)
            );

            if (isSignUp) {
                const { error: signUpError } = await Promise.race([
                    supabase.auth.signUp({
                        email: cleanEmail,
                        password,
                        options: {
                            data: { full_name: cleanEmail.split('@')[0] }
                        }
                    }),
                    timeoutPromise
                ]);
                if (signUpError) {
                    if (/user already registered/i.test(signUpError.message || '')) {
                        setAuthMode('signin');
                        throw new Error('An account with this email already exists. Please enter your password to sign in.');
                    }
                    throw signUpError;
                }
            } else {
                const { error: signInError } = await Promise.race([
                    supabase.auth.signInWithPassword({
                        email: cleanEmail,
                        password,
                    }),
                    timeoutPromise
                ]);
                if (signInError) throw signInError;
            }

            localStorage.setItem('lastAuthMethod', 'email');
        } catch (e) {
            console.error("Email auth error:", e);
            const msg = e.message || "Authentication failed";
            if (/invalid login credentials/i.test(msg)) {
                setAuthError("Incorrect email or password. Please try again.");
            } else if (/email not confirmed/i.test(msg)) {
                setAuthError("Please verify your email address to sign in.");
            } else {
                setAuthError(msg);
            }
        } finally {
            setAuthLoading(false);
            setLoadingProvider(null);
        }
    };

    const confirmHandleAndContinue = async () => {
        const clean = String(onboardingHandle || '').trim().replace(/^@+/, '').toLowerCase();
        if (clean.length < 3 || isSavingHandle) return;

        if (handleStatus === 'checking') {
            setIsSavingHandle(true);
            const checkRes = await UserService.checkHandle(clean, user?.uid || user?.id);
            if (!checkRes.success || !checkRes.available) {
                setIsSavingHandle(false);
                setHandleStatus(checkRes.available ? 'available' : (checkRes.reason === 'reserved' ? 'reserved' : 'taken'));
                if (!checkRes.available) {
                    setSaveError(checkRes.reason === 'reserved' ? 'This username is reserved.' : 'That username is taken.');
                }
                return;
            }
        } else if (handleStatus !== 'available') {
            return;
        }

        setIsSavingHandle(true);
        setSaveError(null);

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), 15000)
            );
            const res = await Promise.race([
                UserService.setHandle(user, clean),
                timeoutPromise
            ]);

            if (!res.success) {
                if (res.taken) {
                    setHandleStatus("taken");
                    setSaveError("That handle was just taken. Please choose another.");
                } else {
                    setSaveError(res.error?.message || "Failed to save username. Please try again.");
                }
                setIsSavingHandle(false);
                return;
            }

            localStorage.setItem('zen_user_handle', clean);
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.6 }
            });

            setIsSavingHandle(false);
            if (onComplete) {
                onComplete(clean);
            }
        } catch (e) {
            console.error("Error saving handle:", e);
            setSaveError(e.message || "An unexpected error occurred. Please try again.");
            setIsSavingHandle(false);
        }
    };

    // Stars background
    const stars = useMemo(() => {
        return Array.from({ length: 50 }).map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: Math.random() < 0.7 ? 1 : 2,
            delay: Math.random() * 5
        }));
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-[#020202] overflow-y-auto overflow-x-hidden text-white font-sans selection:bg-white/30 font-light select-none">
            <style>{`
                @keyframes twinkle {
                    0% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                    100% { opacity: 0.2; transform: scale(0.8); }
                }
                .star {
                    position: absolute;
                    background: white;
                    border-radius: 50%;
                    animation: twinkle 4s infinite ease-in-out;
                }
            `}</style>

            {/* Stars Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                {stars.map((s, i) => (
                    <div
                        key={i}
                        className="star"
                        style={{
                            top: s.top,
                            left: s.left,
                            width: s.size,
                            height: s.size,
                            animationDelay: `${s.delay}s`
                        }}
                    />
                ))}
            </div>

            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-950/20 pointer-events-none" />

            {/* CONTENT AREA */}
            <AnimatePresence mode="wait">
                {/* STEP 0: LOGIN */}
                {internalStep === 0 && (
                    <motion.div
                        key="step0"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                        transition={{ duration: 0.4 }}
                        className="min-h-[100dvh] w-full z-10 flex flex-col items-center justify-center p-4 sm:p-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
                    >
                        {/* Header Section */}
                        <div className="flex flex-col items-center mb-8 sm:mb-12">
                            <img
                                src="/logo/logo-mark-light.svg"
                                className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mb-4 sm:mb-6 opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                                alt="DaTimer"
                            />
                            <h2 className="text-2xl sm:text-3xl md:text-5xl text-white font-extralight tracking-tight text-center px-4">
                                Time is relative. Come bend it.
                            </h2>
                        </div>

                        {/* Auth Container */}
                        <div className="w-full max-w-sm px-4">
                            <AnimatePresence mode="wait">
                                {authMode === 'menu' ? (
                                    <motion.div
                                        key="menu"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex flex-col items-center gap-4 w-full"
                                    >
                                        <button
                                            onClick={handleGoogleLogin}
                                            disabled={authLoading}
                                            className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 border border-white/10 rounded-full hover:bg-white/5 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full pointer-events-none" />
                                            {authLoading && loadingProvider === 'google' ? (
                                                <Loader2 size={18} className="animate-spin text-white" />
                                            ) : (
                                                <GoogleLogo />
                                            )}
                                            <span className="text-sm font-light tracking-widest text-white/90 group-hover:tracking-[0.18em] transition-all duration-300">
                                                CONTINUE WITH GOOGLE
                                            </span>
                                            {lastAuthMethod === 'google' && (
                                                <span className="absolute -top-2.5 right-4 bg-white text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md tracking-wider">
                                                    LAST USED
                                                </span>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => { setAuthMode('email-input'); setAuthError(null); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                                            disabled={authLoading}
                                            className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 border border-white/10 rounded-full hover:bg-white/5 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
                                        >
                                            <Mail size={16} className="text-white/60 group-hover:text-white transition-colors" />
                                            <span className="text-sm font-light tracking-widest text-white/70 group-hover:text-white group-hover:tracking-[0.18em] transition-all duration-300">
                                                USE EMAIL
                                            </span>
                                            {lastAuthMethod === 'email' && (
                                                <span className="absolute -top-2.5 right-4 bg-white text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md tracking-wider">
                                                    LAST USED
                                                </span>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleGuestLogin}
                                            disabled={authLoading}
                                            className="mt-4 text-[11px] text-white/30 hover:text-white/80 uppercase tracking-[0.25em] transition-all duration-300 hover:tracking-[0.3em] disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-white/40 outline-none rounded-lg p-1 flex items-center gap-2"
                                        >
                                            {authLoading && loadingProvider === 'guest' && <Loader2 size={12} className="animate-spin text-white/50" />}
                                            {authLoading && loadingProvider === 'guest' ? "Entering..." : "Enter as Guest"}
                                        </button>

                                        {authError && (
                                            <p className="mt-3 text-center text-red-400 text-xs tracking-wide">
                                                {authError}
                                            </p>
                                        )}
                                    </motion.div>
                                ) : authMode === 'email-input' ? (
                                    <motion.div
                                        key="email-input"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex flex-col gap-5 w-full"
                                    >
                                        <div className="text-center relative">
                                            <button
                                                type="button"
                                                onClick={() => { setAuthMode('menu'); setAuthError(null); }}
                                                className="absolute left-0 top-1 text-white/40 hover:text-white transition-colors p-1"
                                                title="Back (Esc)"
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                            <h3 className="text-lg font-light text-white tracking-wide">Enter your email</h3>
                                        </div>

                                        {authError && (
                                            <div className="text-center text-red-400 text-xs tracking-wide">
                                                {authError}
                                            </div>
                                        )}

                                        <input
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                                            disabled={authLoading}
                                            autoFocus
                                            className="w-full bg-transparent border-b border-white/20 py-3 text-center text-white text-base placeholder-white/20 focus:outline-none focus:border-white/60 transition-colors disabled:opacity-50"
                                        />

                                        <button
                                            onClick={handleCheckEmail}
                                            disabled={authLoading}
                                            className="w-full py-3.5 mt-2 bg-white/5 border border-white/10 rounded-full text-white font-light tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 uppercase focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
                                        >
                                            {authLoading && <Loader2 size={14} className="animate-spin" />}
                                            Continue
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="password-form"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex flex-col gap-5 w-full"
                                    >
                                        <div className="text-center relative">
                                            <button
                                                type="button"
                                                onClick={() => { setAuthMode('email-input'); setAuthError(null); }}
                                                className="absolute left-0 top-1 text-white/40 hover:text-white transition-colors p-1"
                                                title="Back (Esc)"
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                            <h3 className="text-lg font-light text-white tracking-wide">
                                                {authMode === 'signin' ? 'Welcome back' : 'Create account'}
                                            </h3>
                                            <p className="text-xs text-white/40 mt-1 truncate max-w-[200px] mx-auto">{email}</p>
                                        </div>

                                        {authError && (
                                            <div className="text-center text-red-400 text-xs tracking-wide">
                                                {authError}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    autoComplete={authMode === 'signup' ? "new-password" : "current-password"}
                                                    placeholder="Password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            if (authMode === 'signup') {
                                                                confirmPasswordRef.current?.focus();
                                                            } else {
                                                                handleEmailAuth(false);
                                                            }
                                                        }
                                                    }}
                                                    disabled={authLoading}
                                                    autoFocus
                                                    className="w-full bg-transparent border-b border-white/20 py-2.5 text-center text-white text-base placeholder-white/20 focus:outline-none focus:border-white/60 transition-colors pr-8 disabled:opacity-50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>

                                            {authMode === 'signup' && (
                                                <div className="relative">
                                                    <input
                                                        ref={confirmPasswordRef}
                                                        type={showPassword ? "text" : "password"}
                                                        autoComplete="new-password"
                                                        placeholder="Confirm Password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth(true)}
                                                        disabled={authLoading}
                                                        className="w-full bg-transparent border-b border-white/20 py-2.5 text-center text-white text-base placeholder-white/20 focus:outline-none focus:border-white/60 transition-colors pr-8 disabled:opacity-50"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleEmailAuth(authMode === 'signup')}
                                            disabled={authLoading}
                                            className="w-full py-3.5 mt-2 bg-white/5 border border-white/10 rounded-full text-white font-light tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 uppercase focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
                                        >
                                            {authLoading && <Loader2 size={14} className="animate-spin" />}
                                            {authMode === 'signin' ? 'Enter' : 'Create Account'}
                                        </button>

                                        {/* Mode Toggle Button */}
                                        <div className="text-center mt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAuthError(null);
                                                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                                                }}
                                                className="text-xs text-white/40 hover:text-white transition-colors py-1"
                                            >
                                                {authMode === 'signin' ? "Need an account? Sign up" : "Already have an account? Sign in"}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {/* STEP 1: USERNAME PICKER */}
                {internalStep === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                        transition={{ duration: 0.4 }}
                        className="min-h-[100dvh] w-full z-40 flex flex-col items-center justify-center p-4 sm:p-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
                    >
                        <div className="w-full max-w-xl flex flex-col items-center text-center">
                            <span className="text-xs tracking-[0.35em] text-white/40 uppercase mb-3 font-mono">
                                {isMigrating ? "Account Update" : "Welcome"}
                            </span>
                            <h2 className="text-2xl sm:text-3xl md:text-5xl text-white font-extralight tracking-tight mb-3">
                                What shall we call you?
                            </h2>
                            <p className="text-sm text-white/40 font-light mb-8 sm:mb-12">
                                Choose your unique handle. You can change this later in settings.
                            </p>

                            {/* Handle Input Container */}
                            <div className="w-full flex flex-col items-center">
                                <div className="relative flex items-center justify-center w-full max-w-md py-2 border-b border-white/20 focus-within:border-white/70 transition-colors">
                                    <span className="text-2xl sm:text-3xl md:text-5xl font-thin text-white/30 mr-1 select-none">
                                        @
                                    </span>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={onboardingHandle}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
                                            setOnboardingHandle(val);
                                            setSaveError(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                confirmHandleAndContinue();
                                            }
                                        }}
                                        className="w-full bg-transparent border-none outline-none text-2xl sm:text-3xl md:text-5xl font-thin text-white placeholder-white/10 text-left p-0 focus:ring-0 tracking-normal"
                                        placeholder="username"
                                        spellCheck={false}
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        inputMode="text"
                                    />

                                    {/* Status Indicator */}
                                    <div className="flex items-center ml-3">
                                        {handleStatus === 'checking' && (
                                            <Loader2 size={22} className="animate-spin text-white/40" />
                                        )}
                                        {handleStatus === 'available' && (
                                            <div className="bg-emerald-500/10 p-1.5 rounded-full border border-emerald-500/30">
                                                <Check size={18} className="text-emerald-400" strokeWidth={2.5} />
                                            </div>
                                        )}
                                        {(handleStatus === 'taken' || handleStatus === 'reserved' || handleStatus === 'too-long' || handleStatus === 'invalid-chars') && (
                                            <div className="bg-rose-500/10 p-1.5 rounded-full border border-rose-500/30">
                                                <X size={18} className="text-rose-400" strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Feedback & Suggestions */}
                                <div className="min-h-[90px] mt-4 flex flex-col items-center justify-start w-full">
                                    {saveError && (
                                        <p className="text-rose-400 text-xs tracking-wide mb-3">
                                            {saveError}
                                        </p>
                                    )}

                                    {handleStatus === 'too-short' && (
                                        <span className="text-white/30 text-xs tracking-wider font-light">
                                            Must be at least 3 characters (letters, numbers, underscores)
                                        </span>
                                    )}

                                    {handleStatus === 'too-long' && (
                                        <span className="text-rose-400 text-xs tracking-wider font-light">
                                            Username must be 20 characters or fewer
                                        </span>
                                    )}

                                    {handleStatus === 'invalid-chars' && (
                                        <span className="text-rose-400 text-xs tracking-wider font-light">
                                            Only letters, numbers, and underscores are allowed
                                        </span>
                                    )}

                                    {handleStatus === 'reserved' && (
                                        <span className="text-rose-400 text-xs tracking-wider font-light">
                                            This username is reserved. Please choose another.
                                        </span>
                                    )}

                                    {handleStatus === 'error' && (
                                        <span className="text-rose-400 text-xs tracking-wider font-light">
                                            Could not check username. Please check your internet connection.
                                        </span>
                                    )}

                                    {handleStatus === 'available' && (
                                        <span className="text-emerald-400/90 text-xs tracking-wider uppercase font-mono">
                                            Handle available
                                        </span>
                                    )}

                                    {handleStatus === 'taken' && (
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-rose-400/80 text-xs tracking-wider uppercase font-mono">
                                                Handle taken. Try one of these:
                                            </span>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {handleSuggestions.map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => {
                                                            setOnboardingHandle(s);
                                                        }}
                                                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white text-xs tracking-wider transition-all"
                                                    >
                                                        @{s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit Action */}
                                    <div className="mt-6">
                                        <button
                                            onClick={confirmHandleAndContinue}
                                            disabled={(handleStatus !== 'available' && handleStatus !== 'checking') || isSavingHandle}
                                            className="group flex items-center gap-3 px-8 py-3.5 bg-white text-black rounded-full font-medium tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.15)] focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
                                        >
                                            <span>{isSavingHandle ? "Setting up..." : "Begin"}</span>
                                            {isSavingHandle ? (
                                                <Loader2 size={14} className="animate-spin text-black" />
                                            ) : (
                                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Switch Account option if user signed in with wrong account */}
                                    {user && !user.isAnonymous && (
                                        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/30">
                                            <span>Signed in as <strong className="text-white/60 font-medium">{user.email || user.displayName || 'User'}</strong></span>
                                            <span>•</span>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await supabase.auth.signOut();
                                                    setInternalStep(0);
                                                    setAuthMode('menu');
                                                }}
                                                className="hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                                            >
                                                Switch account
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OnboardingFlow;