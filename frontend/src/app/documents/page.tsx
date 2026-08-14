"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import fileService, { UserFile } from "@/services/fileService";
import FileCard from "@/components/FileCard";

export default function DocumentsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [documents, setDocuments] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const files = await fileService.getUserFiles();
      setDocuments(files);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) fetchDocuments();
  }, [mounted, isAuthenticated, fetchDocuments]);

  const handleDelete = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      setDocuments((prev) => prev.filter((d) => (d.id || d._id) !== fileId));
    } catch {
      alert("Failed to delete document.");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      {/* Header */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-md sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              OmniVerse
            </Link>

            <nav className="hidden sm:flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition">
                Dashboard
              </Link>
              <Link href="/documents" className="text-indigo-400 font-semibold border-b-2 border-indigo-500 pb-0.5">
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
            <span className="text-sm text-zinc-400 hidden md:inline">
              <span className="text-zinc-200 font-medium">{user?.full_name || user?.email}</span>
            </span>

            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-lg text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">
              My Document Dashboard
            </h1>
            <p className="mt-1 text-zinc-400 text-sm">
              Manage uploaded PDFs, inspect word/page stats, download original files, rename, or delete.
            </p>
          </div>

          <Link
            href="/upload"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 font-medium text-white shadow-lg shadow-indigo-600/20 transition shrink-0 inline-flex items-center justify-center gap-2 text-sm"
          >
            <span>+ Upload Document</span>
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-400 shadow">
            <div className="h-8 w-8 mx-auto mb-3 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            Loading documents...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-12 text-center shadow backdrop-blur space-y-4">
            <div className="text-6xl">📄</div>
            <h2 className="text-xl font-bold text-white">No documents found</h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Upload a document to start using OmniVerse RAG.
            </p>
            <div>
              <Link
                href="/upload"
                className="mt-2 inline-block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition"
              >
                Upload Your First Document
              </Link>
            </div>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <FileCard
                key={doc.id || doc._id}
                file={doc}
                onDelete={handleDelete}
                onRenameSuccess={fetchDocuments}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

