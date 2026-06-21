declare module "html2pdf.js" {
  const html2pdf: () => {
    set: (opt: Record<string, unknown>) => ReturnType<typeof html2pdf>;
    from: (element: HTMLElement) => ReturnType<typeof html2pdf>;
    save: () => Promise<void>;
    outputPdf: (type: "blob") => Promise<Blob>;
  };
  export default html2pdf;
}
