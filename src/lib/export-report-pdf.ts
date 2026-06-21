"use client";

type Html2PdfOptions = {
  margin?: number | number[];
  filename?: string;
  image?: { type?: string; quality?: number };
  html2canvas?: Record<string, unknown>;
  jsPDF?: { unit?: string; format?: string | number[]; orientation?: string };
  pagebreak?: { mode?: string | string[]; before?: string; after?: string; avoid?: string };
};

type Html2PdfWorker = {
  set: (opt: Html2PdfOptions) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  save: () => Promise<void>;
  outputPdf: (type: "blob") => Promise<Blob>;
};

type Html2PdfFn = () => Html2PdfWorker;

/** Largura útil A4 retrato (~210mm) em px a 96dpi, menos margens. */
export const PDF_CAPTURE_WIDTH_PX = 720;

/** Remove classes/styles de captura PDF que possam ter ficado presas na UI. */
export function clearReportPdfCaptureState() {
  document.querySelectorAll(".report-pdf-capture").forEach((node) => {
    const el = node as HTMLElement;
    el.classList.remove("report-pdf-capture");
    el.style.width = "";
    el.style.maxWidth = "";
    el.style.minWidth = "";
  });

  document.querySelectorAll(".report-pdf-capture-parent").forEach((node) => {
    const el = node as HTMLElement;
    el.classList.remove("report-pdf-capture-parent");
    el.style.width = "";
    el.style.maxWidth = "";
    el.style.minWidth = "";
  });

  window.dispatchEvent(new Event("resize"));
}

function fixCloneForPdf(clonedDoc: Document) {
  const root = clonedDoc.getElementById("report-preview-root");
  if (!root) return;

  let node: HTMLElement | null = root;
  while (node && node !== clonedDoc.body) {
    node.style.width = `${PDF_CAPTURE_WIDTH_PX}px`;
    node.style.maxWidth = `${PDF_CAPTURE_WIDTH_PX}px`;
    node.style.minWidth = `${PDF_CAPTURE_WIDTH_PX}px`;
    node.style.boxSizing = "border-box";
    node.style.marginLeft = "0";
    node.style.marginRight = "0";
    node = node.parentElement;
  }

  root.style.padding = "0";
  root.style.overflow = "visible";
  root.style.background = "#ffffff";

  clonedDoc.querySelectorAll(".report-pdf-grid-3").forEach((el) => {
    const grid = el as HTMLElement;
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    grid.style.gap = "12px";
    grid.style.width = "100%";
  });

  clonedDoc.querySelectorAll(".report-pdf-grid-2").forEach((el) => {
    const grid = el as HTMLElement;
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    grid.style.gap = "12px";
    grid.style.width = "100%";
  });

  clonedDoc.querySelectorAll(".report-pdf-solo").forEach((el) => {
    const card = el as HTMLElement;
    card.style.gridColumn = "1 / -1";
    card.style.maxWidth = "520px";
    card.style.marginLeft = "auto";
    card.style.marginRight = "auto";
    card.style.width = "100%";
  });

  clonedDoc.querySelectorAll(".report-pdf-grid-2, .report-pdf-grid-3").forEach((gridEl) => {
    const children = Array.from(gridEl.children) as HTMLElement[];
    if (children.length === 1) {
      const child = children[0];
      child.style.gridColumn = "1 / -1";
      child.style.maxWidth = "520px";
      child.style.marginLeft = "auto";
      child.style.marginRight = "auto";
      child.style.width = "100%";
    }
  });

  clonedDoc.querySelectorAll(".report-chart-wrap").forEach((wrap) => {
    const el = wrap as HTMLElement;
    const w = Math.max(el.offsetWidth || el.parentElement?.clientWidth || 300, 280);
    const h = el.offsetHeight || 224;
    el.style.width = "100%";
    el.style.maxWidth = "100%";
    el.style.height = `${h}px`;
    el.style.marginLeft = "auto";
    el.style.marginRight = "auto";

    el.querySelectorAll(".recharts-wrapper").forEach((rw) => {
      const wrapper = rw as HTMLElement;
      wrapper.style.width = `${w}px`;
      wrapper.style.height = `${h}px`;
      wrapper.style.maxWidth = "100%";
      wrapper.style.marginLeft = "auto";
      wrapper.style.marginRight = "auto";
      wrapper.style.overflow = "hidden";
    });

    el.querySelectorAll("svg.recharts-surface").forEach((svg) => {
      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      svg.setAttribute("overflow", "hidden");
    });
  });

  clonedDoc.querySelectorAll("[data-report-creatives-grid], .report-creatives-grid").forEach((node) => {
    const el = node as HTMLElement;
    el.style.display = "grid";
    el.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    el.style.gap = "12px";
    el.style.width = "100%";
  });

  clonedDoc.querySelectorAll(".report-creative-card img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.style.objectFit = "contain";
    el.style.objectPosition = "center";
    el.style.maxWidth = "100%";
    el.style.maxHeight = "100%";
    el.style.width = "auto";
    el.style.height = "auto";
    el.style.position = "relative";
    el.style.inset = "";
  });

  clonedDoc.querySelectorAll(".skeleton-shimmer").forEach((node) => {
    (node as HTMLElement).style.display = "none";
  });
}

function waitForImages(el: HTMLElement): Promise<void> {
  const images = Array.from(el.querySelectorAll("img"));
  if (!images.length) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  ).then(() => undefined);
}

async function waitForReportReady(el: HTMLElement, timeoutMs = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const loadingCreatives = el.querySelector('[data-report-creatives-loading="true"]');
    const skeletons = el.querySelectorAll(".skeleton-shimmer");
    const emptyCharts = el.querySelectorAll(".recharts-wrapper");
    const chartsReady =
      emptyCharts.length === 0 ||
      Array.from(emptyCharts).every((c) => {
        const w = (c as HTMLElement).offsetWidth;
        return w > 40;
      });

    if (!loadingCreatives && skeletons.length === 0 && chartsReady) {
      return true;
    }
    window.dispatchEvent(new Event("resize"));
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function prepareElementForPdf(element: HTMLElement) {
  clearReportPdfCaptureState();
  window.dispatchEvent(new Event("resize"));
  await waitForReportReady(element);
  await waitForImages(element);
  window.dispatchEvent(new Event("resize"));
  await new Promise((r) => setTimeout(r, 400));
}

function buildPdfOptions(filename?: string): Html2PdfOptions {
  return {
    margin: [8, 8, 8, 8],
    ...(filename ? { filename } : {}),
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: PDF_CAPTURE_WIDTH_PX,
      windowWidth: PDF_CAPTURE_WIDTH_PX,
      onclone: (clonedDoc: Document) => fixCloneForPdf(clonedDoc)
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: ".report-pdf-section, .report-pdf-chart-card, .report-pdf-block"
    }
  };
}

export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const mod = await import("html2pdf.js");
  const html2pdf = (mod.default ?? mod) as Html2PdfFn;

  await prepareElementForPdf(element);
  try {
    await html2pdf().set(buildPdfOptions(filename)).from(element).save();
  } finally {
    clearReportPdfCaptureState();
  }
}

export async function exportElementToPdfBlob(element: HTMLElement): Promise<Blob> {
  const mod = await import("html2pdf.js");
  const html2pdf = (mod.default ?? mod) as Html2PdfFn;

  await prepareElementForPdf(element);
  try {
    return await html2pdf().set(buildPdfOptions()).from(element).outputPdf("blob");
  } finally {
    clearReportPdfCaptureState();
  }
}
