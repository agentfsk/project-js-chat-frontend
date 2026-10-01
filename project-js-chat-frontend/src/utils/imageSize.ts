export type ImageSize = {
  width: number
  height: number
}

const PROBE_TIMEOUT_MS = 4000

// Measures an already-uploaded image so the message can reserve its final space
// before the image data is fetched for display. Bounded and never rejecting: a
// send must not be blocked by a cosmetic measurement.
export function probeImageSize(url: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<ImageSize | null> {
  return new Promise((resolve) => {
    const image = new Image()
    let settled = false

    const finish = (result: ImageSize | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      image.onload = null
      image.onerror = null
      image.src = ''
      resolve(result)
    }

    const timer = window.setTimeout(() => finish(null), timeoutMs)

    image.onload = () => {
      const { naturalWidth, naturalHeight } = image
      finish(naturalWidth > 0 && naturalHeight > 0 ? { width: naturalWidth, height: naturalHeight } : null)
    }
    image.onerror = () => finish(null)
    image.src = url
  })
}

// Measures a picked file before it is uploaded, so the dimensions travel with
// the message and the sender's own view never reflows on decode.
export function probeFileSize(file: File, timeoutMs = PROBE_TIMEOUT_MS): Promise<ImageSize | null> {
  const url = URL.createObjectURL(file)
  return probeImageSize(url, timeoutMs).finally(() => URL.revokeObjectURL(url))
}
