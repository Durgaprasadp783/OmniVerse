"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { User, Lock, Eye, EyeOff, Sparkles, Zap } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: {
    full_name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
}

export default function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleDemoFill() {
    setEmail("durga@example.com");
    setPassword("Password123!");
    if (mode === "register") {
      setFullName("Durga Prasad");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "register" && fullName.trim().length < 3) {
      setError("Full name must be at least 3 characters.");
      return;
    }

    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    const minPassLen = mode === "register" ? 8 : 6;
    if (password.length < minPassLen) {
      setError(`Password must be at least ${minPassLen} characters.`);
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        full_name: fullName,
        email,
        password,
      });
    } catch (err: unknown) {
      let detailMsg = "Authentication failed. Please check your credentials.";
      if (axios.isAxiosError(err) && err.response?.data) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") {
          detailMsg = detail;
        } else if (Array.isArray(detail)) {
          detailMsg = detail
            .map((item: { msg?: string }) => item.msg || JSON.stringify(item))
            .join(". ");
        }
      }
      setError(detailMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans select-none bg-gradient-to-b from-[#2e1065] via-[#4c1d95] to-[#1e1b4b] px-4 py-8">
      
      {/* ── STARRY SKY & MOUNTAIN / TREE SILHOUETTE BACKGROUND ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing Nebula / Starlight Ambient Gradients */}
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-fuchsia-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[450px] h-[450px] bg-purple-400/25 rounded-full blur-[140px]" />
        <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[160px]" />

        {/* Scattered Stars SVG Background */}
        <svg className="absolute inset-0 w-full h-full opacity-70" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5%" cy="8%" r="1" fill="#ffffff" opacity="0.8" />
          <circle cx="12%" cy="18%" r="1.5" fill="#ffffff" opacity="0.9" />
          <circle cx="18%" cy="7%" r="1" fill="#ffffff" opacity="0.6" />
          <circle cx="22%" cy="25%" r="2" fill="#ffffff" opacity="1" />
          <circle cx="28%" cy="12%" r="1" fill="#ffffff" opacity="0.7" />
          <circle cx="35%" cy="5%" r="1.5" fill="#ffffff" opacity="0.85" />
          <circle cx="42%" cy="22%" r="1" fill="#ffffff" opacity="0.5" />
          <circle cx="48%" cy="15%" r="2" fill="#ffffff" opacity="0.9" />
          <circle cx="55%" cy="8%" r="1.5" fill="#ffffff" opacity="0.75" />
          <circle cx="62%" cy="28%" r="1" fill="#ffffff" opacity="0.6" />
          <circle cx="70%" cy="14%" r="2.2" fill="#ffffff" opacity="1" />
          <circle cx="78%" cy="6%" r="1" fill="#ffffff" opacity="0.8" />
          <circle cx="85%" cy="20%" r="1.5" fill="#ffffff" opacity="0.9" />
          <circle cx="92%" cy="10%" r="1.2" fill="#ffffff" opacity="0.7" />
          <circle cx="96%" cy="26%" r="1.8" fill="#ffffff" opacity="0.85" />
          
          {/* Faint Starlight Clusters */}
          <circle cx="15%" cy="35%" r="0.8" fill="#ffffff" opacity="0.4" />
          <circle cx="25%" cy="42%" r="1" fill="#ffffff" opacity="0.5" />
          <circle cx="75%" cy="38%" r="0.9" fill="#ffffff" opacity="0.6" />
          <circle cx="88%" cy="45%" r="1.1" fill="#ffffff" opacity="0.5" />
        </svg>

        {/* Distant Mountain Layers (SVG Silhouettes) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-80 sm:h-96 md:h-[450px] opacity-40"
          preserveAspectRatio="none"
          viewBox="0 0 1440 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#3b0764"
            d="M0,220 L120,180 L240,230 L380,140 L520,200 L680,110 L820,190 L980,130 L1120,210 L1260,160 L1440,240 L1440,400 L0,400 Z"
          />
          <path
            fill="#2e1065"
            d="M0,280 L160,230 L320,270 L480,190 L640,250 L800,180 L960,240 L1120,190 L1280,260 L1440,210 L1440,400 L0,400 Z"
          />
        </svg>

        {/* Foreground Pine Forest Silhouettes */}
        <svg
          className="absolute bottom-0 left-0 w-full h-56 sm:h-72 md:h-80 opacity-90"
          preserveAspectRatio="none"
          viewBox="0 0 1440 280"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#0f051d"
            d="M0,180 L20,130 L35,170 L55,110 L70,160 L90,90 L110,150 L130,120 L150,170 L170,100 L195,160 L220,80 L245,150 L270,110 L295,170 L320,95 L345,160 L370,120 L395,180 L420,105 L450,165 L480,85 L510,155 L540,115 L570,175 L600,90 L630,160 L660,110 L690,170 L720,100 L750,165 L780,80 L810,150 L840,120 L870,180 L900,95 L930,160 L960,110 L990,170 L1020,85 L1050,155 L1080,115 L1110,175 L1140,95 L1170,160 L1200,105 L1230,170 L1260,85 L1290,155 L1320,110 L1350,175 L1380,90 L1410,160 L1440,120 L1440,280 L0,280 Z"
          />
        </svg>
      </div>

      {/* ── CENTERED FROSTED GLASS LOGIN CARD (Matching User Image) ── */}
      <div className="w-full max-w-[420px] rounded-[32px] bg-white/[0.08] border border-white/20 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] relative z-10 text-white">
        
        {/* Card Header Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-8 tracking-tight drop-shadow-sm">
          {mode === "login" ? "Login" : "Register"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name for Register Mode */}
          {mode === "register" && (
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/[0.12] border border-white/25 text-white placeholder-white/60 rounded-full px-5 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/50 transition backdrop-blur-sm"
                placeholder="Full Name"
              />
              <div className="absolute inset-y-0 right-0 pr-4.5 flex items-center pointer-events-none text-white/80">
                <User className="h-4.5 w-4.5" />
              </div>
            </div>
          )}

          {/* Email / Username Input */}
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.12] border border-white/25 text-white placeholder-white/60 rounded-full px-5 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/50 transition backdrop-blur-sm"
              placeholder="Username"
            />
            <div className="absolute inset-y-0 right-0 pr-4.5 flex items-center pointer-events-none text-white/80">
              <User className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.12] border border-white/25 text-white placeholder-white/60 rounded-full px-5 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/50 transition backdrop-blur-sm"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-white/80 hover:text-white transition cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4.5 w-4.5" />
              ) : (
                <Lock className="h-4.5 w-4.5" />
              )}
            </button>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs text-white/90 pt-1 px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded-sm border-white/40 bg-white/10 text-white focus:ring-0 h-3.5 w-3.5 cursor-pointer accent-white"
              />
              <span className="text-xs text-white/90">Remember me</span>
            </label>

            {mode === "login" && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("To reset password or test the platform, use the 1-click Demo Credentials below.");
                }}
                className="text-xs text-white/85 hover:text-white hover:underline transition"
              >
                Forgot password?
              </a>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs text-center backdrop-blur-md animate-shake">
              {error}
            </div>
          )}

          {/* Solid White Pill CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-white hover:bg-white/95 active:scale-[0.98] text-[#3b0764] font-bold text-base transition-all shadow-lg shadow-black/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#3b0764] border-t-transparent rounded-full animate-spin" />
                <span>Please wait...</span>
              </>
            ) : (
              <span>{mode === "login" ? "Login" : "Register"}</span>
            )}
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="text-center text-xs text-white/85 mt-6">
          {mode === "login" ? (
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-white hover:underline ml-0.5"
              >
                Register
              </Link>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-white hover:underline ml-0.5"
              >
                Login
              </Link>
            </p>
          )}
        </div>

        {/* Quick Demo Autofill Pill */}
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={handleDemoFill}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 hover:text-white px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 transition cursor-pointer"
          >
            <Zap className="h-3 w-3 text-amber-300" />
            <span>Fill Demo Credentials</span>
          </button>
        </div>

      </div>

    </div>
  );
}
