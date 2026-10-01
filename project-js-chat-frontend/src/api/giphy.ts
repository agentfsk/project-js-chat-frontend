export type GiphyImage = {
  url: string
  width: string
  height: string
  size?: string
}

export type GiphyGif = {
  id: string
  title: string
  images: {
    preview_gif: GiphyImage
    downsized: GiphyImage
  }
}

const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs'
const GIPHY_API_KEY = 'TCdYKbNMvYia5T1p2dvo5e4vaUe2T41Z'
const GIPHY_LIMIT = 25
const GIPHY_RATING = 'g'

async function giphyRequest(path: string, query = ''): Promise<GiphyGif[]> {
  const params = [query, `api_key=${GIPHY_API_KEY}`, `limit=${GIPHY_LIMIT}`, `rating=${GIPHY_RATING}`]
    .filter(Boolean)
    .join('&')
  const url = `${GIPHY_API_URL}/${path}?${params}`

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('Не удалось подключиться к GIPHY')
  }

  if (!response.ok) {
    throw new Error(`Ошибка GIPHY (${response.status})`)
  }

  const data = (await response.json()) as { data?: GiphyGif[] }
  return data.data ?? []
}

export function searchGifs(query: string): Promise<GiphyGif[]> {
  const encoded = encodeURIComponent(query.trim())
  if (!encoded) return Promise.resolve([])
  return giphyRequest('search', `q=${encoded}`)
}

export function trendingGifs(): Promise<GiphyGif[]> {
  return giphyRequest('trending')
}