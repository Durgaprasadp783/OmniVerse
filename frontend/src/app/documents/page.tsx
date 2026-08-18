"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import fileService, { UserFile } from "@/services/fileService";
import FileCard from "@/components/FileCard";
import { FolderKanban, Upload, FileText } from "lucide-react";

export default function DocumentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [documents, setDocuments] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await fileService.getUserFiles();
      setDocuments(docs);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadDocuments();
    }
  }, [mounted, isAuthenticated]);

  const handleDelete = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      setDocuments((prev) => prev.filter((d) => d.id !== fileId));
    } catch {
      alert("Failed to delete file.");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-white text-slate-900 p-4">
        <div className="h-10 w-10 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6 bg-transparent text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="h-7 w-7 text-purple-600" />
            <span>Document Library</span>
          </h1>
          <p className="mt-1 text-slate-500 text-xs sm:text-sm font-medium">
            Manage your indexed PDFs, inspect stats, download original files, rename, or query with RAG.
          </p>
        </div>

        <Link
          href="/upload"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-bold text-white shadow-sm shadow-purple-600/20 transition shrink-0 inline-flex items-center justify-center gap-2 text-xs"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <div className="h-8 w-8 mx-auto mb-3 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
          <p className="text-xs font-semibold">Loading documents...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {!loading && !error && documents.length === 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-sm space-y-4">
          <div className="text-5xl">📄</div>
          <h2 className="text-lg font-bold text-slate-900">No documents found</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
            Upload your first document to start querying with OmniVerse RAG.
          </p>
          <div>
            <Link
              href="/upload"
              className="mt-2 inline-block rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-purple-600/20 transition"
            >
              Upload Your First Document
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <FileCard
              key={doc.id || doc._id}
              file={doc}
              onDelete={handleDelete}
              onRenameSuccess={loadDocuments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
