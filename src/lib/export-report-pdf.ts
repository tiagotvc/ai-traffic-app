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

const PDF_LIGHT_THEME: Record<string, string> = {
  "--surface-bg": "#f8fafc",
  "--surface-card": "#ffffff",
  "--surface-card-alt": "#ffffff",
  "--surface-thead": "#f1f5f9",
  "--border-color": "rgba(15, 23, 42, 0.1)",
  "--text-main": "#0f172a",
  "--text-dim": "#475569",
  "--text-dimmer": "#64748b",
  "--amber": "#f5a623",
  "--amber-bright": "#f5a623",
  "--violet": "#7c3aed",
  "--success": "#059669",
  "--danger": "#dc2626"
};

function applyLightPdfTheme(el: HTMLElement) {
  for (const [key, value] of Object.entries(PDF_LIGHT_THEME)) {
    el.style.setProperty(key, value);
  }
  el.style.background = "#ffffff";
  el.style.color = "#0f172a";
}

/** Aplica largura fixa de captura no preview e nos pais imediatos. */
function applyPdfCaptureLayout(root: HTMLElement) {
  root.classList.add("report-pdf-capture");
  applyLightPdfTheme(root);
  root.style.width = `${PDF_CAPTURE_WIDTH_PX}px`;
  root.style.maxWidth = `${PDF_CAPTURE_WIDTH_PX}px`;
  root.style.minWidth = `${PDF_CAPTURE_WIDTH_PX}px`;
  root.style.boxSizing = "border-box";
  root.style.marginLeft = "0";
  root.style.marginRight = "auto";

  let parent = root.parentElement;
  while (parent && parent !== document.body) {
    parent.classList.add("report-pdf-capture-parent");
    parent.style.width = `${PDF_CAPTURE_WIDTH_PX + 40}px`;
    parent.style.maxWidth = `${PDF_CAPTURE_WIDTH_PX + 40}px`;
    parent.style.minWidth = "0";
    parent.style.overflow = "visible";
    parent.style.boxSizing = "border-box";
    parent = parent.parentElement;
  }
}

/** Remove classes/styles de captura PDF que possam ter ficado presas na UI. */
export function clearReportPdfCaptureState() {
  document.querySelectorAll(".report-pdf-capture").forEach((node) => {
    const el = node as HTMLElement;
    el.classList.remove("report-pdf-capture");
    el.style.width = "";
    el.style.maxWidth = "";
    el.style.minWidth = "";
    el.style.marginLeft = "";
    el.style.marginRight = "";
    el.style.background = "";
    el.style.color = "";
    for (const key of Object.keys(PDF_LIGHT_THEME)) {
      el.style.removeProperty(key);
    }
  });

  document.querySelectorAll(".report-pdf-capture-parent").forEach((node) => {
    const el = node as HTMLElement;
    el.classList.remove("report-pdf-capture-parent");
    el.style.width = "";
    el.style.maxWidth = "";
    el.style.minWidth = "";
    el.style.overflow = "";
  });

  window.dispatchEvent(new Event("resize"));
}

function chartWidthForWrap(wrap: HTMLElement, innerWidth: number): number {
  const solo = wrap.closest(".report-pdf-solo");
  if (solo) return Math.min(innerWidth - 32, 680);

  const twoCol = wrap.closest(".report-pdf-grid-2");
  if (twoCol) return Math.floor((innerWidth - 12) / 2) - 24;

  const spendPie = wrap.closest(".report-pdf-spend-pie");
  if (spendPie) return 248;

  return Math.max(wrap.parentElement?.clientWidth || 300, 280);
}

