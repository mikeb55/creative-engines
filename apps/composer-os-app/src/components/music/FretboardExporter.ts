import type { RefObject } from 'react';

export type ExportFretboardPngOptions = {
  width?: number;
  height?: number;
  filename?: string;
};

/**
 * Rasterizes the first SVG inside `containerRef` to PNG and triggers a browser download.
 * No-op if the container is missing or contains no SVG.
 */
export async function exportFretboardToPng(
  containerRef: RefObject<HTMLDivElement>,
  options?: ExportFretboardPngOptions
): Promise<void> {
  const root = containerRef.current;
  if (!root) return;

  const svg = root.querySelector('svg');
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;

  const vb = svg.viewBox?.baseVal;
  const vbW = vb?.width && vb.width > 0 ? vb.width : svg.clientWidth || 960;
  const vbH = vb?.height && vb.height > 0 ? vb.height : svg.clientHeight || 320;

  const w = options?.width ?? Math.round(svg.clientWidth || vbW);
  const h = options?.height ?? Math.round(svg.clientHeight || vbH);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  }

  const svgText = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unsupported'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = options?.filename ?? 'fretboard.png';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve();
      };
      img.onerror = () => reject(new Error('SVG rasterisation failed'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
