import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X, CheckCircle2 } from "lucide-react";

interface ObjectUploaderProps {
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onUpload: (file: File) => Promise<void>;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  children: ReactNode;
}

export function ObjectUploader({
  maxFileSize = 10485760,
  allowedFileTypes,
  onUpload,
  buttonClassName,
  buttonVariant = "outline",
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (maxFileSize && file.size > maxFileSize) {
      setError(`File too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    if (allowedFileTypes && !allowedFileTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setUploadComplete(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(30);

      await onUpload(selectedFile);

      setUploadProgress(100);
      setUploadComplete(true);
      
      setTimeout(() => {
        setShowModal(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadComplete(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button 
        type="button"
        onClick={() => {
          resetModal();
          setShowModal(true);
        }} 
        className={buttonClassName}
        variant={buttonVariant}
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) resetModal();
        setShowModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Select a file to upload. {maxFileSize && `Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors hover:border-primary/50">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept={allowedFileTypes?.join(',')}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-10 h-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to select a file
                </span>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(selectedFile.size / 1024)}KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-muted-foreground text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {uploadComplete && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Upload complete!</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading || uploadComplete}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
