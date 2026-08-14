"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Sparkles, ShieldCheck, FileText, BrainCircuit, Lock } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: {
    full_name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
}

export default function AuthForm({
  mode,
  onSubmit,
}: AuthFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      let detailMsg = "Something went wrong.";
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
    <div className="min-h-screen bg-[#030c0a] text-teal-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#051512] border border-[#0d332e] rounded-3xl shadow-2xl p-8 md:p-10">
        
        {/* Left Branding Column */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">OmniVerse</h1>
                <p className="text-[11px] text-teal-400 font-semibold tracking-wider uppercase">AI Document Platform</p>
              </div>
            </div>

            <p className="text-xs text-teal-300/80 leading-relaxed mt-6">
              Your intelligent workspace for documents, research, and knowledge discovery powered by multi-document RAG.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#0d332e] text-xs">
            <div className="flex items-center gap-3 text-teal-200">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <FileText className="h-4 w-4" />
              </div>
              <span>Multi-Document RAG Chat</span>
            </div>
            <div className="flex items-center gap-3 text-teal-200">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <span>AI Study Mode &amp; Summaries</span>
            </div>
            <div className="flex items-center gap-3 text-teal-200">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span>Secure &amp; Encrypted Data</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#08201c] border border-[#0e3b34] text-center">
            <div className="relative h-28 w-full flex items-center justify-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center animate-pulse">
                <Lock className="h-10 w-10 text-teal-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {mode === "login" ? "Welcome back!" : "Create Account"}
            </h2>
            <p className="text-xs text-teal-400/80 mt-1">
              {mode === "login" ? "Sign in to your account" : "Start your AI knowledge workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-bold text-teal-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#09211d] border border-[#0e3b34] text-teal-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-teal-600"
                  placeholder="Durga Prasad"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-teal-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#09211d] border border-[#0e3b34] text-teal-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-teal-600"
                placeholder="durga@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-teal-300">
                  Password
                </label>
                {mode === "login" && (
                  <a href="#" className="text-[10px] font-semibold text-teal-400 hover:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#09211d] border border-[#0e3b34] text-teal-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-teal-600"
                placeholder="••••••••••••"
              />
            </div>

            {mode === "login" && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#0e3b34] bg-[#09211d] text-teal-500 focus:ring-teal-500"
                />
                <label htmlFor="remember" className="text-teal-300/80 text-[11px]">
                  Remember me
                </label>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : "Register Account"}
            </button>
          </form>

          <div className="text-center text-[11px] text-teal-400/70 pt-2">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-bold text-teal-300 hover:underline"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-teal-300 hover:underline"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
