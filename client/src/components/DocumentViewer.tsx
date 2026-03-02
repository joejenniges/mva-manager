import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { getAuthHeaders, getStoredEventId } from "../api";
import Spinner from "./Spinner";

// WHY: Static asset in public/ rather than importing from node_modules.
// Vite can't bundle the worker as a module worker in all browsers, and
// importing it triggers CSP/blob issues. Copying to public/ and referencing
// by path is the reliable approach for pdfjs-dist with Vite.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Props {
  documentId: string;
  mimeType: string;
  title?: string | null;
  fillHeight?: boolean;
}

// WHY: Fetches the file with auth headers. Bare iframe src= or img src=
// can't send Authorization headers, so the server returns 401. For images
// we still use blob URLs (work fine cross-browser). For PDFs we pass the
// ArrayBuffer directly to pdf.js which renders to canvas — this replaces
// the iframe approach that fails on iOS Safari (no built-in PDF viewer for
// blob URLs in iframes).
export default function DocumentViewer({ documentId, mimeType, title, fillHeight }: Props) {
  const isPdf = mimeType === "application/pdf";

  // Shared state
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Image/download: blob URL
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // PDF: rendered pages
  const [pdfPages, setPdfPages] = useState<HTMLCanvasElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const fetchDocument = useCallback(async (signal: AbortSignal) => {
    const url = `/api/v1/documents/${documentId}/file`;
    const headers: Record<string, string> = { ...getAuthHeaders() };
    const eventId = getStoredEventId();
    if (eventId) headers["X-Event-Id"] = eventId;

    const res = await fetch(url, { headers, signal });
    if (!res.ok) throw new Error("Failed to fetch file");
    return res;
  }, [documentId]);

  // PDF rendering effect
  useEffect(() => {
    if (!isPdf) return;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchDocument(controller.signal);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        pdfDocRef.current = pdf;

        // Render all pages to canvases
        const containerWidth = containerRef.current?.clientWidth || 800;
        const canvases: HTMLCanvasElement[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;

          // Scale to fit container width
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";

          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;

          canvases.push(canvas);
        }

        setPdfPages(canvases);
        setLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [isPdf, fetchDocument]);

  // Image/download blob fetch effect
  useEffect(() => {
    if (isPdf) return;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchDocument(controller.signal);
        const blob = await res.blob();
        if (cancelled) return;

        const objectUrl = URL.createObjectURL(blob);
        blobUrlRef.current = objectUrl;
        setBlobUrl(objectUrl);
        setLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isPdf, fetchDocument]);

  if (error) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center text-sm text-red-400">
        Failed to load document.
      </div>
    );
  }

  if (loading) {
    return <Spinner className="py-12" />;
  }

  // WHY: Canvas rendering instead of iframe for PDFs. iOS Safari can't render
  // PDFs in iframes with blob URLs — it shows a blank page. pdf.js renders
  // each page to a <canvas>, which works on all browsers/devices.
  if (isPdf) {
    return (
      <div
        ref={containerRef}
        className={`overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 ${fillHeight ? "h-full" : "max-h-[600px]"}`}
      >
        {pdfPages.map((canvas, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el && !el.firstChild) el.appendChild(canvas);
            }}
          />
        ))}
      </div>
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <div className={`overflow-hidden rounded-lg border border-gray-700 ${fillHeight ? "h-full" : ""}`}>
        <img
          src={blobUrl!}
          alt={title || "Document"}
          className={`w-full object-contain bg-gray-800 ${fillHeight ? "h-full" : "max-h-[600px]"}`}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center text-sm text-gray-400">
      Preview not available for {mimeType}.{" "}
      <a href={blobUrl!} download={title || "document"} className="text-blue-400 hover:underline">Download</a>
    </div>
  );
}
