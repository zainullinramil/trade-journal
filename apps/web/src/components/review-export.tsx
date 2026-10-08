"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportPdf, exportPng, type ReviewDocument } from "@/lib/export-review";
import { usePrivacy } from "./privacy";
interface Preview {
  url: string;
  filename: string;
  type: string;
}
export function ReviewExport({
  document,
  containsFinancialData = false,
}: {
  document: ReviewDocument;
  containsFinancialData?: boolean;
}) {
  const t = useTranslations("export");
  const privateMode = usePrivacy();
  const concealed = privateMode && containsFinancialData;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [files, setFiles] = useState<Preview[]>([]),
    [open, setOpen] = useState(false);
  const urls = useRef<string[]>([]);
  const [previewDocument, setPreviewDocument] = useState<ReviewDocument | null>(null);
  useEffect(
    () => () => {
      urls.current.forEach(URL.revokeObjectURL);
    },
    [],
  );
  async function run(image: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await (image ? exportPng : exportPdf)(document);
      urls.current.forEach(URL.revokeObjectURL);
      const next = result.map((f) => ({
        url: URL.createObjectURL(f.blob),
        filename: f.filename,
        type: f.blob.type,
      }));
      urls.current = next.map((f) => f.url);
      setFiles(next);
      setPreviewDocument(document);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || concealed}
          onClick={() => void run(false)}
        >
          <Download />
          {t("pdf")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || concealed}
          onClick={() => void run(true)}
        >
          <ImageIcon />
          {t("png")}
        </Button>
      </div>
      {concealed && <p className="text-xs text-muted-foreground">{t("privacyBlocked")}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Dialog open={open && !concealed} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("reviewTitle")}</DialogTitle>
          </DialogHeader>
          {files.map((f, i) => {
            const format = f.type === "application/pdf" ? "PDF" : "PNG";
            const downloadLabel =
              files.length > 1
                ? t("downloadPage", { format, current: i + 1, total: files.length })
                : format === "PDF"
                  ? t("downloadPdf")
                  : t("downloadPng");
            return (
              <div key={f.url} className="space-y-3">
                <Button asChild size="sm">
                  <a href={f.url} download={f.filename}>
                    {downloadLabel}
                  </a>
                </Button>
                {f.type === "application/pdf" ? (
                  <div className="rounded border bg-white p-6 text-slate-800">
                    <p className="mb-4 text-xs text-slate-500">{t("pdfPreviewHint")}</p>
                    <h3 className="mb-2 text-xl font-semibold">{previewDocument?.title}</h3>
                    <p className="mb-6 text-xs text-slate-500">{previewDocument?.subtitle}</p>
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {previewDocument?.lines.join("\n")}
                    </div>
                  </div>
                ) : (
                  <img src={f.url} alt={t("imageAlt")} className="w-full rounded border" />
                )}
              </div>
            );
          })}
        </DialogContent>
      </Dialog>
    </div>
  );
}
