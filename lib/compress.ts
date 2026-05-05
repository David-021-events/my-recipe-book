/**
 * Compresses an image file client-side using the Canvas API.
 * Resizes to max 1600px wide and exports as JPEG at 0.8 quality (~400KB target).
 * No libraries — uses Canvas API only.
 * @param file - The image File object to compress.
 * @returns A base64-encoded JPEG string (without the data URI prefix).
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const MAX_WIDTH = 1600
      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      // Strip the data URI prefix to get raw base64
      resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ''))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
