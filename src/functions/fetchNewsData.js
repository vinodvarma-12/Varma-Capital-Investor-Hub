import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction'

export async function fetchNewsData(category = 'general') {
  const out = await invokeEdgeFunction('fetch-news-data', { category })
  return { data: out }
}
