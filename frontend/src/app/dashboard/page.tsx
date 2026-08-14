"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  FolderKanban,
  MessageSquare,
  HardDrive,
  Upload,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  FileCode,
  FileSpreadsheet,
  Clock,
  Layers,
  Database,
  Brain,
  Code,
  CheckCircle2,
  ChevronDown
} from "lucide-react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
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

  if (!mounted || isLoading || !isAuthenticated) {
    return null;
  }

  const recentDocs = [
    {
      name: "Deep Learning Fundamentals.pdf",
      type: "PDF",
      typeBg: "bg-red-50 text-red-600 border-red-200",
      size: "12.4 MB",
      time: "Uploaded 2h ago",
      status: "Processed"
    },
    {
      name: "Research Paper - RAG Systems.docx",
      type: "DOCX",
      typeBg: "bg-blue-50 text-blue-600 border-blue-200",
      size: "1.8 MB",
      time: "Uploaded 5h ago",
      status: "Processed"
    },
    {
      name: "Attention Mechanism Explained.pdf",
      type: "PDF",
      typeBg: "bg-red-50 text-red-600 border-red-200",
      size: "3.2 MB",
      time: "Uploaded 1d ago",
      status: "Processed"
    },
    {
      name: "MongoDB Guide.pdf",
      type: "PDF",
      typeBg: "bg-red-50 text-red-600 border-red-200",
      size: "5.6 MB",
      time: "Uploaded 2d ago",
      status: "Processed"
    },
    {
      name: "Project Requirements.txt",
      type: "TXT",
      typeBg: "bg-slate-100 text-slate-600 border-slate-200",
      size: "0.6 KB",
      time: "Uploaded 2d ago",
      status: "Processed"
    }
  ];

  const topCollections = [
    { name: "AI & Machine Learning", count: "128 docs", icon: Brain, color: "text-purple-600 bg-purple-50" },
    { name: "System Design", count: "64 docs", icon: Layers, color: "text-indigo-600 bg-indigo-50" },
    { name: "Research Papers", count: "42 docs", icon: FileText, color: "text-emerald-600 bg-emerald-50" },
    { name: "Web Development", count: "28 docs", icon: Code, color: "text-blue-600 bg-blue-50" },
    { name: "Database Systems", count: "18 docs", icon: Database, color: "text-amber-600 bg-amber-50" },
  ];

  const recentActivity = [
    { type: "upload", title: "Document uploaded", detail: "Deep Learning Fundamentals.pdf", time: "2h ago", color: "bg-red-100 text-red-600" },
    { type: "chat", title: "Chat created", detail: "Quantum Computing Basics", time: "3h ago", color: "bg-indigo-100 text-indigo-600" },
    { type: "collection", title: "Collection updated", detail: "AI & Machine Learning", time: "5h ago", color: "bg-purple-100 text-purple-600" },
    { type: "process", title: "Document processed", detail: "Research Paper - RAG Systems.docx", time: "6h ago", color: "bg-emerald-100 text-emerald-600" },
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
            Your AI-powered knowledge workspace
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
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">248</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              +12 this week
            </span>
          </div>
        </div>

        {/* Stat 2: Collections */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Collections</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">36</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              +4 this week
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
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">128</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              +18 this week
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
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">7.2 GB</h3>
            <span className="text-[11px] font-semibold text-slate-400 block mt-1">
              72% of 10 GB
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
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentDocs.map((doc, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold border shrink-0 ${doc.typeBg}`}>
                      {doc.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {doc.type} • {doc.size} • {doc.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      {doc.status}
                    </span>
                    <button className="text-slate-400 hover:text-slate-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
              <span className="text-xs font-semibold text-slate-500">Total Embeddings</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h4 className="text-2xl font-bold text-slate-900">15,682</h4>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  <span>23.5%</span>
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
                {/* Gradient Area */}
                <path
                  d="M0,80 Q50,40 100,55 T200,25 T300,35 L300,100 L0,100 Z"
                  fill="url(#chartGradient)"
                />
                {/* Line Path */}
                <path
                  d="M0,80 Q50,40 100,55 T200,25 T300,35"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Glowing Nodes */}
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
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">45,231</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block">Embeddings</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">15,682</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block">Queries</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">2,845</span>
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
                  strokeDasharray="52, 100"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="3.8"
                  strokeDasharray="18, 100"
                  strokeDashoffset="-52"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-slate-900">248</span>
                <span className="text-[10px] text-slate-400 font-medium">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs text-slate-600 flex-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> PDF
                </span>
                <span className="font-bold text-slate-800">52%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> DOCX
                </span>
                <span className="font-bold text-slate-800">18%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> TXT
                </span>
                <span className="font-bold text-slate-800">12%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> MD
                </span>
                <span className="font-bold text-slate-800">8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" /> Others
                </span>
                <span className="font-bold text-slate-800">10%</span>
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
            {topCollections.map((col, idx) => {
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
              {recentActivity.map((act, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${act.color}`}>
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800">{act.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{act.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">{act.time}</span>
                </div>
              ))}
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
