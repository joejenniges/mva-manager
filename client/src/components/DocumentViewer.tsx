import { useState, useEffect, useRef } from "react";
import { getAuthHeaders, getStoredEventId } from "../api";
import Spinner from "./Spinner";

interface Props {
  documentId: string;
  mimeType: string;
  title?: string | null;
  fillHeight?: boolean;
}

// WHY: Fetches the file as a blob with auth headers instead of using bare
// iframe src= or img src=. Those can't send Authorization headers, so the
// server returns 401. Blob URL approach works with both Bearer tokens and
// the X-Dev-User header in dev mode.
export default function DocumentViewer({ documentId, mimeType, title, fillHeight }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/v1/documents/${documentId}/file`;

    const headers: Record<string, string> = { ...getAuthHeaders() };

    const eventId = getStoredEventId();
    if (eventId) headers["X-Event-Id"] = eventId;

    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch file");
        return res.blob();
      })
      .then((blob) => {
        if (!cancelled) {
          const objectUrl = URL.createObjectURL(blob);
          blobUrlRef.current = objectUrl;
          setBlobUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [documentId]);

  if (error) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center text-sm text-red-400">
        Failed to load document.
      </div>
    );
  }

  if (!blobUrl) {
    return <Spinner className="py-12" />;
  }

  if (mimeType === "application/pdf") {
    return (
      <div className={`overflow-hidden rounded-lg border border-gray-700 ${fillHeight ? "h-full" : ""}`}>
        <iframe
          src={blobUrl}
          title={title || "PDF Document"}
          className={`w-full bg-gray-800 ${fillHeight ? "h-full" : "h-[600px]"}`}
        />
      </div>
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <div className={`overflow-hidden rounded-lg border border-gray-700 ${fillHeight ? "h-full" : ""}`}>
        <img
          src={blobUrl}
          alt={title || "Document"}
          className={`w-full object-contain bg-gray-800 ${fillHeight ? "h-full" : "max-h-[600px]"}`}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center text-sm text-gray-400">
      Preview not available for {mimeType}.{" "}
      <a href={blobUrl} download={title || "document"} className="text-blue-400 hover:underline">Download</a>
    </div>
  );
}
