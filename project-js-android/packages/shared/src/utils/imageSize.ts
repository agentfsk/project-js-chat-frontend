export type ImageSize = {
  width: number
  height: number
}

export function probeImageSize(url: string, timeoutMs = 4000): Promise<ImageSize | null> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(null)
      }
    }, timeoutMs)

    try {
      const { Image } = require('react-native')
      Image.getSize(
        url,
        (width: number, height: number) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(width > 0 && height > 0 ? { width, height } : null)
          }
        },
        (error: any) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(null)
          }
        }
      )
    } catch {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(null)
      }
    }
  })
}

export function probeFileSize(uri: string, timeoutMs = 4000): Promise<ImageSize | null> {
  return probeImageSize(uri, timeoutMs)
}