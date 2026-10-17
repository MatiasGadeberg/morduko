import { recognizeRgba, type ScanResult } from "./recognize";

const OPEN_FAIL = "That photo couldn't be opened. Try a different one.";

export async function recognizeFile(file: File): Promise<ScanResult> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return { ok: false, message: OPEN_FAIL };
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      return recognizeRgba(ctx.getImageData(0, 0, w, h).data, w, h);
    } finally {
      bitmap.close();
    }
  } catch {
    return { ok: false, message: OPEN_FAIL };
  }
}
