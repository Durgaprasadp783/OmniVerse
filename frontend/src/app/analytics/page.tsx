"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import fileService, { AnalyticsData } from "@/services/fileService";

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fileService.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load document analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) fetchAnalytics();
  }, [mounted, isAuthenticated, fetchAnalytics]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const summary = analytics?.summary;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md px-6 py-3 shrink-0 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            OmniVerse
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition">Dashboard</Link>
            <Link href="/documents" className="text-zinc-400 hover:text-zinc-200 transition">My Documents</Link>
            <Link href="/chat" className="text-zinc-400 hover:text-zinc-200 transition">RAG Chat</Link>
            <Link href="/study" className="text-zinc-400 hover:text-zinc-200 transition">AI Study Mode</Link>
            <Link href="/analytics" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">Analytics</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400 hidden sm:inline">
            <span className="text-zinc-200 font-medium">{user?.full_name || user?.email}</span>
          </span>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Analytics Dashboard Body */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-8 flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>📊</span>
            <span>Document &amp; Usage Analytics</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Real-time metrics on documents, pages, extracted text, questions asked, and key topic insights.
          </p>
        </div>

        {loading && (
          <div className="text-center py-20 text-zinc-500 flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs">Calculating document statistics...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {analytics && !loading && (
          <>
            {/* Key Performance Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Documents</span>
                <span className="text-3xl font-extrabold text-white mt-2">{summary?.totalDocuments || 0}</span>
                <span className="text-[10px] text-zinc-500 mt-1">Uploaded files</span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pages</span>
                <span className="text-3xl font-extrabold text-indigo-400 mt-2">{summary?.totalPages || 0}</span>
                <span className="text-[10px] text-zinc-500 mt-1">PDF pages read</span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Chunks</span>
                <span className="text-3xl font-extrabold text-cyan-400 mt-2">{summary?.totalChunks || 0}</span>
                <span className="text-[10px] text-zinc-500 mt-1">Embedded chunks</span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Words</span>
                <span className="text-3xl font-extrabold text-emerald-400 mt-2">
                  {(summary?.totalWords || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">Indexed words</span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Questions</span>
                <span className="text-3xl font-extrabold text-amber-400 mt-2">{summary?.totalQuestions || 0}</span>
                <span className="text-[10px] text-zinc-500 mt-1">Queries asked</span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sessions</span>
                <span className="text-3xl font-extrabold text-purple-400 mt-2">{summary?.totalSessions || 0}</span>
                <span className="text-[10px] text-zinc-500 mt-1">Active chats</span>
              </div>
            </div>

            {/* Most Asked Topic & Topic Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    🔥 Most Asked Topic
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-3">
                    {summary?.mostAskedTopic || "None yet"}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Extracted automatically from your user search history and chat session logs.
                  </p>
                </div>
                <Link
                  href="/chat"
                  className="mt-6 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <span>Ask more questions</span>
                  <span>→</span>
                </Link>
              </div>

              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4">
                  Top Asked Keywords &amp; Concept Frequency
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {analytics.topTopics.length === 0 ? (
                    <p className="text-xs text-zinc-500">Ask questions in chat to reveal frequent topics.</p>
                  ) : (
                    analytics.topTopics.map((t) => (
                      <div
                        key={t.topic}
                        className="bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs transition"
                      >
                        <span className="text-zinc-200 font-medium">{t.topic}</span>
                        <span className="bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono text-[10px]">
                          {t.count}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Per-Document Breakdown Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Document Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 border-b border-zinc-800 uppercase tracking-wider text-zinc-500 text-[10px]">
                    <tr>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Pages</th>
                      <th className="p-3">Chunks</th>
                      <th className="p-3">Words</th>
                      <th className="p-3">Questions Asked</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {analytics.documents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-zinc-500">
                          No documents found.
                        </td>
                      </tr>
                    ) : (
                      analytics.documents.map((doc) => (
                        <tr key={doc.fileId} className="hover:bg-zinc-950/50 transition">
                          <td className="p-3 font-semibold text-white truncate max-w-xs">
                            📄 {doc.filename}
                          </td>
                          <td className="p-3 font-mono text-zinc-400">{doc.pages}</td>
                          <td className="p-3 font-mono text-indigo-400">{doc.chunks}</td>
                          <td className="p-3 font-mono text-emerald-400">
                            {doc.words.toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-amber-400">{doc.questions}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                doc.processed
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {doc.processed ? "Ready" : "Unprocessed"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
