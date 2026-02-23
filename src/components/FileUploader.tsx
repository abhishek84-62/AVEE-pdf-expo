import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatBytes } from '../lib/utils';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  accept,
  multiple = true,
  maxFiles,
  className
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative group cursor-pointer transition-all duration-500",
        "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4",
        isDragActive 
          ? "border-accent-primary bg-accent-primary/5 scale-[1.02]" 
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="relative">
        <div className="absolute inset-0 bg-accent-primary/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-500">
          <Upload className="w-10 h-10 text-white" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-display font-semibold mb-2">
          {isDragActive ? "Drop your files here" : "Upload your documents"}
        </h3>
        <p className="text-crystal-400 max-w-xs mx-auto">
          Drag and drop your files here, or click to browse from your computer
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-crystal-400">PDF</span>
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-crystal-400">DOCX</span>
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-crystal-400">PPTX</span>
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-crystal-400">Images</span>
      </div>
    </div>
  );
};
