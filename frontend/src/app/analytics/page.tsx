"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import fileService, { AnalyticsData } from "@/services/fileService";
import { BarChart3, TrendingUp, FileText, Layers, MessageSquare, AlertCircle } from "lucide-react";

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
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
      <div className="min-h-[400px] flex items-center justify-center bg-white text-slate-900">
        <div className="h-8 w-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const summary = analytics?.summary;

  return (
    <div className="space-y-8 bg-transparent text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-purple-600" />
            <span>Document &amp; Usage Analytics</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Real-time telemetry on document indices, token chunks, questions asked, and frequent topic clusters.
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-8 w-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold">Calculating document statistics...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {analytics && !loading && (
        <>
          {/* Key Performance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Documents</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{summary?.totalDocuments || 0}</span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">Uploaded files</span>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pages</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-2">{summary?.totalPages || 0}</span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">PDF pages read</span>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chunks</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2">{summary?.totalChunks || 0}</span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">Embedded chunks</span>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Words</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">
                {(summary?.totalWords || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">Indexed words</span>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Questions</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-pink-600 mt-2">{summary?.totalQuestions || 0}</span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">Queries asked</span>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sessions</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-violet-600 mt-2">{summary?.totalSessions || 0}</span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">Active chats</span>
            </div>
          </div>

          {/* Most Asked Topic & Topic Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>Most Asked Topic</span>
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-3">
                  {summary?.mostAskedTopic || "None yet"}
                </h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  Extracted automatically from your user search history and chat session logs.
                </p>
              </div>
              <Link
                href="/chat"
                className="mt-6 text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
              >
                <span>Ask more questions</span>
                <span>→</span>
              </Link>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">
                Top Asked Keywords &amp; Concept Frequency
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {analytics.topTopics.length === 0 ? (
                  <p className="text-xs text-slate-400">Ask questions in chat to reveal frequent topics.</p>
                ) : (
                  analytics.topTopics.map((t) => (
                    <div
                      key={t.topic}
                      className="bg-slate-50 border border-slate-200 hover:border-purple-300 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs transition shadow-2xs"
                    >
                      <span className="text-slate-800 font-semibold">{t.topic}</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                        {t.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Per-Document Breakdown Table */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Document Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-slate-400 text-[10px]">
                  <tr>
                    <th className="p-3 font-bold">Document Name</th>
                    <th className="p-3 font-bold">Pages</th>
                    <th className="p-3 font-bold">Chunks</th>
                    <th className="p-3 font-bold">Words</th>
                    <th className="p-3 font-bold">Questions Asked</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 font-medium">
                        No documents found.
                      </td>
                    </tr>
                  ) : (
                    analytics.documents.map((doc) => (
                      <tr key={doc.fileId} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-semibold text-slate-900 truncate max-w-xs">
                          📄 {doc.filename}
                        </td>
                        <td className="p-3 font-mono text-slate-500">{doc.pages}</td>
                        <td className="p-3 font-mono text-purple-600 font-bold">{doc.chunks}</td>
                        <td className="p-3 font-mono text-emerald-600 font-bold">
                          {doc.words.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-pink-600 font-bold">{doc.questions}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              doc.processed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
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
  );
}
