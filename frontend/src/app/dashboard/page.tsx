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
            <nav className="hidden sm:flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">
                Dashboard
              </Link>
              <Link href="/documents" className="text-zinc-400 hover:text-zinc-200 transition">
                My Documents
              </Link>
              <Link href="/upload" className="text-zinc-400 hover:text-zinc-200 transition">
                Upload
              </Link>
              <Link href="/chat" className="text-zinc-400 hover:text-zinc-200 transition">
                RAG Chat
              </Link>
              <Link href="/study" className="text-zinc-400 hover:text-zinc-200 transition">
                AI Study Mode
              </Link>
              <Link href="/analytics" className="text-zinc-400 hover:text-zinc-200 transition">
                Analytics
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm hidden md:inline">
              Welcome, <span className="text-zinc-200 font-medium">{user?.full_name || user?.email}</span>
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
      <section className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/30 to-zinc-900 border border-indigo-500/30 shadow-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs px-3 py-1 rounded-full font-semibold">
              🚀 Phase 8 Complete — Advanced OmniVerse Platform
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-3">
              AI Document Intelligence Hub
            </h2>
            <p className="mt-2 text-zinc-400 max-w-xl leading-relaxed text-sm">
              Multi-document RAG, Hybrid Search &amp; Reranking, AI Study Mode (MCQs, Flashcards, Summaries), Voice Input/Output, and Analytics Dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/chat"
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <span>💬 Open RAG Chat</span>
            </Link>
            <Link
              href="/upload"
              className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-sm transition"
            >
              <span>Upload PDF</span>
            </Link>
          </div>
        </div>

        {/* Feature Navigation Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/chat"
            className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition group space-y-3"
          >
            <span className="text-3xl">📄💬</span>
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition">Multi-Doc RAG Chat</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Select multiple PDFs for joint search, cross-document comparison, and grounded answers with reranked sources.
            </p>
          </Link>

          <Link
            href="/study"
            className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition group space-y-3"
          >
            <span className="text-3xl">📝🧠</span>
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition">AI Study Mode</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Interactive MCQ quiz player, flashcard flipper deck, summaries, concept explanations, and exam revision guides.
            </p>
          </Link>

          <Link
            href="/analytics"
            className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition group space-y-3"
          >
            <span className="text-3xl">📊🔥</span>
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition">Document Analytics</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Track total pages, embedded chunks, indexed words, questions asked, and top requested topics.
            </p>
          </Link>

          <Link
            href="/documents"
            className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition group space-y-3"
          >
            <span className="text-3xl">📚✏️</span>
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition">Document Manager</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Dashboard listing uploaded files with stats, download original files, rename documents, and delete.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
