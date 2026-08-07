"use client";

import React from "react";
import FileCard from "@/components/FileCard";
import { UserFile } from "@/services/fileService";

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
      <div className="p-12 text-center text-zinc-500 space-y-2 bg-zinc-900/20 border border-zinc-800/50 rounded-xl">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm">Loading documents...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-xl">
        <svg
          className="w-12 h-12 mx-auto text-zinc-600 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-base font-medium text-zinc-300">No documents uploaded yet</p>
        <p className="text-xs text-zinc-500 mt-1">Upload a PDF, DOCX, PPTX, or Image file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          Your Uploaded Documents
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono">
            {files.length}
          </span>
        </h2>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
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
