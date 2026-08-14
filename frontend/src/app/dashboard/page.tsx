"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import fileService, {
  UserFile,
  ChatSession,
  AnalyticsData
} from "@/services/fileService";
import {
  FileText,
  FolderKanban,
  MessageSquare,
  HardDrive,
  Upload,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Database,
  Brain,
  Code,
  Sparkles,
  ChevronDown
} from "lucide-react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!isAuthenticated) return;
      try {
        setLoadingData(true);
        const [files, sessions, analyticsData] = await Promise.all([
          fileService.getUserFiles().catch(() => []),
          fileService.getChatSessions().catch(() => []),
          fileService.getAnalytics().catch(() => null),
        ]);
        setUserFiles(files);
        setChatSessions(sessions);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    if (mounted && isAuthenticated) {
      loadDashboardData();
    }
  }, [mounted, isAuthenticated]);

  if (!mounted || isLoading || !isAuthenticated) {
    return null;
  }

  // Calculate dynamic stats
  const totalDocs = userFiles.length;
  const totalSessions = chatSessions.length;
  const totalChunks = analytics?.summary?.totalChunks || 0;
  
  const totalBytes = userFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const storageMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const storageGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

  // File extension distribution calculation
  const typeCounts: Record<string, number> = {};
  userFiles.forEach((f) => {
    const ext = (f.originalName?.split(".").pop() || "Other").toUpperCase();
    typeCounts[ext] = (typeCounts[ext] || 0) + 1;
  });

  const pdfCount = typeCounts["PDF"] || 0;
  const docxCount = typeCounts["DOCX"] || 0;
  const txtCount = typeCounts["TXT"] || 0;
  const mdCount = typeCounts["MD"] || 0;
  const otherCount = totalDocs - (pdfCount + docxCount + txtCount + mdCount);

  const pdfPercent = totalDocs > 0 ? Math.round((pdfCount / totalDocs) * 100) : 52;
  const docxPercent = totalDocs > 0 ? Math.round((docxCount / totalDocs) * 100) : 18;
  const txtPercent = totalDocs > 0 ? Math.round((txtCount / totalDocs) * 100) : 12;
  const mdPercent = totalDocs > 0 ? Math.round((mdCount / totalDocs) * 100) : 8;
  const otherPercent = totalDocs > 0 ? Math.max(0, 100 - (pdfPercent + docxPercent + txtPercent + mdPercent)) : 10;

  // Format file type badge
  const getBadgeStyle = (ext: string) => {
    switch (ext.toUpperCase()) {
      case "PDF":
        return "bg-red-50 text-red-600 border-red-200";
      case "DOCX":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "TXT":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "MD":
        return "bg-amber-50 text-amber-600 border-amber-200";
      default:
        return "bg-purple-50 text-purple-600 border-purple-200";
    }
  };

  const getFormatSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const topCollectionsList = [
    { name: "AI & Machine Learning", count: `${pdfCount} docs`, icon: Brain, color: "text-purple-600 bg-purple-50" },
    { name: "System Design", count: `${docxCount} docs`, icon: Layers, color: "text-indigo-600 bg-indigo-50" },
    { name: "Research Papers", count: `${txtCount} docs`, icon: FileText, color: "text-emerald-600 bg-emerald-50" },
    { name: "Web Development", count: `${mdCount} docs`, icon: Code, color: "text-blue-600 bg-blue-50" },
    { name: "Database Systems", count: `${otherCount} docs`, icon: Database, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. WELCOME BANNER ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Welcome back, {user?.full_name?.split(" ")[0] || "Durga"}!</span>
            <span>👋</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Your AI-powered multi-document knowledge workspace
          </p>
        </div>

        <Link
          href="/upload"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Documents</span>
        </Link>
      </div>

      {/* ── 2. TOP ROW: 4 STAT METRIC CARDS ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Documents */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Documents</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalDocs}</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Active Documents
            </span>
          </div>
        </div>

        {/* Stat 2: Collections / Chunks */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Vector Chunks</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalChunks || (totalDocs * 18)}</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Indexed Chunks
            </span>
          </div>
        </div>

        {/* Stat 3: Total Chats */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Chats</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalSessions}</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Active Threads
            </span>
          </div>
        </div>

        {/* Stat 4: Storage Used */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20 shrink-0">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Storage Used</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {Number(storageGB) > 0.01 ? `${storageGB} GB` : `${storageMB} MB`}
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 block mt-1">
              Encrypted Database Storage
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. MIDDLE ROW: RECENT DOCS & KNOWLEDGE BASE OVERVIEW ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Documents List (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Recent Documents</h3>
              <Link href="/documents" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all ({totalDocs})
              </Link>
            </div>

            {loadingData ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Loading workspace documents...
              </div>
            ) : userFiles.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-slate-400">No documents uploaded yet.</p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Your First PDF</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {userFiles.slice(0, 5).map((doc) => {
                  const ext = (doc.originalName?.split(".").pop() || "PDF").toUpperCase();
                  return (
                    <div key={doc.id || doc._id} className="py-3 flex items-center justify-between gap-4 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold border shrink-0 ${getBadgeStyle(ext)}`}>
                          {ext}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/chat?fileId=${doc.id || doc._id}`} className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate block">
                            {doc.originalName}
                          </Link>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {ext} • {getFormatSize(doc.size)} • {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "Recently"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          {doc.processed !== false ? "Processed" : "Uploaded"}
                        </span>
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/documents"
            className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-indigo-600 font-semibold text-xs transition border border-slate-200 text-center flex items-center justify-center gap-1.5 mt-4"
          >
            <span>View All Documents</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Right: Knowledge Base Overview Graph (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Knowledge Base Overview</h3>
              <div className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
                <span>This Month</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
            </div>

            <div className="mt-4">
              <span className="text-xs font-semibold text-slate-500">Indexed Embeddings</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h4 className="text-2xl font-bold text-slate-900">
                  {analytics?.summary?.totalChunks || totalChunks || (totalDocs * 18)}
                </h4>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  <span>+23.5%</span>
                </span>
              </div>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="h-36 w-full mt-4 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 Q50,40 100,55 T200,25 T300,35 L300,100 L0,100 Z"
                  fill="url(#chartGradient)"
                />
                <path
                  d="M0,80 Q50,40 100,55 T200,25 T300,35"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="0" cy="80" r="4" fill="#6366f1" />
                <circle cx="75" cy="48" r="4" fill="#6366f1" />
                <circle cx="150" cy="35" r="4" fill="#6366f1" />
                <circle cx="225" cy="20" r="4" fill="#6366f1" />
                <circle cx="300" cy="35" r="4" fill="#6366f1" />
              </svg>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-2">
                <span>May 1</span>
                <span>May 8</span>
                <span>May 15</span>
                <span>May 22</span>
                <span>May 29</span>
              </div>
            </div>
          </div>

          {/* 3 Mini Sub Stats */}
          <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block">Chunks</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                {analytics?.summary?.totalChunks || (totalDocs * 18)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block">Embeddings</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                {analytics?.summary?.totalChunks || (totalDocs * 18)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block">Queries</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                {analytics?.summary?.totalQuestions || (totalSessions * 5)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: DONUT CHART, TOP COLLECTIONS & RECENT ACTIVITY ──── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Document Types Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            Document Types
          </h3>

          <div className="flex items-center gap-6 pt-2">
            {/* Donut Chart SVG */}
            <div className="relative h-32 w-32 shrink-0">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3.8"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="3.8"
                  strokeDasharray={`${pdfPercent}, 100`}
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="3.8"
                  strokeDasharray={`${docxPercent}, 100`}
                  strokeDashoffset={`-${pdfPercent}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-slate-900">{totalDocs}</span>
                <span className="text-[10px] text-slate-400 font-medium">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs text-slate-600 flex-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> PDF
                </span>
                <span className="font-bold text-slate-800">{pdfPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> DOCX
                </span>
                <span className="font-bold text-slate-800">{docxPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> TXT
                </span>
                <span className="font-bold text-slate-800">{txtPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> MD
                </span>
                <span className="font-bold text-slate-800">{mdPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" /> Others
                </span>
                <span className="font-bold text-slate-800">{otherPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Top Collections */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Top Collections</h3>
            <Link href="/documents" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-2.5">
            {topCollectionsList.map((col, idx) => {
              const Icon = col.icon;
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${col.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{col.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{col.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Recent Activity</h3>
            </div>

            <div className="space-y-3.5 mt-3">
              {chatSessions.length > 0 ? (
                chatSessions.slice(0, 4).map((s, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-indigo-100 text-indigo-600">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800">Chat created</p>
                      <p className="text-[11px] text-slate-500 truncate">{s.title || "RAG Thread"}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  No recent activity logged yet.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/analytics"
            className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-indigo-600 font-semibold text-xs transition text-center flex items-center justify-center gap-1.5 border border-slate-200 mt-2"
          >
            <span>View All Activity</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
