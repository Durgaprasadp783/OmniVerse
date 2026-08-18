"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import UploadBox from "@/components/UploadBox";
import FileList from "@/components/FileList";
import fileService, { UserFile } from "@/services/fileService";
import { Upload, FileText, CheckCircle2 } from "lucide-react";

export default function UploadPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [fetchingFiles, setFetchingFiles] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  const loadFiles = useCallback(async () => {
    try {
      setFetchingFiles(true);
      const data = await fileService.getUserFiles();
      setFiles(data);
    } catch {
      // ignore fetch errors on unauthenticated or failed request
    } finally {
      setFetchingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadFiles();
    }
  }, [mounted, isAuthenticated, loadFiles]);

  const handleUploadSuccess = (newFile: UserFile) => {
    setFiles((prev) => [newFile, ...prev]);
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      alert("Failed to delete file. Please try again.");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-white text-slate-900 p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-10 w-10 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-8 bg-transparent text-slate-900">
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Upload className="h-7 w-7 text-purple-600" />
            <span>Document Upload Hub</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Upload PDFs, DOCX, PPTX, PNG, or JPEG documents to index into your RAG knowledge base.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-purple-600" />
          <span>Automatic Vector Chunking</span>
        </div>
      </div>

      {/* Upload Box Section */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <UploadBox onUploadSuccess={handleUploadSuccess} />
      </section>

      {/* Uploaded Documents List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <FileList
          files={files}
          loading={fetchingFiles}
          onDeleteFile={handleDeleteFile}
          onRefresh={loadFiles}
        />
      </div>
    </div>
  );
}
