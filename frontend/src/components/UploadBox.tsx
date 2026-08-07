"use client";

import React, { useState, useRef } from "react";
import fileService, { UserFile } from "@/services/fileService";

interface UploadBoxProps {
  onUploadSuccess?: (newFile: UserFile) => void;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
];

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export default function UploadBox({ onUploadSuccess }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Unsupported File Type. Please upload PDF, DOCX, PPTX, PNG, or JPEG.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "File size exceeds maximum limit of 20MB.";
    }
    return null;
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFileName(file.name);
    try {
      setUploading(true);
      const newFile = await fileService.uploadFile(file);
      setSelectedFileName(null);
      if (onUploadSuccess) {
        onUploadSuccess(newFile);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to upload document. Please try again.";
      setError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragging
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
            : "border-zinc-700 bg-zinc-900/60 hover:border-indigo-500/50 hover:bg-zinc-900/90"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-semibold text-zinc-100">
              {uploading
                ? `Uploading ${selectedFileName}...`
                : "Drop your document here, or browse"}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Supports PDF, DOCX, PPTX, PNG, JPEG (Up to 20MB)
            </p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs space-y-2">
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 animate-pulse w-full rounded-full" />
              </div>
              <p className="text-xs text-indigo-400">Processing file upload...</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
