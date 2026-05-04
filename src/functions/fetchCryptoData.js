import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction'

export async function fetchCryptoData() {
  const out = await invokeEdgeFunction('fetch-crypto-data', {})
  return { data: out }
}