function fixChartsInDoc(doc: Document | HTMLElement, innerWidth = PDF_CAPTURE_WIDTH_PX) {
  const root = doc instanceof HTMLElement ? doc : doc.getElementById("report-preview-root");
  if (!root) return;

  root.querySelectorAll(".report-chart-wrap").forEach((wrap) => {
    const el = wrap as HTMLElement;
    const h = Number.parseInt(el.style.height || "", 10) || el.offsetHeight || el.clientHeight || 224;
    const w = chartWidthForWrap(el, innerWidth);

    el.style.width = "100%";
    el.style.maxWidth = "100%";
    el.style.height = `${h}px`;
    el.style.minHeight = `${h}px`;
    el.style.overflow = "hidden";

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
}

function fixCloneForPdf(clonedDoc: Document) {
  const root = clonedDoc.getElementById("report-preview-root");
  if (!root) return;

  root.classList.add("report-pdf-capture");
  applyLightPdfTheme(root);

  let node: HTMLElement | null = root;
  while (node && node !== clonedDoc.body) {
    node.style.width = `${PDF_CAPTURE_WIDTH_PX}px`;
    node.style.maxWidth = `${PDF_CAPTURE_WIDTH_PX}px`;
    node.style.minWidth = `${PDF_CAPTURE_WIDTH_PX}px`;
    node.style.boxSizing = "border-box";
    node.style.marginLeft = "0";
    node.style.marginRight = "0";
    node.style.overflow = "visible";
    node = node.parentElement;
  }

  clonedDoc.body.style.background = "#ffffff";
  clonedDoc.body.style.margin = "0";
  clonedDoc.body.style.padding = "0";

  root.style.padding = "4px 0";
  root.style.overflow = "visible";
  root.style.background = "#ffffff";

  clonedDoc.querySelectorAll(".ui-card").forEach((card) => {
    const el = card as HTMLElement;
    el.style.background = "#ffffff";
    el.style.borderColor = "rgba(15, 23, 42, 0.1)";
    el.style.boxShadow = "none";
    el.style.overflow = "visible";
  });

  clonedDoc.querySelectorAll(".report-pdf-grid-3").forEach((el) => {
    const grid = el as HTMLElement;
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    grid.style.gap = "10px";
    grid.style.width = "100%";
  });

  clonedDoc.querySelectorAll(".report-pdf-grid-2").forEach((el) => {
    const grid = el as HTMLElement;
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    grid.style.gap = "10px";
    grid.style.width = "100%";
  });

  clonedDoc.querySelectorAll(".report-pdf-spend-layout").forEach((el) => {
    const grid = el as HTMLElement;
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr";
    grid.style.gap = "20px";
    grid.style.alignItems = "start";
    grid.style.width = "100%";
  });

  clonedDoc.querySelectorAll(".report-pdf-solo").forEach((el) => {
    const card = el as HTMLElement;
    card.style.gridColumn = "1 / -1";
    card.style.maxWidth = "100%";
    card.style.width = "100%";
    card.style.marginLeft = "0";
    card.style.marginRight = "0";
  });

  clonedDoc.querySelectorAll(".report-pdf-grid-2, .report-pdf-grid-3").forEach((gridEl) => {
    const children = Array.from(gridEl.children) as HTMLElement[];
    if (children.length === 1 && !children[0]?.classList.contains("report-pdf-solo")) {
      const child = children[0];
      child.style.gridColumn = "1 / -1";
      child.style.maxWidth = "100%";
      child.style.width = "100%";
    }
  });

  clonedDoc.querySelectorAll(".report-pdf-spend-pie").forEach((el) => {
    const pie = el as HTMLElement;
    pie.style.maxWidth = "248px";
    pie.style.width = "100%";
    pie.style.margin = "0 auto";
  });

  clonedDoc.querySelectorAll(".report-pdf-spend-layout table").forEach((table) => {
    const el = table as HTMLElement;
    el.style.width = "100%";
    el.style.tableLayout = "fixed";
    el.style.fontSize = "10px";
  });

  clonedDoc.querySelectorAll("[data-report-creatives-grid], .report-creatives-grid").forEach((node) => {
    const el = node as HTMLElement;
    const cardCount = el.querySelectorAll(".report-creative-card").length;
    const cols = cardCount <= 1 ? 1 : cardCount === 2 ? 2 : 3;
    el.style.display = "grid";
    el.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    el.style.gap = "10px";
    el.style.width = "100%";
    el.style.padding = "8px";
    if (cardCount === 1) {
      el.style.justifyItems = "center";
    }
  });

  clonedDoc.querySelectorAll(".report-creative-media").forEach((media) => {
    const el = media as HTMLElement;
    el.style.minHeight = "180px";
    el.style.maxHeight = "220px";
    el.style.aspectRatio = "4 / 5";
  });

  clonedDoc.querySelectorAll(".report-creative-card img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.style.objectFit = "contain";
    el.style.objectPosition = "center";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.maxWidth = "100%";
    el.style.maxHeight = "100%";
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.margin = "auto";
  });

  clonedDoc.querySelectorAll(".skeleton-shimmer").forEach((node) => {
    (node as HTMLElement).style.display = "none";
  });

  fixChartsInDoc(root, PDF_CAPTURE_WIDTH_PX);
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
  applyPdfCaptureLayout(element);
  window.dispatchEvent(new Event("resize"));
  await waitForReportReady(element);
  await waitForImages(element);
  fixChartsInDoc(element, PDF_CAPTURE_WIDTH_PX);
  window.dispatchEvent(new Event("resize"));
  await new Promise((r) => setTimeout(r, 500));
}

function buildPdfOptions(filename?: string): Html2PdfOptions {
  return {
    margin: [10, 10, 10, 10],
    ...(filename ? { filename } : {}),
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      width: PDF_CAPTURE_WIDTH_PX,
      windowWidth: PDF_CAPTURE_WIDTH_PX,
      onclone: (clonedDoc: Document) => fixCloneForPdf(clonedDoc)
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: ".report-pdf-chart-card, .report-pdf-block, .report-pdf-kpi, .report-creative-card"
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
