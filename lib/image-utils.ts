/**
 * Image processing utilities for client-side uploads and clipboard paste.
 * Compresses images to lightweight JPEG Data URLs (~30-50KB) for seamless storage & fast display.
 */
export function fileOrBlobToCompressedDataUrl(
  fileOrBlob: File | Blob,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result as string;
      if (!result) {
        return resolve("");
      }

      const image = new Image();
      image.onload = () => {
        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(result);
        }
      };
      image.onerror = () => resolve(result); // Fallback to raw data url if canvas fails
      image.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Handle clipboard paste events to extract either pasted image binary (screenshot / copied image)
 * or pasted text image URL.
 */
export async function handleClipboardImagePaste(
  event: React.ClipboardEvent | ClipboardEvent
): Promise<string | null> {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return null;

  // 1. Check for image files in clipboard (e.g. Snipping tool, PrintScreen, Copy Image)
  const items = clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        event.preventDefault();
        return await fileOrBlobToCompressedDataUrl(file);
      }
    }
  }

  // 2. Check for image URL text in clipboard
  const text = clipboardData.getData("text").trim();
  if (
    text.startsWith("http") &&
    (/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(text) ||
      text.includes("images.unsplash.com") ||
      text.includes("cdn") ||
      text.includes("img") ||
      text.includes("image"))
  ) {
    return text;
  }

  return null;
}
