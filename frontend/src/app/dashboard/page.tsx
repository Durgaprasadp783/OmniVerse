"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import Link from "next/link";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-zinc-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-md sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              OmniVerse
            </h1>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">
                Dashboard
              </Link>
              <Link href="/upload" className="text-zinc-400 hover:text-zinc-200 transition">
                Document Upload
              </Link>
              <Link href="/chat" className="text-zinc-400 hover:text-zinc-200 transition">
                RAG Chat
              </Link>
              <Link href="/history" className="text-zinc-400 hover:text-zinc-200 transition">
                Chat History
              </Link>


            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm hidden md:inline">
              Welcome, <span className="text-zinc-200 font-medium">{user?.full_name || user?.name || user?.email}</span>
            </span>

            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Success Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-zinc-900 border border-indigo-500/30 shadow-xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-white">
              Dashboard 🎉
            </h2>
            <p className="mt-2 text-zinc-400 max-w-xl">
              Phase 1 Authentication & Phase 2 Document Upload Module are active. Manage your files securely.
            </p>
          </div>

          <Link
            href="/upload"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 shrink-0 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Documents
          </Link>
        </div>

        {/* User Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">User ID</span>
            <p className="text-sm font-mono text-indigo-300 truncate">{user?.id || "N/A"}</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</span>
            <p className="text-sm text-zinc-200 font-medium">{user?.email || "N/A"}</p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Account Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Active
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
