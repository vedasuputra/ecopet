import jpeg from 'jpeg-js'

// Perceptual "difference hash" (dHash): a 64-bit fingerprint of what a picture LOOKS like.
// Unlike the exact SHA-256 fingerprint, it survives re-compression, resizing and small crops or
// brightness changes, so a photo of the same picture (or an old photo re-taken) is still recognised.
// Pure JavaScript (jpeg-js) so it runs on the free Vercel runtime without native modules.

const COLS = 9 // 9 columns x 8 rows of brightness -> 8x8 = 64 left/right comparisons
const ROWS = 8

/** 16 hex characters, or null when the image cannot be decoded. */
export function dhash(base64: string): string | null {
  try {
    const raw = base64.replace(/^data:image\/\w+;base64,/, '')
    const img = jpeg.decode(Buffer.from(raw, 'base64'), { useTArray: true, maxMemoryUsageInMB: 96 })
    const { width: w, height: h, data } = img
    if (!w || !h) return null

    // average brightness of each cell of a COLS x ROWS grid
    const cell = new Float64Array(COLS * ROWS)
    for (let cy = 0; cy < ROWS; cy++) {
      const y0 = Math.floor((cy * h) / ROWS)
      const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * h) / ROWS))
      for (let cx = 0; cx < COLS; cx++) {
        const x0 = Math.floor((cx * w) / COLS)
        const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * w) / COLS))
        let sum = 0
        let n = 0
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * w + x) * 4
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            n++
          }
        }
        cell[cy * COLS + cx] = n ? sum / n : 0
      }
    }

    let bits = ''
    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS - 1; cx++) bits += cell[cy * COLS + cx] > cell[cy * COLS + cx + 1] ? '1' : '0'
    }
    let hex = ''
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
    return hex
  } catch {
    return null
  }
}

/** Number of differing bits between two 16-char hashes (0 = identical, 64 = opposite). */
export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64
  let d = 0
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) {
      d += x & 1
      x >>= 1
    }
  }
  return d
}

/**
 * Photos at most this many bits apart count as "the same picture". Measured on test images:
 * resized / re-compressed / brighter / higher-contrast / blurred copies differ by 0-2 bits, a 1.5 degree
 * tilt by up to 7, a 3% crop by 4-13; unrelated pictures differ by at least 22 (median 32).
 * A match is only sent to a human to look at, never auto-rejected.
 */
export const SIMILAR_MAX_DISTANCE = 10
