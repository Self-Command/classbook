/**
 * 上传前图片压缩：仅在超过阈值或边长上限时处理，输出 WebP（不支持时用 JPEG）。
 */
export interface ImageCompressionConfig {
  enabled: boolean;
  thresholdKb: number;
  maxDimension: number;
  quality: number;
}

export const DEFAULT_IMAGE_COMPRESSION: ImageCompressionConfig = {
  enabled: true,
  thresholdKb: 1024,
  maxDimension: 1920,
  quality: 82,
};

let webpSupport: boolean | null = null;

function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

interface DecodedImage {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  close: () => void;
}

async function decode(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx) => ctx.drawImage(bitmap, 0, 0, ctx.canvas.width, ctx.canvas.height),
      close: () => bitmap.close(),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("图片解码失败"));
      element.src = url;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx) => ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height),
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function compressImage(
  file: File,
  config: Partial<ImageCompressionConfig> = {},
  maxBytes = 5 * 1024 * 1024,
): Promise<File> {
  const options = { ...DEFAULT_IMAGE_COMPRESSION, ...config };
  if (!options.enabled) return file;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  let source: DecodedImage;
  try {
    source = await decode(file);
  } catch {
    return file;
  }

  const overThreshold = file.size > options.thresholdKb * 1024;
  const overDimension = Math.max(source.width, source.height) > options.maxDimension;
  if (!overThreshold && !overDimension && file.size <= maxBytes) {
    source.close();
    return file;
  }

  const scale = Math.min(1, options.maxDimension / Math.max(source.width, source.height, 1));
  let width = Math.max(1, Math.round(source.width * scale));
  let height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    source.close();
    return file;
  }

  const type = supportsWebp() ? "image/webp" : "image/jpeg";
  let quality = Math.min(0.95, Math.max(0.4, options.quality / 100));
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    source.draw(ctx);
    blob = await encode(canvas, type, quality);
    if (blob && blob.size <= maxBytes) break;
    if (quality > 0.55) {
      quality = Math.max(0.5, quality - 0.1);
    } else {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  }
  source.close();

  if (!blob) return file;
  if (blob.size >= file.size && file.size <= maxBytes) return file;

  const extension = type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${extension}`, { type: blob.type || type });
}
