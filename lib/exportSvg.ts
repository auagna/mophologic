export function getCanvasSvgMarkup() {
  const svg = document.querySelector<SVGSVGElement>("[data-form-lab-canvas]");
  if (!svg) return "";
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("version", "1.1");
  return new XMLSerializer().serializeToString(clone);
}

export function downloadText(filename: string, text: string, type = "image/svg+xml;charset=utf-8") {
  const blob = new Blob([text], { type });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCurrentSvg(filename: string) {
  const svg = getCanvasSvgMarkup();
  if (!svg) return;
  downloadText(filename, svg);
}

export async function copyCurrentSvg() {
  const svg = getCanvasSvgMarkup();
  if (!svg) return;
  await navigator.clipboard.writeText(svg);
}

export async function exportCurrentPng(filename: string) {
  const svg = getCanvasSvgMarkup();
  if (!svg) return;
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to render SVG for PNG export"));
    image.src = encoded;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 2000;
  canvas.height = 1360;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#f2efe5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(filename, blob);
  }, "image/png");
}
