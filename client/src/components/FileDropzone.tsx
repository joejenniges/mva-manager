import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

export interface FileDropzoneHandle {
  open: () => void;
}

interface Props {
  onFileSelect: (file: File) => void;
  accept?: string;
}

const FileDropzone = forwardRef<FileDropzoneHandle, Props>(function FileDropzone({ onFileSelect, accept = ".pdf,.jpg,.jpeg,.png,.webp" }, ref) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => inputRef.current?.click(),
  }));

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }}
        className="hidden"
      />
      <div className="text-sm text-gray-400">
        {dragging ? "Drop file here" : "Drag & drop a file or click to browse"}
      </div>
      <div className="mt-1 text-xs text-gray-600">PDF, JPEG, PNG, WebP (max 50MB)</div>
    </div>
  );
});

export default FileDropzone;
