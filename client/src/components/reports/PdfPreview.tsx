import { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import Spinner from "../Spinner";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Props {
  pdfData: Uint8Array | ArrayBuffer | null;
}

export default function PdfPreview({ pdfData }: Props) {
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const downloadUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pdfData) {
      setPages([]);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        // Clean up previous
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }
        if (downloadUrlRef.current) {
          URL.revokeObjectURL(downloadUrlRef.current);
          downloadUrlRef.current = null;
        }

        // Create download URL
        const blob = new Blob([pdfData instanceof ArrayBuffer ? pdfData : new Uint8Array(pdfData).buffer as ArrayBuffer], { type: "application/pdf" });
        const dlUrl = URL.createObjectURL(blob);
        downloadUrlRef.current = dlUrl;
        setDownloadUrl(dlUrl);

        // Make a copy of the data since pdfjs consumes it
        const dataCopy = pdfData instanceof ArrayBuffer ? pdfData.slice(0) : new Uint8Array(pdfData).buffer;
        const pdf = await pdfjsLib.getDocument({ data: dataCopy }).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        pdfDocRef.current = pdf;

        const containerWidth = containerRef.current?.clientWidth || 800;
        const canvases: HTMLCanvasElement[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;

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

        setPages(canvases);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
        downloadUrlRef.current = null;
      }
    };
  }, [pdfData]);

  if (!pdfData) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-sm text-gray-500">
        Generate a report to see the preview.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center text-sm text-red-400">
        Failed to render PDF preview.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {downloadUrl && (
        <a
          href={downloadUrl}
          download="appointment-report.pdf"
          className="absolute right-2 top-2 z-10 rounded-md bg-gray-900/80 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
          title="Download PDF"
        >
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </span>
        </a>
      )}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800"
      >
        {loading ? (
          <Spinner className="py-12" />
        ) : (
          pages.map((canvas, i) => (
            <div
              key={i}
              ref={(el) => {
                if (el && !el.firstChild) el.appendChild(canvas);
              }}
              className={i > 0 ? "border-t border-gray-600" : ""}
            />
          ))
        )}
      </div>
    </div>
  );
}
