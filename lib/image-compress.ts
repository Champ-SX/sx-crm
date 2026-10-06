// Client-side image shrink before upload. Phone photos are routinely 3–8 MB
// (over our 5 MB cap) and far larger than anyone needs to view in the CRM.
// Downscale to a sane long edge and re-encode as JPEG; leave small images,
// GIFs (may be animated) and non-images untouched.

const MAX_EDGE = 2048          // px, long edge after resize
const QUALITY = 0.85
const SKIP_UNDER_BYTES = 1.5 * 1024 * 1024  // already small enough → keep original

export function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

export function isImageLike(file: File): boolean {
  return file.type.startsWith('image/') || isHeic(file)
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file) } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('decode failed'))
      img.src = url
    })
  } finally {
    // revoked after draw by caller via GC; safe to revoke once loaded
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

/**
 * Returns a File ready to upload. Throws a friendly Error when the browser
 * can't read the image (e.g. HEIC on Chrome/Windows).
 */
export async function prepareImage(file: File): Promise<File> {
  if (!isImageLike(file)) return file
  if (file.type === 'image/gif') return file

  const heic = isHeic(file)
  if (!heic && file.size <= SKIP_UNDER_BYTES) return file

  let bitmap: ImageBitmap | HTMLImageElement
  try {
    bitmap = await decode(file)
  } catch {
    throw new Error(heic
      ? `“${file.name}” is HEIC, which this browser can't read. Export it as JPEG (iPhone: Settings › Camera › Formats › Most Compatible) and try again.`
      : `Couldn't read image “${file.name}”.`)
  }

  const w = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width
  const h = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, tw, th)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', QUALITY))
  if (!blob) return file
  // Only swap if we actually saved space (or had to convert HEIC).
  if (!heic && blob.size >= file.size) return file
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}
