import { useState, useCallback } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  label: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  onFileChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  multiple = false,
  maxFiles = multiple ? 10 : 1,
  maxSize = 10,
  label,
  description,
  className
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>("");

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File ${file.name} is too large. Maximum size is ${maxSize}MB.`;
    }
    
    const acceptedTypes = accept.split(",").map(type => type.trim());
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    
    if (!acceptedTypes.includes(fileExtension)) {
      return `File ${file.name} has an unsupported format.`;
    }
    
    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    setError("");
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        return;
      }
      validFiles.push(file);
    }
    
    if (files.length + validFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} file(s) allowed.`);
      return;
    }
    
    const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
    setFiles(updatedFiles);
    onFileChange(updatedFiles);
  }, [files, multiple, maxFiles, onFileChange]);

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFileChange(updatedFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary",
          error ? "border-destructive" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${label}`)?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
        <Button type="button" variant="link" className="mt-2">
          Choose File{multiple ? 's' : ''}
        </Button>
        <input
          id={`file-input-${label}`}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
        />
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Card key={index} className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
