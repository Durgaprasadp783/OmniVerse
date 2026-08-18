"use client";

import React from "react";
import FileCard from "@/components/FileCard";
import { UserFile } from "@/services/fileService";
import { RefreshCw, FileQuestion } from "lucide-react";

interface FileListProps {
  files: UserFile[];
  loading?: boolean;
  onDeleteFile?: (fileId: string) => void;
  onRefresh?: () => void;
}

export default function FileList({
  files,
  loading = false,
  onDeleteFile,
  onRefresh,
}: FileListProps) {
  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
        <div className="h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold">Loading indexed documents...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-slate-50 border border-slate-200/80 rounded-2xl">
        <FileQuestion className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <p className="text-base font-bold text-slate-800">No documents uploaded yet</p>
        <p className="text-xs text-slate-500 mt-1">Upload a PDF, DOCX, PPTX, or Image file to start asking questions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>Your Uploaded Documents</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
            {files.length}
          </span>
        </h2>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs font-semibold text-slate-500 hover:text-purple-600 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {files.map((file) => (
          <FileCard key={file.id || file._id} file={file} onDelete={onDeleteFile} />
        ))}
      </div>
    </div>
  );
}
