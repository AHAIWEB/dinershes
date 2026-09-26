/** Browser-only export of a 13 × 20.5 inch sheet to 300 DPI PNG and PDF. */
const W_IN = 13;
const H_IN = 20.5;
const DPI = 300;

async function renderSheet(node: HTMLElement) {
  const { toPng } = await import("html-to-image");
  const rect = node.getBoundingClientRect();
  const targetW = W_IN * DPI;
  return toPng(node, {
    pixelRatio: targetW / rect.width,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });
}

function save(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export async function downloadPng(node: HTMLElement, name: string) {
  save(await renderSheet(node), `${name}.png`);
}

export async function downloadPdf(nodes: HTMLElement[], name: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "in", format: [W_IN, H_IN], orientation: "portrait" });
  for (let i = 0; i < nodes.length; i += 1) {
    if (i > 0) pdf.addPage([W_IN, H_IN], "portrait");
    const png = await renderSheet(nodes[i]!);
    pdf.addImage(png, "PNG", 0, 0, W_IN, H_IN, undefined, "FAST");
  }
  pdf.save(`${name}.pdf`);
}
