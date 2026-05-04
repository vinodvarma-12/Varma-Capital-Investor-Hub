import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction'

export async function fetchStockData() {
  const out = await invokeEdgeFunction('fetch-stock-data', {})
  return { data: out }
}
