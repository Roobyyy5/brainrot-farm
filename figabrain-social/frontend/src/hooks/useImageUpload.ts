import { useState } from "react";

const MAX_SIZE = 1200;
const QUALITY = 0.82;

export async function resizeAndEncode(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", QUALITY));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      setError("Тільки зображення (JPG, PNG, GIF, WebP)");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл занадто великий (макс. 10 МБ)");
      return null;
    }
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await resizeAndEncode(file);
      return dataUrl;
    } catch {
      setError("Не вдалось обробити зображення");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, setError };
}
